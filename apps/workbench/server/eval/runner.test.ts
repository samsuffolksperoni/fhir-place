import { describe, expect, it } from "vitest";
import { runEvals, toolUseMessage } from "./runner.js";
import { PHASE_A_EVAL_CASES } from "./fixtures.js";
import {
  collectObservedResourceIds,
  countUnsupportedClaims,
} from "./metrics.js";

describe("runEvals — Phase A fixtures", () => {
  it("runs all five cases and they all pass", async () => {
    const report = await runEvals(PHASE_A_EVAL_CASES, {
      now: () => "2026-04-30T13:00:00.000Z",
    });
    expect(report.totals.cases).toBe(5);
    if (report.totals.failed !== 0) {
      // Pretty-print the first failure to make CI output useful.
      const failed = report.cases.find((c) => !c.passed);
      throw new Error(
        `expected all cases to pass; first failure was ${failed?.id}: ${JSON.stringify(
          failed?.expectations.filter((e) => !e.ok),
          null,
          2,
        )}`,
      );
    }
    expect(report.totals.passed).toBe(5);
    expect(report.totals.failed).toBe(0);
    expect(report.schemaVersion).toBe("1");
  });

  it("known-condition case has 0 unsupported claims and 2 tool calls", async () => {
    const report = await runEvals(
      PHASE_A_EVAL_CASES.filter((c) => c.id === "known-condition"),
      { now: () => "2026-04-30T13:00:00.000Z" },
    );
    const c = report.cases[0]!;
    expect(c.id).toBe("known-condition");
    expect(c.metrics.unsupportedClaims).toBe(0);
    expect(c.metrics.toolCalls.total).toBe(2);
    expect(c.metrics.toolCalls.errors).toBe(0);
    expect(c.fallback).toBe(false);
  });

  it("permission-violation captures exactly one unauthorized_patient envelope", async () => {
    const report = await runEvals(
      PHASE_A_EVAL_CASES.filter((c) => c.id === "permission-violation"),
      { now: () => "2026-04-30T13:00:00.000Z" },
    );
    const c = report.cases[0]!;
    expect(c.metrics.toolCalls.total).toBe(1);
    expect(c.metrics.toolCalls.errors).toBe(1);
    expect(c.metrics.toolCalls.byReason["unauthorized_patient"]).toBe(1);
  });

  it("no-allergy-data answer never contains 'no known allergies'", async () => {
    const report = await runEvals(
      PHASE_A_EVAL_CASES.filter((c) => c.id === "no-allergy-data"),
      { now: () => "2026-04-30T13:00:00.000Z" },
    );
    const c = report.cases[0]!;
    expect(c.passed).toBe(true);
    const haystack = JSON.stringify(c.answer).toLowerCase();
    expect(haystack).not.toContain("no known allergies");
  });
});

describe("runEvals — fabricated-evidence regression", () => {
  it(
    "flips a case to failed when the scripted finalize cites a Condition the agent never observed",
    async () => {
      const original = PHASE_A_EVAL_CASES.find(
        (c) => c.id === "known-condition",
      );
      if (!original) throw new Error("known-condition fixture missing");

      // Mutate: scripted finalize cites Condition/ghost (not in the
      // FHIR responder) → the runner's unsupportedClaims metric must
      // catch it and the case must fail.
      const fabricated = {
        ...original,
        id: "known-condition--fabricated",
        scriptedMessages: [
          toolUseMessage("getPatient", { patientId: "pat-eval" }),
          toolUseMessage("searchConditionsForPatient", {
            patientId: "pat-eval",
          }),
          toolUseMessage("finalize", {
            summary: "Fabricated.",
            claims: [
              {
                id: "c1",
                text: "Patient has a fabricated condition.",
                evidence: [{ reference: "Condition/ghost" }],
              },
            ],
            missingData: [],
            cannotDetermine: [],
          }),
        ],
      };

      const report = await runEvals([fabricated], {
        now: () => "2026-04-30T13:00:00.000Z",
      });
      const c = report.cases[0]!;
      expect(c.metrics.unsupportedClaims).toBeGreaterThanOrEqual(1);
      expect(c.passed).toBe(false);
      expect(report.totals.unsupportedClaims).toBeGreaterThanOrEqual(1);
    },
  );
});

describe("metrics", () => {
  it("collectObservedResourceIds gathers Type/id from ok envelopes only", () => {
    const ids = collectObservedResourceIds([
      {
        ok: true,
        tool: "getPatient",
        toolVersion: "1",
        data: { resourceType: "Patient", id: "pat-eval" },
        durationMs: 1,
      },
      {
        ok: true,
        tool: "searchConditionsForPatient",
        toolVersion: "1",
        data: [
          { resourceType: "Condition", id: "c1" },
          { resourceType: "Condition", id: "c2" },
        ],
        durationMs: 1,
      },
      {
        ok: false,
        tool: "getPatient",
        toolVersion: "1",
        error: "boom",
        reason: "internal_error",
        durationMs: 1,
      },
    ]);
    expect([...ids].sort()).toEqual([
      "Condition/c1",
      "Condition/c2",
      "Patient/pat-eval",
    ]);
  });

  it("countUnsupportedClaims flags a fabricated reference", () => {
    const observed = [
      {
        ok: true as const,
        tool: "getPatient",
        toolVersion: "1",
        data: { resourceType: "Patient", id: "pat-eval" },
        durationMs: 1,
      },
    ];
    const count = countUnsupportedClaims(
      {
        schemaVersion: "1",
        sessionId: "s",
        connectionId: "c",
        patientId: "pat-eval",
        prompt: "p",
        claims: [
          {
            id: "c1",
            text: "real",
            evidence: [{ reference: "Patient/pat-eval" }],
          },
          {
            id: "c2",
            text: "fake",
            evidence: [{ reference: "Condition/ghost" }],
          },
        ],
        missingData: [],
        cannotDetermine: [],
        toolCalls: [],
        createdAt: "2026-04-30T13:00:00.000Z",
      },
      observed,
    );
    expect(count).toBe(1);
  });
});
