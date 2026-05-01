import type Anthropic from "@anthropic-ai/sdk";
import type { AgentSession, DataConnection } from "../../db/schema.js";
import type { AgentAnswer } from "../../src/agent/answer-schema.js";
import type { ToolEnvelope } from "../agent/envelope.js";
import { runPatientSummary } from "../agent/orchestrator.js";
import { createPhaseATools } from "../agent/tools/index.js";
import { inMemoryLogger } from "../agent/tool-log.js";
import {
  countUnsupportedClaims,
  summariseToolCalls,
  type ToolCallSummary,
} from "./metrics.js";

/**
 * The shape of an eval case. Cases are pure data: a scripted
 * Anthropic conversation plus a fake FHIR responder plus a list of
 * expectation predicates the runner evaluates against the result.
 */
export interface EvalCase {
  id: string;
  description: string;
  prompt: string;
  session: AgentSession;
  connection: DataConnection;
  scriptedMessages: ReadonlyArray<Anthropic.Message>;
  /**
   * Map a FHIR URL substring to a JSON body. The runner wraps this in
   * a `fetch` shim so the same proxy code path used in production
   * runs in the eval.
   */
  fhirResponder: (url: string) => unknown;
  expectations: ReadonlyArray<EvalExpectation>;
  /**
   * Optional. Called for each `messagesCreate` invocation with the
   * outgoing request body and the zero-based turn index.
   *
   * This is the seam for *wire-level* assertions that the static
   * `expectations` list cannot make — e.g. "the system prompt does
   * not contain this resource string", "the tool_result feeding
   * back the malicious Patient is wrapped in `<resource_data>`".
   * Without it, scripted cases can produce a false pass on safety
   * properties that depend on what the orchestrator actually sent
   * to the model, not just what it returned.
   *
   * Outcomes are appended to the case's expectation list; any
   * `{ ok: false }` flips the case to failed.
   */
  inspectRequest?: (
    body: Anthropic.MessageCreateParamsNonStreaming,
    turnIndex: number,
  ) => ReadonlyArray<InspectorOutcome>;
  /** Optional override for `maxTurns`; default mirrors orchestrator (8). */
  maxTurns?: number;
}

export interface InspectorOutcome {
  description: string;
  outcome: ExpectationOutcome;
}

export interface EvalContext {
  answer: AgentAnswer;
  fallback: boolean;
  finalIssues: unknown | undefined;
  turns: number;
  toolEnvelopes: ReadonlyArray<ToolEnvelope>;
  metrics: {
    toolCalls: ToolCallSummary;
    unsupportedClaims: number;
    schemaInvalid: boolean;
  };
}

export type ExpectationOutcome =
  | { ok: true }
  | { ok: false; reason: string };

export interface EvalExpectation {
  description: string;
  check: (ctx: EvalContext) => ExpectationOutcome;
}

export interface EvalCaseResult {
  id: string;
  description: string;
  passed: boolean;
  fallback: boolean;
  turns: number;
  metrics: {
    toolCalls: ToolCallSummary;
    unsupportedClaims: number;
    schemaInvalid: boolean;
  };
  expectations: ReadonlyArray<{
    description: string;
    ok: boolean;
    reason?: string;
  }>;
  /**
   * The validated AgentAnswer body. Surfaced in the JSON report so
   * PR 9 (failure gallery) can render it without re-running.
   */
  answer: AgentAnswer;
}

export interface EvalReport {
  schemaVersion: "1";
  generatedAt: string;
  totals: {
    cases: number;
    passed: number;
    failed: number;
    toolCalls: number;
    unsupportedClaims: number;
    schemaInvalidRuns: number;
  };
  cases: ReadonlyArray<EvalCaseResult>;
}

export interface RunEvalsOptions {
  /** Injected for deterministic timestamps in the report header. */
  now?: () => string;
  /** Injected for deterministic createdAt on the agent answer. */
  agentNow?: () => string;
}

export async function runEvals(
  cases: ReadonlyArray<EvalCase>,
  options: RunEvalsOptions = {},
): Promise<EvalReport> {
  const now = options.now ?? (() => new Date().toISOString());
  const agentNow =
    options.agentNow ?? (() => "2026-04-30T13:00:00.000Z");

  const caseResults: EvalCaseResult[] = [];
  for (const c of cases) {
    caseResults.push(await runOne(c, agentNow));
  }

  const totals = caseResults.reduce(
    (acc, r) => {
      acc.cases += 1;
      acc.passed += r.passed ? 1 : 0;
      acc.failed += r.passed ? 0 : 1;
      acc.toolCalls += r.metrics.toolCalls.total;
      acc.unsupportedClaims += r.metrics.unsupportedClaims;
      acc.schemaInvalidRuns += r.metrics.schemaInvalid ? 1 : 0;
      return acc;
    },
    {
      cases: 0,
      passed: 0,
      failed: 0,
      toolCalls: 0,
      unsupportedClaims: 0,
      schemaInvalidRuns: 0,
    },
  );

  return {
    schemaVersion: "1",
    generatedAt: now(),
    totals,
    cases: caseResults,
  };
}

