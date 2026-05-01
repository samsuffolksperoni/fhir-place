import { describe, expect, it } from "vitest";
import { evaluateCase, runEvals, type EvalCase } from "./evals.js";

describe("eval runner", () => {
  it("runs baseline cases and passes both", () => {
    const run = runEvals();
    expect(run.summary.total).toBeGreaterThanOrEqual(2);
    expect(run.summary.failed).toBe(0);
    expect(run.summary.passed).toBe(run.summary.total);
    expect(run.summary.schemaFailures).toBe(0);
  });

  it("marks malformed answers as schema-invalid", () => {
    const badCase: EvalCase = {
      id: "bad",
      description: "invalid payload",
      input: { schemaVersion: "1" },
      expect: {},
    };
    const result = evaluateCase(badCase);
    expect(result.pass).toBe(false);
    expect(result.schemaValid).toBe(false);
    expect(result.errors[0]).toContain("schema validation");
  });

  it("counts unsupported claims even when schema validation fails", () => {
    const badCase: EvalCase = {
      id: "bad-unsupported",
      description: "malformed payload with unsupported claims",
      input: {
        schemaVersion: "1",
        claims: [
          { id: "c1", text: "claim with empty evidence", evidence: [] },
          { id: "c2", text: "claim missing evidence field" },
          {
            id: "c3",
            text: "supported claim",
            evidence: [{ reference: "Condition/x" }],
          },
        ],
      },
      expect: {},
    };
    const result = evaluateCase(badCase);
    expect(result.schemaValid).toBe(false);
    expect(result.unsupportedClaims).toBe(2);
  });

  it("counts tool calls even when schema validation fails", () => {
    const badCase: EvalCase = {
      id: "bad-toolcalls",
      description: "malformed payload with toolCalls array",
      input: {
        schemaVersion: "1",
        toolCalls: [
          { tool: "a", toolVersion: "1", ok: true, durationMs: 1 },
          { tool: "b", toolVersion: "1", ok: true, durationMs: 1 },
        ],
      },
      expect: {},
    };
    const result = evaluateCase(badCase);
    expect(result.schemaValid).toBe(false);
    expect(result.toolCallCount).toBe(2);
  });
});
