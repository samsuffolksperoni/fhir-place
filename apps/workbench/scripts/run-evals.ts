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
 *
 * Argument parsing lives in `eval/cli-args.ts` so it can be unit-
 * tested without spawning a subprocess.
 */

import { runPhaseAEvals } from "../eval/run.js";
import { HELP_TEXT, parseArgs } from "../eval/cli-args.js";
import {
  modelConfigFromEnv,
  type AnthropicMessagesCreate,
} from "../server/agent/model-config.js";

const result = parseArgs(process.argv.slice(2));
if (result.kind === "help") {
  process.stdout.write(HELP_TEXT);
  process.exit(0);
}
if (result.kind === "error") {
  process.stderr.write(`${result.message}\n`);
  process.stderr.write(HELP_TEXT);
  process.exit(2);
}

const args = result.args;

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
