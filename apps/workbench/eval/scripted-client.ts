import type Anthropic from "@anthropic-ai/sdk";
import type { ScriptStep } from "./types.js";

/**
 * Translate an `EvalCase.scriptedTrace` into an Anthropic
 * `messages.create` shaped function. Each step yields one model
 * response; running out of script while the orchestrator still wants
 * to tool_use is treated as a script-too-short error so the failure
 * surfaces in the assertion list instead of being silently absorbed
 * by the loop's max-turn fallback.
 */
export function scriptedAnthropicClient(
  trace: ReadonlyArray<ScriptStep>,
): {
  messagesCreate: (
    body: Anthropic.MessageCreateParamsNonStreaming,
  ) => Promise<Anthropic.Message>;
  remainingSteps: () => number;
} {
  const queue = [...trace];
  return {
    remainingSteps() {
      return queue.length;
    },
    async messagesCreate() {
      const step = queue.shift();
      if (!step) {
        throw new Error(
          "scripted trace exhausted before the orchestrator finished — extend the case's scriptedTrace",
        );
      }
      return materialiseStep(step);
    },
  };
}

function materialiseStep(step: ScriptStep): Anthropic.Message {
  if (step.kind === "tool") {
    return baseMessage("tool_use", [
      {
        type: "tool_use",
        id: `toolu_${nonce()}`,
        name: step.name,
        input: (step.input ?? {}) as Record<string, unknown>,
      } as Anthropic.ToolUseBlock,
    ]);
  }
  if (step.kind === "finalize") {
    return baseMessage("tool_use", [
      {
        type: "tool_use",
        id: `toolu_${nonce()}`,
        name: "finalize",
        input: step.body as unknown as Record<string, unknown>,
      } as Anthropic.ToolUseBlock,
    ]);
  }
  return baseMessage("end_turn", [
    {
      type: "text",
      text: step.text ?? "",
      citations: null,
    } as unknown as Anthropic.TextBlock,
  ]);
}

function baseMessage(
  stop_reason: "tool_use" | "end_turn",
  content: Anthropic.ContentBlock[],
): Anthropic.Message {
  return {
    id: `msg_${nonce()}`,
    type: "message",
    role: "assistant",
    model: "scripted",
    stop_reason,
    stop_sequence: null,
    content,
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  } as unknown as Anthropic.Message;
}

function nonce(): string {
  return Math.random().toString(36).slice(2, 10);
}
