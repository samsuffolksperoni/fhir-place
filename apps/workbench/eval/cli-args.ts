/**
 * Argument parsing for `scripts/run-evals.ts`. Lives separately from
 * the script so it can be unit-tested without spawning a subprocess.
 *
 * The pnpm forwarding convention forwards a literal `--` separator to
 * the script (`pnpm eval -- --live` arrives as
 * `["--", "--live"]`), so the parser strips it. Tested in
 * `eval/cli-args.test.ts`.
 */

export interface ParsedArgs {
  live: boolean;
  jsonPath?: string;
}

export type CliResult =
  | { kind: "ok"; args: ParsedArgs }
  | { kind: "help" }
  | { kind: "error"; message: string };

export function parseArgs(argv: ReadonlyArray<string>): CliResult {
  const out: ParsedArgs = { live: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") continue;
    if (a === "--live") {
      out.live = true;
      continue;
    }
    if (a === "--json") {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("-")) {
        return {
          kind: "error",
          message:
            "--json requires a path argument (e.g. --json eval-results.json)",
        };
      }
      out.jsonPath = next;
      i++;
      continue;
    }
    if (a?.startsWith("--json=")) {
      const value = a.slice("--json=".length);
      if (!value) {
        return {
          kind: "error",
          message:
            "--json= requires a path argument (e.g. --json=eval-results.json)",
        };
      }
      out.jsonPath = value;
      continue;
    }
    if (a === "-h" || a === "--help") return { kind: "help" };
    return { kind: "error", message: `unknown argument: ${a}` };
  }
  return { kind: "ok", args: out };
}

export const HELP_TEXT =
  `Usage: pnpm --filter @fhir-place/workbench eval [--] [--live] [--json <path>]\n\n` +
  `  --live          run against the real Anthropic provider (requires ANTHROPIC_API_KEY)\n` +
  `  --json <path>   write the full result JSON to <path>\n`;
