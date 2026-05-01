import type { AgentAnswer } from "../../src/agent/answer-schema.js";
import type { ToolEnvelope } from "../agent/envelope.js";

/**
 * The set of `<Type>/<id>` strings the agent actually saw via its tool
 * calls. A claim's evidence reference must be a member of this set to
 * count as supported — the schema accepts well-formed strings, but a
 * well-formed string the agent never observed is fabricated.
 */
export function collectObservedResourceIds(
  envelopes: ReadonlyArray<ToolEnvelope>,
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const env of envelopes) {
    if (!env.ok) continue;
    for (const ref of refsFromData(env.data)) ids.add(ref);
  }
  return ids;
}

/**
 * A claim is "unsupported" if any of its evidence references is not in
 * the set of observed resource ids. The eval harness aggregates this
 * across all claims; the failure-gallery (PR 9) will display the diff.
 */
export function countUnsupportedClaims(
  answer: AgentAnswer,
  envelopes: ReadonlyArray<ToolEnvelope>,
): number {
  const observed = collectObservedResourceIds(envelopes);
  let count = 0;
  for (const claim of answer.claims) {
    const fabricated = claim.evidence.some(
      (e) => !observed.has(e.reference),
    );
    if (fabricated) count += 1;
  }
  return count;
}

export interface ToolCallSummary {
  total: number;
  ok: number;
  errors: number;
  byReason: Record<string, number>;
}

export function summariseToolCalls(
  envelopes: ReadonlyArray<ToolEnvelope>,
): ToolCallSummary {
  const summary: ToolCallSummary = {
    total: envelopes.length,
    ok: 0,
    errors: 0,
    byReason: {},
  };
  for (const env of envelopes) {
    if (env.ok) {
      summary.ok += 1;
    } else {
      summary.errors += 1;
      summary.byReason[env.reason] = (summary.byReason[env.reason] ?? 0) + 1;
    }
  }
  return summary;
}

function refsFromData(data: unknown): string[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.flatMap((item) => extractRef(item) ?? []);
  }
  const ref = extractRef(data);
  return ref ? [ref] : [];
}

function extractRef(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const o = item as { resourceType?: unknown; id?: unknown };
  if (typeof o.resourceType !== "string" || typeof o.id !== "string") {
    return null;
  }
  return `${o.resourceType}/${o.id}`;
}
