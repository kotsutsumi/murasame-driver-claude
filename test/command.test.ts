import { describe, expect, test } from "bun:test";
import { buildClaudeArgs, ClaudeRunConfigurationError } from "../src/index.ts";

describe("Claude command builder", () => {
  test("builds print stream-json arguments without putting the prompt in argv", () => {
    const args = buildClaudeArgs({
      prompt: "multiline\nprompt",
      model: "claude-test",
      effort: "high",
      permissionMode: "dontAsk",
      permissionPrompts: "none",
      allowedTools: ["Bash(git *)", "Read"],
      disallowedTools: ["WebFetch"],
      tools: ["Bash", "Read"],
      maxTurns: 4,
      maxBudgetUsd: 1.25,
      agent: "reviewer",
      addDirs: ["/repo", "/tmp/docs"],
      appendSystemPrompt: "Use concise output.",
      appendSubagentSystemPrompt: "Report findings only.",
      bare: true,
      restricted: true,
      resumeSessionId: "session-1",
      forkSession: true,
      extraArgs: ["--debug"],
    });

    expect(args).toEqual([
      "-p",
      "--output-format",
      "stream-json",
      "--verbose",
      "--include-partial-messages",
      "--forward-subagent-text",
      "--model",
      "claude-test",
      "--effort",
      "high",
      "--permission-mode",
      "dontAsk",
      "--permission-prompts",
      "none",
      "--allowed-tools",
      "Bash(git *),Read",
      "--disallowed-tools",
      "WebFetch",
      "--tools",
      "Bash,Read",
      "--max-turns",
      "4",
      "--max-budget-usd",
      "1.25",
      "--agent",
      "reviewer",
      "--add-dir",
      "/repo",
      "--add-dir",
      "/tmp/docs",
      "--append-system-prompt",
      "Use concise output.",
      "--append-subagent-system-prompt",
      "Report findings only.",
      "--bare",
      "--restricted",
      "--resume",
      "session-1",
      "--fork-session",
      "--debug",
    ]);
    expect(args).not.toContain("multiline\nprompt");
  });

  test("omits optional streaming flags only when explicitly disabled", () => {
    expect(
      buildClaudeArgs({
        prompt: "hello",
        includePartialMessages: false,
        forwardSubagentText: false,
        continueSession: true,
      }),
    ).toEqual(["-p", "--output-format", "stream-json", "--verbose", "--continue"]);
  });

  test("rejects extra arguments that can change the semantic transport", () => {
    expect(() =>
      buildClaudeArgs({ prompt: "hello", extraArgs: ["--output-format", "text"] }),
    ).toThrow(ClaudeRunConfigurationError);
    expect(() =>
      buildClaudeArgs({ prompt: "hello", extraArgs: ["--input-format=stream-json"] }),
    ).toThrow(ClaudeRunConfigurationError);
    expect(() => buildClaudeArgs({ prompt: "hello", extraArgs: ["--background"] })).toThrow(
      ClaudeRunConfigurationError,
    );
  });
});
