import { asSessionId } from "@murasame/protocol";
import { createRuntime } from "@murasame/runtime";
import { createClaudeDriver } from "../src/index.ts";

const runtime = createRuntime({
  sessionId: asSessionId(`session-claude-multi-${Date.now()}`),
});
const driver = createClaudeDriver({ runtime });

try {
  const first = driver.run({ prompt: "Reply exactly first", permissionPrompts: "none" });
  const second = driver.run({ prompt: "Reply exactly second", permissionPrompts: "none" });
  const results = await Promise.all([first.result, second.result]);
  console.log(JSON.stringify({ results, snapshot: runtime.snapshot() }, null, 2));
} finally {
  await driver.dispose();
}
