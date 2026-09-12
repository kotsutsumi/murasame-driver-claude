import { describe, expect, test } from "bun:test";
import { ClaudeRunConfigurationError, createClaudeDriver } from "../src/index.ts";
import { makeRuntime } from "./helpers.ts";

describe("Claude driver validation", () => {
  test("rejects incompatible resume options", () => {
    const driver = createClaudeDriver({ runtime: makeRuntime() });

    expect(() =>
      driver.run({
        prompt: "hello",
        resumeSessionId: "session-1",
        continueSession: true,
      }),
    ).toThrow(ClaudeRunConfigurationError);
    expect(() => driver.run({ prompt: "hello", forkSession: true })).toThrow(
      ClaudeRunConfigurationError,
    );
  });

  test("validates bounded numeric controls", () => {
    const driver = createClaudeDriver({ runtime: makeRuntime() });

    expect(() => driver.run({ prompt: "hello", timeoutMs: -1 })).toThrow(
      ClaudeRunConfigurationError,
    );
    expect(() => driver.run({ prompt: "hello", maxTurns: 0 })).toThrow(ClaudeRunConfigurationError);
    expect(() => driver.run({ prompt: "hello", maxBudgetUsd: Number.NaN })).toThrow(
      ClaudeRunConfigurationError,
    );
  });
});
