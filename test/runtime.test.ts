import { describe, expect, test } from "bun:test";
import { type ClaudeAdapter, createClaudeAdapter } from "@murasame/adapter-claude";
import { createClaudeDriver as createDriver } from "../src/index.ts";
import { FakeSpawner, makeRuntime } from "./helpers.ts";

function init(sessionId: string): string {
  return `${JSON.stringify({ type: "system", subtype: "init", session_id: sessionId })}\n`;
}

describe("Claude runtime integration", () => {
  test("shares one session sequence and event ID namespace across concurrent runs", async () => {
    const runtime = makeRuntime();
    const spawner = new FakeSpawner();
    const driver = createDriver({ runtime, spawner });
    const first = driver.run({ prompt: "first" });
    const second = driver.run({ prompt: "second" });

    spawner.children[0]?.stdout.push(init("session-1"));
    spawner.children[1]?.stdout.push(init("session-2"));
    spawner.children[1]?.complete();
    spawner.children[0]?.complete();

    expect((await first.result).status).toBe("completed");
    expect((await second.result).status).toBe("completed");
    const events = runtime.events;
    expect(events.map((event) => event.sequence)).toEqual(events.map((_, index) => index + 1));
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
    expect(events.filter((event) => event.id.startsWith("claude-run-1:")).length).toBeGreaterThan(
      0,
    );
    expect(events.filter((event) => event.id.startsWith("claude-run-2:")).length).toBeGreaterThan(
      0,
    );
    expect(runtime.snapshot().agents).toHaveLength(2);
    await driver.dispose();
  });

  test("stops a process when adapter consumption fails", async () => {
    const runtime = makeRuntime();
    const spawner = new FakeSpawner();
    const diagnostics: string[] = [];
    const driver = createDriver({
      runtime,
      spawner,
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic.code),
      adapterFactory: (options): ClaudeAdapter => {
        const adapter = createClaudeAdapter(options);
        return {
          accept: adapter.accept.bind(adapter),
          push: () => {
            throw new Error("adapter push failed");
          },
          pushLine: adapter.pushLine.bind(adapter),
          flush: adapter.flush.bind(adapter),
          finish: adapter.finish.bind(adapter),
          reset: adapter.reset.bind(adapter),
          get context() {
            return adapter.context;
          },
          get unknownEvents() {
            return adapter.unknownEvents;
          },
        };
      },
    });
    const run = driver.run({ prompt: "hello" });
    const child = spawner.children[0];
    if (child === undefined) throw new Error("fake child was not created");

    child.stdout.push("not-json\n");
    expect(child.signals).toEqual(["SIGTERM"]);
    child.complete(143, "SIGTERM");

    expect((await run.result).status).toBe("failed");
    expect(diagnostics).toContain("ADAPTER_FAILURE");
    await driver.dispose();
  });
});
