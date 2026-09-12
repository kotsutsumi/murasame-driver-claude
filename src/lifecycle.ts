import type { ClaudeRunResult, ClaudeRunState } from "./types.ts";

export function finalRunStatus(
  state: Pick<
    {
      cancelRequested: boolean;
      executionFailed: boolean;
      exitCode: number | null;
      exitSignal: NodeJS.Signals | null;
    },
    "cancelRequested" | "executionFailed" | "exitCode" | "exitSignal"
  >,
): ClaudeRunResult["status"] {
  if (state.cancelRequested) return "cancelled";
  if (state.executionFailed || state.exitCode !== 0 || state.exitSignal !== null) return "failed";
  return "completed";
}

export function isTerminalRunState(state: ClaudeRunState): boolean {
  return state === "completed" || state === "failed" || state === "cancelled";
}
