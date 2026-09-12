import { ClaudeRunConfigurationError } from "./errors.ts";
import type { ClaudeRunInput } from "./types.ts";

const RESERVED_ARGUMENTS = new Set([
  "-p",
  "--print",
  "--output-format",
  "--verbose",
  "--include-partial-messages",
  "--forward-subagent-text",
  "--input-format",
  "--bg",
  "--background",
  "--cloud",
  "--environment",
  "--remote-control",
  "--worktree",
  "--tmux",
]);

/**
 * Builds argv for one non-interactive Claude Code execution.
 *
 * The prompt is deliberately not included in argv. The driver writes it to
 * stdin, which keeps multiline prompts and secrets out of shell parsing and
 * the process listing.
 */
export function buildClaudeArgs(input: ClaudeRunInput): readonly string[] {
  const args: string[] = ["-p", "--output-format", "stream-json", "--verbose"];

  if (input.includePartialMessages !== false) args.push("--include-partial-messages");
  if (input.forwardSubagentText !== false) args.push("--forward-subagent-text");

  if (input.model !== undefined) args.push("--model", input.model);
  if (input.effort !== undefined) args.push("--effort", input.effort);
  if (input.permissionMode !== undefined) args.push("--permission-mode", input.permissionMode);
  if (input.permissionPrompts !== undefined) {
    args.push("--permission-prompts", input.permissionPrompts);
  }
  if (input.allowedTools !== undefined && input.allowedTools.length > 0) {
    args.push("--allowed-tools", input.allowedTools.join(","));
  }
  if (input.disallowedTools !== undefined && input.disallowedTools.length > 0) {
    args.push("--disallowed-tools", input.disallowedTools.join(","));
  }
  if (input.tools !== undefined) args.push("--tools", input.tools.join(","));
  if (input.maxTurns !== undefined) args.push("--max-turns", String(input.maxTurns));
  if (input.maxBudgetUsd !== undefined) {
    args.push("--max-budget-usd", String(input.maxBudgetUsd));
  }
  if (input.agent !== undefined) args.push("--agent", input.agent);
  for (const directory of input.addDirs ?? []) args.push("--add-dir", directory);
  if (input.appendSystemPrompt !== undefined) {
    args.push("--append-system-prompt", input.appendSystemPrompt);
  }
  if (input.appendSubagentSystemPrompt !== undefined) {
    args.push("--append-subagent-system-prompt", input.appendSubagentSystemPrompt);
  }
  if (input.bare === true) args.push("--bare");
  if (input.restricted === true) args.push("--restricted");
  if (input.resumeSessionId !== undefined) args.push("--resume", input.resumeSessionId);
  if (input.continueSession === true) args.push("--continue");
  if (input.forkSession === true) args.push("--fork-session");

  for (const arg of input.extraArgs ?? []) {
    if (isReservedClaudeArgument(arg)) {
      throw new ClaudeRunConfigurationError(`extraArgs cannot override ${arg}`);
    }
    args.push(arg);
  }

  return Object.freeze(args);
}

export function isReservedClaudeArgument(argument: string): boolean {
  const [name] = argument.split("=", 1);
  if (name === undefined) return false;
  if (RESERVED_ARGUMENTS.has(name)) return true;
  if (name === "--output-format" || name === "--input-format") return true;
  if (argument === "stream-json") return true;
  return false;
}
