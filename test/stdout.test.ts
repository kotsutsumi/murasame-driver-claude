import { describe, expect, test } from "bun:test";
import { createClaudeDriver } from "../src/index.ts";
import { FakeSpawner, makeRuntime } from "./helpers.ts";

describe("Claude stdout pipeline", () => {
  test("does not parse JSON-looking stderr", async () => {
    const runtime = makeRuntime();
    const spawner = new FakeSpawner();
    const driver = createClaudeDriver({ runtime, spawner });
    const run = driver.run({ prompt: "hello" });
    const child = spawner.children[0];
    if (child === undefined) throw new Error("fake child was not created");

    child.stderr.push('{"type":"system","subtype":"init","session_id":"stderr"}\n');
    child.stdout.push('{"type":"system","subtype":"init","session_id":"stdout","model":"test"}\n');
    child.stdout.push(
      '{"type":"assistant","message":{"id":"m","content":[{"type":"text","text":"ok"}]}}\n',
    );
    child.stdout.push('{"type":"result","subtype":"success"}\n');
    child.complete();

    const result = await run.result;
    expect(result.status).toBe("completed");
    expect(result.stderr).toContain('"session_id":"stderr"');
    expect(runtime.snapshot().agents[0]?.id).toContain("claude-run-1");
    expect(runtime.snapshot().streams[0]?.text).toBe("ok");
    await driver.dispose();
  });

  test("keeps the last stderr bytes within the configured limit", async () => {
    const runtime = makeRuntime();
    const spawner = new FakeSpawner();
    const diagnostics: string[] = [];
    const driver = createClaudeDriver({
      runtime,
      spawner,
      stderrLimit: 5,
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic.code),
    });
    const run = driver.run({ prompt: "hello" });
    const child = spawner.children[0];
    if (child === undefined) throw new Error("fake child was not created");

    child.stderr.push("abcdef");
    child.complete(2);

    const result = await run.result;
    expect(result.status).toBe("failed");
    expect(result.stderr).toBe("bcdef");
    expect(diagnostics).toContain("STDERR_TRUNCATED");
    await driver.dispose();
  });
});
