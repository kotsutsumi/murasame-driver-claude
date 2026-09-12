# Driver architecture

`@murasame/driver-claude` owns only the local Claude Code process and the
transport boundary around it.

```text
caller
  │ ClaudeRunInput
  ▼
ClaudeDriver
  │ spawn(shell=false, detached=false)
  ├─ stdin  ◀ prompt, then end()
  ├─ stdout ──▶ ClaudeAdapter.push(string)
  │                   │
  │                   └─▶ runtime.ingestMany(MurasameEvent[])
  └─ stderr ──▶ bounded diagnostic tail

process exit + stdout/stderr EOF
  │
  ├─ adapter.flush()
  ├─ adapter.finish()
  └─ runtime final state
```

The driver never calls `JSON.parse`, dispatches on Claude event types, or
merges stderr with stdout. Claude event interpretation belongs to
`@murasame/adapter-claude`; state reduction belongs to `@murasame/runtime`.

Each run receives:

- a fresh Claude adapter;
- a fresh MURASAME agent/task identity;
- the shared runtime sequence provider;
- the run ID as an adapter event-ID namespace.

This permits concurrent runs in one MURASAME session without sequence or event
ID collisions.
