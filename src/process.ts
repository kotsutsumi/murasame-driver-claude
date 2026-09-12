import type { ClaudeTimerScheduler } from "./types.ts";

export const defaultTimer: ClaudeTimerScheduler = {
  setTimeout(callback, delayMs) {
    return globalThis.setTimeout(callback, delayMs);
  },
  clearTimeout(handle) {
    globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>);
  },
};

export function chunkByteLength(chunk: string | Uint8Array): number {
  return typeof chunk === "string" ? new TextEncoder().encode(chunk).byteLength : chunk.byteLength;
}
