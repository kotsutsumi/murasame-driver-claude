# Lifecycle contract

## Run state

```text
starting
   │ spawn
   ▼
running
   ├─ exit 0              → completed
   ├─ non-zero/signal     → failed
   ├─ cancel              → cancelling → cancelled
   └─ timeout             → cancel("timeout")
```

`cancel()` and finalization are idempotent. A process can emit `exit`, stream
EOF, `close`, timeout, and cancellation in any nearby order; the driver waits
for process exit and stdout EOF, then performs finalization once.

## Finalization order

```text
last stdout data
    ↓
stdout EOF and process exit known
    ↓
adapter.flush()
    ↓
adapter.finish({ exitCode, signal, reason })
    ↓
runtime.ingestMany(...)
    ↓
resolve run.result
```

`run.result` is resolved for failed and cancelled runs as well. A malformed
configuration, disposed driver, or other caller misuse throws synchronously
from `run()`; process failures are represented by `ClaudeRunResult.status`.

## Cancellation

The first cancellation signal is `SIGINT`. If the process remains alive after
`gracefulCancelMs`, the driver sends `SIGTERM`, then `SIGKILL`. A second
`cancel()` does not create another escalation chain. A direct `kill()` is
exposed as a low-level control escape hatch but still marks the run cancelled
for the result contract.

## Semantic boundary

The driver does not synthesize Claude events. It may emit process diagnostics
such as `RUN_TIMEOUT`, `SPAWN_FAILED`, or `EMPTY_SUCCESSFUL_RUN`, but all
Murasame semantic lifecycle events are produced by the adapter.
