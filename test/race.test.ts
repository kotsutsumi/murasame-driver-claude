import { describe, expect, test } from "bun:test";
import { createClaudeDriver } from "../src/index.ts";
import { FakeSpawner, makeRuntime } from "./helpers.ts";

const init = `${JSON.stringify({
  type: "system",
  subtype: "init",
  session_id: "race-session",
})}\n`;

describe("Claude finalization races", () => {
  test("resolves once when cancellation races with process close", async () => {
    const runtime = makeRuntime();
    const spawner = new FakeSpawner();
    const driver = createClaudeDriver({ runtime, spawner });
    const run = driver.run({ prompt: "hello" });
    const child = spawner.children[0];
    if (child === undefined) throw new Error("fake child was not created");

    child.stdout.push(init);
    child.complete();
    run.cancel("too-late");

    const result = await run.result;
    expect(result.status).toBe("completed");
    expect(runtime.snapshot().eventCount).toBe(result.semanticEventCount);
    await driver.dispose();
  });

  test("dispose cancels every active run and prevents new runs", async () => {
    const runtime = makeRuntime();
    const spawner = new FakeSpawner();
    const driver = createClaudeDriver({ runtime, spawner });
    const first = driver.run({ prompt: "one" });
    const second = driver.run({ prompt: "two" });

    const disposing = driver.dispose();
    spawner.children[0]?.complete(130, "SIGINT");
    spawner.children[1]?.complete(130, "SIGINT");
    await disposing;

    expect((await first.result).status).toBe("cancelled");
    expect((await second.result).status).toBe("cancelled");
    expect(() => driver.run({ prompt: "three" })).toThrow();
  });
});
