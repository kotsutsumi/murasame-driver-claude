import { asSessionId } from "@murasame/protocol";
import { createRuntime } from "@murasame/runtime";
import { createClaudeDriver } from "../src/index.ts";

const runtime = createRuntime({
  sessionId: asSessionId(`session-claude-cancel-${Date.now()}`),
});
const driver = createClaudeDriver({ runtime, gracefulCancelMs: 2_000 });

try {
  const run = driver.run({
    prompt: "Work slowly and explain the repository in detail.",
    permissionPrompts: "none",
  });
  const cancellation = setTimeout(() => run.cancel("example-cancel"), 1_000);
  const result = await run.result;
  clearTimeout(cancellation);
  console.log(JSON.stringify({ result, snapshot: runtime.snapshot() }, null, 2));
} finally {
  await driver.dispose();
}
