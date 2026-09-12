# Claude Code CLI contract

The v0.1 driver targets local, non-interactive Claude Code execution:

```text
claude -p --output-format stream-json --verbose
```

The prompt is sent through stdin. The driver uses pipe stdio with
`shell: false` and `detached: false`.

Recommended defaults are:

```text
--include-partial-messages
--forward-subagent-text
```

The first exposes incremental API stream events. The second forwards
subagent text and thinking blocks with `parent_tool_use_id`, including nested
forwarding where the installed Claude Code version supports it. Complete
assistant messages remain a valid fallback when partial events are absent.

## Streams

stdout is the only semantic input. stderr is diagnostic output and is kept as
a bounded tail for `ClaudeRunResult.stderr`; it is never passed to the
adapter, JSON-decoded, or merged with stdout. Claude can report execution
failure in a stdout `result` event, while invalid command-line options may
fail before semantic output and appear on stderr.

## Managed options

The driver manages print/stream transport flags and rejects `extraArgs` that
could replace them. It also rejects background/cloud/remote execution flags in
v0.1 because those modes do not have the same local process lifecycle.

Resume, continue, and fork are process options. A resumed Claude session gets
a new MURASAME run, agent, task, and event namespace; the original Claude
session ID is retained by the adapter context/result when it is observable.

`permissionPrompts: "none"` is useful for unattended execution. The driver
does not enable `bypassPermissions` by default; permission policy belongs to
the caller.

The `appendSubagentSystemPrompt` input is forwarded as
`--append-subagent-system-prompt` when requested. Because Claude Code CLI
flags are versioned independently of this package, callers should verify that
their installed version supports it.

## Non-goals

This package does not provide an interactive TUI, PTY fallback, Agent SDK
backend, persistent stream-json stdin session, cloud/background backend,
authentication, retries, model fallback, or cost accounting.
