import type { EvalCase } from "../types.js";
import { KNOWN_CONDITION } from "./known-condition.js";
import { NO_ALLERGY_DATA } from "./no-allergy-data.js";

/**
 * Phase A's golden eval cases. Two are shipped now — the issue
 * (#77) requires "at least two" — with named follow-ups (missing-
 * labs, prompt-injection-in-resource-text, unauthorized-patient)
 * tracked in `docs/evals.md`.
 */
export const PHASE_A_CASES: ReadonlyArray<EvalCase> = [
  KNOWN_CONDITION,
  NO_ALLERGY_DATA,
];

export { KNOWN_CONDITION, NO_ALLERGY_DATA };