async function runOne(
  c: EvalCase,
  agentNow: () => string,
): Promise<EvalCaseResult> {
  const inspectorOutcomes: InspectorOutcome[] = [];
  const onRequest = c.inspectRequest
    ? (body: Anthropic.MessageCreateParamsNonStreaming, turnIndex: number) => {
        for (const r of c.inspectRequest!(body, turnIndex)) {
          inspectorOutcomes.push(r);
        }
      }
    : undefined;
  const client = scripted(c.scriptedMessages, onRequest);
  const fetchFn = fakeFetch(c.fhirResponder);
  const result = await runPatientSummary(
    {
      registry: createPhaseATools(),
      messagesCreate: client.messagesCreate,
      model: "claude-sonnet-4-6",
      provider: "anthropic",
      fetchFn,
      logger: inMemoryLogger(),
      ...(c.maxTurns !== undefined ? { maxTurns: c.maxTurns } : {}),
      now: agentNow,
    },
    {
      prompt: c.prompt,
      session: c.session,
      connection: c.connection,
    },
  );

  const toolCalls = summariseToolCalls(result.toolEnvelopes);
  const unsupportedClaims = countUnsupportedClaims(
    result.answer,
    result.toolEnvelopes,
  );
  const schemaInvalid =
    result.fallback === true && result.finalIssues !== undefined;

  const ctx: EvalContext = {
    answer: result.answer,
    fallback: result.fallback,
    finalIssues: result.finalIssues,
    turns: result.turns,
    toolEnvelopes: result.toolEnvelopes,
    metrics: { toolCalls, unsupportedClaims, schemaInvalid },
  };

  const expectations = [
    ...c.expectations.map((e) => {
      const outcome = e.check(ctx);
      return outcome.ok
        ? { description: e.description, ok: true as const }
        : {
            description: e.description,
            ok: false as const,
            reason: outcome.reason,
          };
    }),
    ...inspectorOutcomes.map((io) =>
      io.outcome.ok
        ? { description: io.description, ok: true as const }
        : {
            description: io.description,
            ok: false as const,
            reason: io.outcome.reason,
          },
    ),
  ];

  const passed = expectations.every((e) => e.ok);

  return {
    id: c.id,
    description: c.description,
    passed,
    fallback: result.fallback,
    turns: result.turns,
    metrics: { toolCalls, unsupportedClaims, schemaInvalid },
    expectations,
    answer: result.answer,
  };
}

interface ScriptedClient {
  messagesCreate: (
    body: Anthropic.MessageCreateParamsNonStreaming,
  ) => Promise<Anthropic.Message>;
}

function scripted(
  messages: ReadonlyArray<Anthropic.Message>,
  onRequest?: (
    body: Anthropic.MessageCreateParamsNonStreaming,
    turnIndex: number,
  ) => void,
): ScriptedClient {
  const queue = [...messages];
  let turnIndex = 0;
  return {
    async messagesCreate(body) {
      onRequest?.(body, turnIndex);
      turnIndex += 1;
      const next = queue.shift();
      if (!next) {
        throw new Error(
          "eval scripted client ran out of responses; check the case's `scriptedMessages` covers every turn",
        );
      }
      return next;
    },
  };
}

function fakeFetch(responder: (url: string) => unknown): typeof fetch {
  return async (input) => {
    const body = responder(String(input));
    return new Response(JSON.stringify(body ?? null), {
      status: body === undefined ? 404 : 200,
      headers: { "Content-Type": "application/fhir+json" },
    });
  };
}

/**
 * Helpers exposed for fixtures so they can build SDK-compatible Message
 * literals without importing the SDK directly. The `Anthropic.Message`
 * shape has more surface area than the orchestrator reads; the cast
 * matches the existing pattern in `orchestrator.test.ts`.
 */
export function toolUseMessage(
  toolName: string,
  input: unknown,
  id = `toolu_${Math.random().toString(36).slice(2, 10)}`,
): Anthropic.Message {
  return {
    id: `msg_${Math.random().toString(36).slice(2, 10)}`,
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-6",
    stop_reason: "tool_use",
    stop_sequence: null,
    content: [
      {
        type: "tool_use",
        id,
        name: toolName,
        input: input as Record<string, unknown>,
      },
    ],
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  } as unknown as Anthropic.Message;
}

export function bundle(...resources: unknown[]): unknown {
  return {
    resourceType: "Bundle",
    type: "searchset",
    entry: resources.map((resource) => ({ resource })),
  };
}
