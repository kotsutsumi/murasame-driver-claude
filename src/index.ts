/**
 * @murasame/driver-claude
 *
 * Process/control layer for headless `claude -p --output-format stream-json`
 * executions.
 */

export { buildClaudeArgs, isReservedClaudeArgument } from "./command.ts";
export { createClaudeDriver } from "./driver.ts";
export {
  ClaudeDriverDisposedError,
  ClaudeDriverError,
  ClaudeRunConfigurationError,
  ClaudeSpawnError,
} from "./errors.ts";
export { asClaudeRunId, createClaudeRunId } from "./ids.ts";
export { nodeProcessSpawner } from "./spawner.ts";
export type {
  ClaudeAdapterFactory,
  ClaudeChildProcess,
  ClaudeDriver,
  ClaudeDriverDiagnostic,
  ClaudeDriverDiagnosticCode,
  ClaudeDriverDiagnosticListener,
  ClaudeDriverDiagnosticSeverity,
  ClaudeDriverOptions,
  ClaudeEffort,
  ClaudePermissionMode,
  ClaudePermissionPrompts,
  ClaudeProcessSpawner,
  ClaudeReadableStream,
  ClaudeRunHandle,
  ClaudeRunId,
  ClaudeRunInput,
  ClaudeRunResult,
  ClaudeRunState,
  ClaudeRunStatus,
  ClaudeSpawnOptions,
  ClaudeTimerScheduler,
  ClaudeWritableStream,
  Disposable,
} from "./types.ts";
