/**
 * `pnpm --filter @fhir-place/workbench eval`
 *
 * Run the Phase A eval suite against the patient-summary agent loop.
 *
 * Default mode is **scripted**: each case ships a canned tool-call
 * trace plus finalize body. The harness runs the orchestrator end to
 * end, validates the answer against the AgentAnswer schema, and
 * scores it against the case's assertions. No API key required, fully
 * deterministic.
 *
 * Pass `--live` to run against the real Anthropic provider. Requires
 * `ANTHROPIC_API_KEY`. The same FHIR fixtures and the same assertions
 * apply; the model script is replaced with whatever the live model
 * decides to do.
 *
 * Pass `--json <path>` to write the full result as JSON.
 */

import { runPhaseAEvals } from "../eval/run.js";
import {
  modelConfigFromEnv,
  type AnthropicMessagesCreate,
} from "../server/agent/model-config.js";

interface ParsedArgs {
  live: boolean;
  jsonPath?: string;
}

function parseArgs(argv: ReadonlyArray<string>): ParsedArgs {
  const out: ParsedArgs = { live: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--live") out.live = true;
    else if (a === "--json") out.jsonPath = argv[++i];
    else if (a?.startsWith("--json=")) out.jsonPath = a.slice("--json=".length);
    else if (a === "-h" || a === "--help") {
      printHelp();
      process.exit(0);
    } else {
      process.stderr.write(`unknown argument: ${a}\n`);
      printHelp();
      process.exit(2);
    }
  }
  return out;
}

function printHelp() {
  process.stdout.write(
    `Usage: pnpm --filter @fhir-place/workbench eval [--live] [--json <path>]\n\n` +
      `  --live          run against the real Anthropic provider (requires ANTHROPIC_API_KEY)\n` +
      `  --json <path>   write the full result JSON to <path>\n`,
  );
}

const args = parseArgs(process.argv.slice(2));

let liveClient:
  | { messagesCreate: AnthropicMessagesCreate; provider: string; model: string }
  | undefined;
if (args.live) {
  const cfg = modelConfigFromEnv();
  if (!cfg) {
    process.stderr.write(
      "ANTHROPIC_API_KEY is not set; --live cannot run.\n",
    );
    process.exit(2);
  }
  liveClient = {
    messagesCreate: cfg.messagesCreate,
    provider: cfg.provider,
    model: cfg.model,
  };
}

const { exitCode } = await runPhaseAEvals({
  mode: args.live ? "live" : "scripted",
  ...(liveClient ? { liveClient } : {}),
  ...(args.jsonPath ? { outputJsonPath: args.jsonPath } : {}),
});

process.exit(exitCode);
