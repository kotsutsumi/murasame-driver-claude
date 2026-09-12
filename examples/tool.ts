import { asSessionId } from "@murasame/protocol";
import { createRuntime } from "@murasame/runtime";
import { createClaudeDriver } from "../src/index.ts";

const runtime = createRuntime({
  sessionId: asSessionId(`session-claude-tool-${Date.now()}`),
});
const driver = createClaudeDriver({ runtime });

try {
  const run = driver.run({
    prompt: "List the files in the current directory, then reply DONE.",
    permissionPrompts: "none",
    allowedTools: ["Bash", "Read", "Glob"],
  });
  const result = await run.result;
  console.log(JSON.stringify({ result, snapshot: runtime.snapshot() }, null, 2));
} finally {
  await driver.dispose();
}
