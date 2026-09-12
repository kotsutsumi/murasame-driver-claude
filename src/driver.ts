import { createClaudeAdapter } from "@murasame/adapter-claude";
import { buildClaudeArgs } from "./command.ts";
import { ClaudeDriverDisposedError } from "./errors.ts";
import { createClaudeRunId } from "./ids.ts";
import { defaultTimer } from "./process.ts";
import { createInternalClaudeRun, type InternalClaudeRun } from "./run.ts";
import { nodeProcessSpawner } from "./spawner.ts";
import type {
  ClaudeAdapterFactory,
  ClaudeDriver,
  ClaudeDriverDiagnostic,
  ClaudeDriverOptions,
  ClaudeProcessSpawner,
  ClaudeRunHandle,
  ClaudeRunInput,
} from "./types.ts";
import { validateDriverOptions, validateRunInput } from "./validation.ts";

const DEFAULT_STDERR_LIMIT = 1024 * 1024;
const DEFAULT_GRACEFUL_CANCEL_MS = 2_000;

export function createClaudeDriver(options: ClaudeDriverOptions): ClaudeDriver {
  return new ClaudeDriverImpl(options);
}

class ClaudeDriverImpl implements ClaudeDriver {
  #disposed = false;
  #nextRun = 1;
  #runs = new Map<string, InternalClaudeRun>();
  #onDiagnostic: ClaudeDriverOptions["onDiagnostic"];
  #runtime: ClaudeDriverOptions["runtime"];
  #executable: string;
  #provider: string | undefined;
  #baseEnv: ClaudeDriverOptions["baseEnv"];
  #stderrLimit: number;
  #defaultTimeoutMs: number | undefined;
  #gracefulCancelMs: number;
  #spawner: ClaudeProcessSpawner;
  #adapterFactory: ClaudeAdapterFactory;
  #timer: NonNullable<ClaudeDriverOptions["timer"]>;
  #now: () => number;

  constructor(options: ClaudeDriverOptions) {
    validateDriverOptions(options);
    this.#runtime = options.runtime;
    this.#onDiagnostic = options.onDiagnostic;
    this.#executable = options.executable ?? "claude";
    this.#provider = options.provider;
    this.#baseEnv = options.baseEnv;
    this.#stderrLimit = options.stderrLimit ?? DEFAULT_STDERR_LIMIT;
    this.#defaultTimeoutMs = options.defaultTimeoutMs;
    this.#gracefulCancelMs = options.gracefulCancelMs ?? DEFAULT_GRACEFUL_CANCEL_MS;
    this.#spawner = options.spawner ?? options.processSpawner ?? nodeProcessSpawner;
    this.#adapterFactory = options.adapterFactory ?? createClaudeAdapter;
    this.#timer = options.timer ?? defaultTimer;
    this.#now = options.now ?? Date.now;
  }

  run(input: ClaudeRunInput): ClaudeRunHandle {
    this.ensureActive();
    validateRunInput(input);
    const args = buildClaudeArgs(input);
    const id = createClaudeRunId(this.#nextRun);
    this.#nextRun += 1;
    const run = createInternalClaudeRun({
      id,
      input,
      args,
      runtime: this.#runtime,
      executable: this.#executable,
      ...(this.#provider === undefined ? {} : { provider: this.#provider }),
      ...(this.#baseEnv === undefined ? {} : { baseEnv: this.#baseEnv }),
      stderrLimit: this.#stderrLimit,
      ...(this.#defaultTimeoutMs === undefined ? {} : { defaultTimeoutMs: this.#defaultTimeoutMs }),
      gracefulCancelMs: this.#gracefulCancelMs,
      spawner: this.#spawner,
      adapterFactory: this.#adapterFactory,
      timer: this.#timer,
      now: this.#now,
      emit: (diagnostic) => this.report(diagnostic),
      onFinished: () => this.#runs.delete(id),
    });
    this.#runs.set(id, run);
    run.start();
    return run;
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    this.report({
      severity: "info",
      code: "DRIVER_DISPOSED",
      message: "Claude driver is disposing active runs",
    });
    const activeRuns = [...this.#runs.values()];
    for (const run of activeRuns) run.cancel("driver-dispose");
    await Promise.all(activeRuns.map((run) => run.result));
  }

  private ensureActive(): void {
    if (this.#disposed) throw new ClaudeDriverDisposedError("Claude driver has been disposed");
  }

  private report(diagnostic: ClaudeDriverDiagnostic): void {
    try {
      this.#onDiagnostic?.(diagnostic);
    } catch {
      // A driver diagnostic listener must not break process control.
    }
  }
}
