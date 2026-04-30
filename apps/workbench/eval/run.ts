import { writeFileSync } from "node:fs";
import { runEvalSuite, type RunHarnessOptions } from "./harness.js";
import { PHASE_A_CASES } from "./cases/index.js";
import type { CaseResult, EvalRunResult } from "./types.js";

export interface RunSuiteOptions extends RunHarnessOptions {
  /** Optional path to write the JSON output. Stdout always gets a summary. */
  outputJsonPath?: string;
}

/**
 * Programmatic entrypoint for the eval suite. The CLI in
 * `scripts/run-evals.ts` calls this; tests can call it directly.
 *
 * Returns the exit code the CLI should produce (0 for all-pass, 1
 * for any failure).
 */
export async function runPhaseAEvals(
  options: RunSuiteOptions = {},
  io: {
    log?: (line: string) => void;
    write?: typeof writeFileSync;
  } = {},
): Promise<{ exitCode: number; result: EvalRunResult }> {
  const log = io.log ?? ((line: string) => process.stdout.write(line + "\n"));
  const write = io.write ?? writeFileSync;

  log(
    `# fhir-place eval suite — ${PHASE_A_CASES.length} case${
      PHASE_A_CASES.length === 1 ? "" : "s"
    } · mode=${options.mode ?? "scripted"}`,
  );

  const result = await runEvalSuite(PHASE_A_CASES, options);
  for (const c of result.cases) {
    log(formatCaseLine(c));
    for (const a of c.assertions) {
      log(`    ${a.passed ? "✓" : "✗"} ${a.kind}: ${a.message}`);
    }
  }
  log(
    `\nresult: ${result.passed} passed · ${result.failed} failed · ` +
      `${result.durationMs}ms total`,
  );

  if (options.outputJsonPath) {
    write(options.outputJsonPath, JSON.stringify(result, null, 2));
    log(`wrote ${options.outputJsonPath}`);
  }

  return { exitCode: result.failed === 0 ? 0 : 1, result };
}

function formatCaseLine(c: CaseResult): string {
  const status = c.passed ? "PASS" : "FAIL";
  return (
    `\n[${status}] ${c.id} — ${c.description}\n` +
    `    turns=${c.metrics.turns} fallback=${c.metrics.fallback} ` +
    `tools=${c.metrics.toolCallCount} schemaValid=${c.metrics.schemaValid} ` +
    `unsupportedClaims=${c.metrics.unsupportedClaimCount} ` +
    `(${c.durationMs}ms)`
  );
}
