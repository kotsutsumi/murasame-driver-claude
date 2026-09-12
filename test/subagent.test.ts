import { describe, expect, test } from "bun:test";
import { createClaudeDriver } from "../src/index.ts";
import { FakeSpawner, makeRuntime } from "./helpers.ts";

describe("Claude subagent pipeline", () => {
  test("keeps forwarded child text and flow projection in the adapter boundary", async () => {
    const runtime = makeRuntime();
    const spawner = new FakeSpawner();
    const driver = createClaudeDriver({ runtime, spawner });
    const run = driver.run({ prompt: "inspect" });
    const child = spawner.children[0];
    if (child === undefined) throw new Error("fake child was not created");

    child.stdout.push(await Bun.file(new URL("./fixtures/subagent.jsonl", import.meta.url)).text());
    child.complete();

    const result = await run.result;
    const snapshot = runtime.snapshot();
    expect(result.status).toBe("completed");
    expect(snapshot.agents).toHaveLength(2);
    expect(snapshot.streams.map((stream) => stream.text)).toContain("child summary");
    expect(snapshot.flow.edges).toHaveLength(1);
    expect(snapshot.flow.edges[0]?.label).toBe("spawn");
    expect(snapshot.tools[0]?.status).toBe("success");
    await driver.dispose();
  });
});
