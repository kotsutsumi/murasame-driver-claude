import type { ClaudeAdapter, ClaudeAdapterOptions } from "@murasame/adapter-claude";
import type { MurasameRuntime } from "@murasame/runtime";

export type ClaudeEffort =
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max"
  | "ultracode"
  | (string & {});

export type ClaudePermissionMode =
  | "default"
  | "manual"
  | "acceptEdits"
  | "plan"
  | "auto"
  | "dontAsk"
  | "bypassPermissions"
  | (string & {});

export type ClaudePermissionPrompts = "host" | "none";

export type ClaudeRunId = string & { readonly __brand: "ClaudeRunId" };

export type ClaudeRunState =
  | "starting"
  | "running"
  | "cancelling"
  | "completed"
  | "failed"
  | "cancelled";

export type ClaudeRunStatus = "completed" | "failed" | "cancelled";

export interface ClaudeRunInput {
  readonly prompt: string;
  readonly cwd?: string;
  readonly model?: string;
  readonly effort?: ClaudeEffort;
  readonly permissionMode?: ClaudePermissionMode;
  readonly permissionPrompts?: ClaudePermissionPrompts;
  readonly allowedTools?: readonly string[];
  readonly disallowedTools?: readonly string[];
  readonly tools?: readonly string[];
  readonly maxTurns?: number;
  readonly maxBudgetUsd?: number;
  readonly agent?: string;
  readonly addDirs?: readonly string[];
  readonly appendSystemPrompt?: string;
  readonly appendSubagentSystemPrompt?: string;
  readonly bare?: boolean;
  readonly restricted?: boolean;
  readonly resumeSessionId?: string;
  readonly continueSession?: boolean;
  readonly forkSession?: boolean;
  readonly forwardSubagentText?: boolean;
  readonly includePartialMessages?: boolean;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly timeoutMs?: number;
  readonly extraArgs?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface ClaudeRunResult {
  readonly runId: ClaudeRunId;
  readonly status: ClaudeRunStatus;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly cancelReason?: string;
  readonly claudeSessionId?: string;
  readonly stderr: string;
  readonly stdoutBytes: number;
  readonly stderrBytes: number;
  readonly semanticEventCount: number;
  readonly startedAt: number;
  readonly finishedAt: number;
  readonly durationMs: number;
}

export interface Disposable {
  dispose(): void;
}

export type ClaudeDriverDiagnosticSeverity = "info" | "warning" | "error";

export type ClaudeDriverDiagnosticCode =
  | "SPAWN_FAILED"
  | "STDIN_WRITE_FAILED"
  | "STDERR_TRUNCATED"
  | "ADAPTER_DIAGNOSTIC"
  | "ADAPTER_FAILURE"
  | "RUNTIME_EVENT_REJECTED"
  | "RUN_TIMEOUT"
  | "CANCEL_ESCALATED"
  | "PROCESS_EXITED_BY_SIGNAL"
  | "PROCESS_EXIT_NON_ZERO"
  | "EMPTY_SUCCESSFUL_RUN"
  | "STDOUT_CLOSED_EARLY"
  | "UNEXPECTED_PROCESS_STATE"
  | "DRIVER_DISPOSED";

export interface ClaudeDriverDiagnostic {
  readonly severity: ClaudeDriverDiagnosticSeverity;
  readonly code: ClaudeDriverDiagnosticCode;
  readonly message: string;
  readonly runId?: ClaudeRunId;
  readonly cause?: unknown;
}

export type ClaudeDriverDiagnosticListener = (diagnostic: ClaudeDriverDiagnostic) => void;

export interface ClaudeRunHandle {
  readonly id: ClaudeRunId;
  readonly state: ClaudeRunState;
  readonly pid: number | undefined;
  readonly result: Promise<ClaudeRunResult>;

  cancel(reason?: string): void;
  kill(signal?: NodeJS.Signals): void;
  onDiagnostic(listener: ClaudeDriverDiagnosticListener): Disposable;
}

export interface ClaudeDriver {
  run(input: ClaudeRunInput): ClaudeRunHandle;
  dispose(): Promise<void>;
}

export interface ClaudeDriverOptions {
  readonly runtime: MurasameRuntime;
  readonly executable?: string;
  readonly provider?: string;
  readonly baseEnv?: Readonly<Record<string, string | undefined>>;
  readonly stderrLimit?: number;
  readonly defaultTimeoutMs?: number;
  readonly gracefulCancelMs?: number;
  readonly onDiagnostic?: ClaudeDriverDiagnosticListener;
  readonly spawner?: ClaudeProcessSpawner;
  readonly processSpawner?: ClaudeProcessSpawner;
  readonly adapterFactory?: ClaudeAdapterFactory;
  readonly timer?: ClaudeTimerScheduler;
  readonly now?: () => number;
}

export type ClaudeAdapterFactory = (options: ClaudeAdapterOptions) => ClaudeAdapter;

export interface ClaudeTimerScheduler {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface ClaudeSpawnOptions {
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly shell: false;
  readonly detached: false;
  readonly stdio: readonly ["pipe", "pipe", "pipe"];
}

export interface ClaudeReadableStream {
  setEncoding?(encoding: "utf8"): void;
  on(event: "data", listener: (chunk: string | Uint8Array) => void): unknown;
  once(event: "end" | "close", listener: () => void): unknown;
}

export interface ClaudeWritableStream {
  write(data: string): boolean;
  end(): void;
  once(event: "error", listener: (error: unknown) => void): unknown;
}

export interface ClaudeChildProcess {
  readonly pid?: number;
  readonly stdin: ClaudeWritableStream | null;
  readonly stdout: ClaudeReadableStream | null;
  readonly stderr: ClaudeReadableStream | null;

  once(event: "error", listener: (error: unknown) => void): unknown;
  once(
    event: "exit" | "close",
    listener: (code: number | null, signal: NodeJS.Signals | null) => void,
  ): unknown;
  kill(signal?: NodeJS.Signals): boolean;
}

export interface ClaudeProcessSpawner {
  spawn(command: string, args: readonly string[], options: ClaudeSpawnOptions): ClaudeChildProcess;
}

export interface InternalClaudeRunOptions {
  readonly id: ClaudeRunId;
  readonly input: ClaudeRunInput;
  readonly args: readonly string[];
  readonly runtime: MurasameRuntime;
  readonly executable: string;
  readonly provider?: string;
  readonly baseEnv?: Readonly<Record<string, string | undefined>>;
  readonly stderrLimit: number;
  readonly gracefulCancelMs: number;
  readonly defaultTimeoutMs?: number;
  readonly spawner: ClaudeProcessSpawner;
  readonly adapterFactory: ClaudeAdapterFactory;
  readonly timer: ClaudeTimerScheduler;
  readonly now: () => number;
  readonly emit: (diagnostic: ClaudeDriverDiagnostic) => void;
  readonly onFinished: () => void;
}
