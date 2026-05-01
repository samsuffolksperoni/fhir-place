/**
 * Eval-harness types. Shared between the harness, the cases, and the
 * scoring layer.
 *
 * An `EvalCase` is everything needed to run the agent end-to-end against
 * a synthetic patient compartment and check the resulting `AgentAnswer`
 * against a set of safety / grounding assertions.
 */

/**
 * Loose FHIR resource shape for eval fixtures. We don't pin to the
 * full `fhir/r4` `Resource` union because case authors should be free
 * to write minimal synthetic resources without satisfying every
 * profile-required field.
 */
export type FhirResource = {
  resourceType: string;
  id: string;
} & Record<string, unknown>;

export interface EvalCase {
  /** Stable id (kebab-case). Surfaces in the JSON output. */
  id: string;
  /** One-line description, e.g. "agent must cite the documented Type 2 diabetes Condition". */
  description: string;
  /** The user-facing prompt the agent receives. */
  prompt: string;
  /** Patient compartment for the run. The fake fetch resolves searches against this. */
  patient: { id: string };
  /**
   * Synthetic FHIR resources that make up the patient's compartment. Each
   * resource MUST carry a `resourceType` and `id`. Searches return only
   * resources whose `subject.reference` or `patient.reference` matches
   * `Patient/<patient.id>`. The Patient resource itself is matched by
   * `id`.
   */
  bundle: ReadonlyArray<FhirResource>;
  /**
   * Pre-canned model script for the deterministic path (`pnpm eval`).
   * Each step is one model response: a tool-use, a finalize, or end-turn.
   * The harness asserts the script ran to completion or the loop ended
   * before the script did.
   */
  scriptedTrace: ReadonlyArray<ScriptStep>;
  /**
   * Assertions evaluated against the returned `AgentAnswer`. ALL must
   * pass for the case to pass.
   */
  assertions: ReadonlyArray<Assertion>;
}

export type ScriptStep =
  | {
      kind: "tool";
      /** Tool name on the registry, plus the input the model would emit. */
      name: string;
      input: unknown;
    }
  | {
      kind: "finalize";
      /**
       * The body the agent would pass to `finalize`. Subject to schema
       * validation by the orchestrator (same as a real run).
       */
      body: FinalizeBody;
    }
  | {
      kind: "end_turn";
      /** Optional plain-text response. Triggers the orchestrator's end-turn fallback. */
      text?: string;
    };

export interface FinalizeBody {
  summary?: string;
  claims: Array<{
    id: string;
    text: string;
    evidence: Array<{ reference: string; display?: string }>;
  }>;
  missingData: Array<{ description: string }>;
  cannotDetermine: Array<{ question: string; why: string }>;
}

export type Assertion =
  | CitesAssertion
  | MissingDataMatchesAssertion
  | NoClaimMatchesAssertion
  | FallbackAssertion
  | SchemaValidAssertion
  | UnsupportedClaimCountAssertion
  | ToolCallCountAssertion
  | CannotDetermineMatchesAssertion
  | NoCannotDetermineMatchesAssertion;

export interface CitesAssertion {
  kind: "cites";
  /** Exact `<Type>/<id>` reference that MUST appear in some claim's evidence. */
  reference: string;
  /** Optional human-readable hint surfaced when the assertion fails. */
  description?: string;
}

export interface MissingDataMatchesAssertion {
  kind: "missingDataMatches";
  /** Pattern that MUST match some `missingData[].description`. */
  pattern: RegExp;
  description?: string;
}

export interface CannotDetermineMatchesAssertion {
  kind: "cannotDetermineMatches";
  /** Pattern that MUST match some `cannotDetermine[].why` or `.question`. */
  pattern: RegExp;
  description?: string;
}

export interface NoCannotDetermineMatchesAssertion {
  kind: "noCannotDetermineMatches";
  /**
   * Pattern that MUST NOT match any `cannotDetermine[].why` or
   * `.question`. Used to forbid uncertainty about facts that ARE
   * present in the patient compartment (e.g. a documented diabetes
   * Condition shouldn't co-exist with a "cannot determine if patient
   * has diabetes" entry) and to forbid hedging on absent data that
   * belongs in `missingData` instead.
   */
  pattern: RegExp;
  description?: string;
}

export interface NoClaimMatchesAssertion {
  kind: "noClaimMatches";
  /** Pattern that MUST NOT match any `claims[].text`. */
  pattern: RegExp;
  description?: string;
}

export interface FallbackAssertion {
  kind: "fallback";
  expected: boolean;
  description?: string;
}

export interface SchemaValidAssertion {
  kind: "schemaValid";
  description?: string;
}

export interface UnsupportedClaimCountAssertion {
  kind: "unsupportedClaimCount";
  expected: number;
  description?: string;
}

export interface ToolCallCountAssertion {
  kind: "toolCallCount";
  /** Either the exact count or a min/max bracket. */
  exact?: number;
  min?: number;
  max?: number;
  description?: string;
}

/**
 * Per-assertion result. The harness produces one of these per assertion;
 * the case passes iff every result has `passed: true`.
 */
export interface AssertionResult {
  kind: Assertion["kind"];
  passed: boolean;
  /** One-line message — "Cites Condition/cond-dm2: ✓" / "✗ no claim contains 'no known allergies'". */
  message: string;
}

/**
 * Per-case result. `metrics` is intentionally a flat object so the JSON
 * output is easy to grep with jq.
 */
export interface CaseResult {
  id: string;
  description: string;
  passed: boolean;
  durationMs: number;
  metrics: CaseMetrics;
  assertions: AssertionResult[];
  /** Populated if the orchestrator threw (provider error, etc.). */
  error?: string;
}

export interface CaseMetrics {
  turns: number;
  fallback: boolean;
  toolCallCount: number;
  schemaValid: boolean;
  unsupportedClaimCount: number;
  /** Counts of claims by cited resource type. */
  evidenceCountsByType: Record<string, number>;
}

/**
 * Top-level eval-suite output. `pnpm eval` writes this to stdout and (if
 * configured) to `eval-results.json`.
 */
export interface EvalRunResult {
  schemaVersion: "1";
  startedAt: string;
  durationMs: number;
  mode: "scripted" | "live";
  model: string;
  provider: string;
  passed: number;
  failed: number;
  cases: CaseResult[];
}
