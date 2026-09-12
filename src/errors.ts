export class ClaudeDriverError extends Error {
  override readonly name: string = "ClaudeDriverError";
}

export class ClaudeDriverDisposedError extends ClaudeDriverError {
  override readonly name = "ClaudeDriverDisposedError";
}

export class ClaudeSpawnError extends ClaudeDriverError {
  override readonly name = "ClaudeSpawnError";
}

export class ClaudeRunConfigurationError extends ClaudeDriverError {
  override readonly name = "ClaudeRunConfigurationError";
}
