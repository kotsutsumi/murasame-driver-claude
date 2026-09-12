import { asSessionId } from "@murasame/protocol";
import { createRuntime } from "@murasame/runtime";
import { createClaudeDriver } from "../src/index.ts";

const runtime = createRuntime({
  sessionId: asSessionId(`session-claude-subagent-${Date.now()}`),
});
const driver = createClaudeDriver({ runtime });

try {
  const run = driver.run({
    prompt: "Use a subagent to inspect this repository and summarize its structure.",
    permissionPrompts: "none",
    forwardSubagentText: true,
  });
  const result = await run.result;
  console.log(JSON.stringify({ result, snapshot: runtime.snapshot() }, null, 2));
} finally {
  await driver.dispose();
}
