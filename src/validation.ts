import { isReservedClaudeArgument } from "./command.ts";
import { ClaudeRunConfigurationError } from "./errors.ts";
import type { ClaudeDriverOptions, ClaudeRunInput } from "./types.ts";

export function validateDriverOptions(options: ClaudeDriverOptions): void {
  if (options.runtime === undefined || options.runtime === null) {
    throw new TypeError("runtime is required");
  }
  if (options.executable !== undefined && options.executable.trim().length === 0) {
    throw new ClaudeRunConfigurationError("executable must not be empty");
  }
  validateNonNegativeInteger(options.stderrLimit, "stderrLimit");
  validateNonNegativeInteger(options.defaultTimeoutMs, "defaultTimeoutMs");
  validateNonNegativeInteger(options.gracefulCancelMs, "gracefulCancelMs");
}

export function validateRunInput(input: ClaudeRunInput): void {
  if (typeof input.prompt !== "string" || input.prompt.length === 0) {
    throw new ClaudeRunConfigurationError("prompt must be a non-empty string");
  }
  validateNonNegativeInteger(input.timeoutMs, "timeoutMs");
  validatePositiveInteger(input.maxTurns, "maxTurns");
  validateNonNegativeNumber(input.maxBudgetUsd, "maxBudgetUsd");

  for (const [name, value] of [
    ["cwd", input.cwd],
    ["model", input.model],
    ["agent", input.agent],
    ["resumeSessionId", input.resumeSessionId],
    ["appendSystemPrompt", input.appendSystemPrompt],
    ["appendSubagentSystemPrompt", input.appendSubagentSystemPrompt],
  ] as const) {
    if (value !== undefined && value.length === 0) {
      throw new ClaudeRunConfigurationError(`${name} must not be empty`);
    }
  }

  if (input.resumeSessionId !== undefined && input.continueSession === true) {
    throw new ClaudeRunConfigurationError(
      "resumeSessionId and continueSession are mutually exclusive",
    );
  }
  if (
    input.forkSession === true &&
    input.resumeSessionId === undefined &&
    input.continueSession !== true
  ) {
    throw new ClaudeRunConfigurationError(
      "forkSession requires resumeSessionId or continueSession",
    );
  }

  validateStringArray(input.allowedTools, "allowedTools");
  validateStringArray(input.disallowedTools, "disallowedTools");
  validateStringArray(input.tools, "tools");
  validateStringArray(input.addDirs, "addDirs");
  for (const [index, arg] of (input.extraArgs ?? []).entries()) {
    if (arg.length === 0) {
      throw new ClaudeRunConfigurationError(`extraArgs[${index}] must not be empty`);
    }
    if (isReservedClaudeArgument(arg)) {
      throw new ClaudeRunConfigurationError(`extraArgs[${index}] attempts to override ${arg}`);
    }
  }
}

function validateStringArray(values: readonly string[] | undefined, name: string): void {
  if (values === undefined) return;
  for (const [index, value] of values.entries()) {
    if (value.length === 0) {
      throw new ClaudeRunConfigurationError(`${name}[${index}] must not be empty`);
    }
  }
}

function validateNonNegativeInteger(value: number | undefined, name: string): void {
  if (value === undefined) return;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ClaudeRunConfigurationError(`${name} must be a non-negative safe integer`);
  }
}

function validatePositiveInteger(value: number | undefined, name: string): void {
  if (value === undefined) return;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ClaudeRunConfigurationError(`${name} must be a positive safe integer`);
  }
}

function validateNonNegativeNumber(value: number | undefined, name: string): void {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value < 0) {
    throw new ClaudeRunConfigurationError(`${name} must be a non-negative finite number`);
  }
}
