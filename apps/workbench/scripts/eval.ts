import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runEvals } from "../server/eval/runner.js";
import { PHASE_A_EVAL_CASES } from "../server/eval/fixtures.js";

const here = dirname(fileURLToPath(import.meta.url));
const reportPath = resolve(join(here, "..", "eval-report.json"));

async function main(): Promise<void> {
  const report = await runEvals(PHASE_A_EVAL_CASES);

  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  const lines: string[] = [];
  for (const c of report.cases) {
    const tag = c.passed ? "PASS" : "FAIL";
    lines.push(
      `[${tag}] ${c.id} — ${c.description} (toolCalls=${c.metrics.toolCalls.total}, unsupportedClaims=${c.metrics.unsupportedClaims}, schemaInvalid=${c.metrics.schemaInvalid})`,
    );
    if (!c.passed) {
      for (const e of c.expectations) {
        if (e.ok) continue;
        lines.push(`  - ${e.description}: ${e.reason ?? "(no reason)"}`);
      }
    }
  }
  lines.push(
    `Totals: ${report.totals.passed}/${report.totals.cases} passed; ` +
      `${report.totals.failed} failed; ` +
      `${report.totals.unsupportedClaims} unsupported claims across ${report.totals.toolCalls} tool calls; ` +
      `${report.totals.schemaInvalidRuns} schema-invalid runs.`,
  );
  lines.push(`Report written to ${reportPath}`);
  // eslint-disable-next-line no-console
  console.log(lines.join("\n"));

  if (report.totals.failed > 0) process.exit(1);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
