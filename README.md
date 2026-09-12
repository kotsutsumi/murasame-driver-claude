# @murasame/driver-claude

`@murasame/driver-claude` is the process/control layer for non-interactive
Claude Code executions. It launches Claude Code in print + `stream-json` mode,
feeds stdout to `@murasame/adapter-claude`, and ingests the resulting
`MurasameEvent` values into `@murasame/runtime`.

It does not parse Claude semantics itself, render UI, own a PTY, or merge
stderr into the semantic stream.

## Architecture

```text
prompt
  │ stdin
  ▼
claude -p --output-format stream-json --verbose
  │
  ├─ stdout ──▶ @murasame/adapter-claude ──▶ @murasame/runtime
  │
  └─ stderr ──▶ bounded diagnostics/result tail
```

The driver is intentionally headless. Interactive Claude Code presentation
belongs to the independent `murasame-pty → murasame-vt →
murasame-vt-terminal` path.

## Usage

```ts
import { asSessionId } from "@murasame/protocol"
import { createClaudeDriver } from "@murasame/driver-claude"
import { createRuntime } from "@murasame/runtime"

const runtime = createRuntime({
  sessionId: asSessionId("session-001"),
})
const driver = createClaudeDriver({ runtime })

const run = driver.run({
  prompt: "Reply exactly hello",
  cwd: process.cwd(),
  permissionPrompts: "none",
})

const result = await run.result
console.log(result.status)
console.log(runtime.snapshot())

await driver.dispose()
```

One `run()` creates one adapter and one MURASAME task. All runs created by a
driver share the runtime's session-scoped sequence provider, while each run
passes its own event-ID namespace to the Claude adapter.

The prompt is written to stdin and stdin is always closed. The semantic source
is stdout only. stderr is retained as a bounded diagnostic tail and is never
parsed as JSON or sent to the adapter.

## Defaults and controls

Every run uses:

```text
-p --output-format stream-json --verbose
--include-partial-messages
--forward-subagent-text
```

The last two flags can be disabled explicitly. Model, effort, permission,
tool, budget, turn, working-directory, resume, fork, and environment controls
are exposed through `ClaudeRunInput`. `extraArgs` is available as an escape
hatch, but transport-changing, background, cloud, and interactive arguments
are rejected.

Cancellation sends `SIGINT`, then escalates to `SIGTERM` and `SIGKILL` after
the configured grace interval. A timeout requests cancellation. The driver
does not create a frame scheduler; callers own application/UI timing.

## Failure and lifecycle

`run.result` resolves to a result for process success, failure, and
cancellation. Configuration errors throw from `run()`. Process-level failure
does not cause the promise to reject. Before resolving, the driver drains
stdout and stderr, calls `adapter.flush()`, calls `adapter.finish()`, and ingests
those events into the runtime.

The adapter remains responsible for Claude result semantics. The driver only
classifies process control outcomes such as spawn failure, signal exit,
timeout, and non-zero exit.

## Claude Code caveats

- stdout from `claude -p --output-format stream-json` is the semantic source.
- stderr is diagnostic text and is never parsed by this package.
- partial stream events and forwarded subagent text are recommended, but the
  driver also works with complete-message events.
- Claude CLI versions can add or remove flags and event fields; unknown
  semantic fields are tolerated by `@murasame/adapter-claude`.
- failure details can arrive as a stdout `result` event or as stderr/exit
  information, so stderr emptiness is not success evidence.
- `--append-subagent-system-prompt` is passed through when requested and must
  be supported by the installed Claude Code version.

## Development

```sh
bun install
bun run check
bun run example:hello
```

Unit tests use a fake process spawner. The examples invoke the installed
`claude` executable and may require authentication and a configured Claude
Code environment.
