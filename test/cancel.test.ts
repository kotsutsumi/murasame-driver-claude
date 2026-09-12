import { describe, expect, test } from "bun:test";
import { type ClaudeTimerScheduler, createClaudeDriver } from "../src/index.ts";
import { FakeSpawner, ManualTimer, makeRuntime } from "./helpers.ts";

describe("Claude cancellation and timeout", () => {
  test("sends SIGINT and returns cancelled when the process exits during grace", async () => {
    const runtime = makeRuntime();
    const spawner = new FakeSpawner();
    const driver = createClaudeDriver({ runtime, spawner, gracefulCancelMs: 20 });
    const run = driver.run({ prompt: "long task" });
    const child = spawner.children[0];
    if (child === undefined) throw new Error("fake child was not created");

    run.cancel("user-request");
    child.complete(130, "SIGINT");

    const result = await run.result;
    expect(result.status).toBe("cancelled");
    expect(result.cancelReason).toBe("user-request");
    expect(child.signals).toEqual(["SIGINT"]);
    await driver.dispose();
  });

  test("escalates SIGINT to SIGTERM and SIGKILL without duplicate chains", async () => {
    const runtime = makeRuntime();
    const spawner = new FakeSpawner();
    const timer = new ManualTimer();
    const driver = createClaudeDriver({ runtime, spawner, timer, gracefulCancelMs: 1 });
    const run = driver.run({ prompt: "long task" });
    const child = spawner.children[0];
    if (child === undefined) throw new Error("fake child was not created");

    run.cancel();
    run.cancel();
    expect(child.signals).toEqual(["SIGINT"]);
    timer.fireNext();
    expect(child.signals).toEqual(["SIGINT", "SIGTERM"]);
    timer.fireNext();
    expect(child.signals).toEqual(["SIGINT", "SIGTERM", "SIGKILL"]);

    child.complete(137, "SIGKILL");
    expect((await run.result).status).toBe("cancelled");
    await driver.dispose();
  });

  test("turns timeout into cancellation and does not schedule a UI loop", async () => {
    const runtime = makeRuntime();
    const spawner = new FakeSpawner();
    const timer = new ManualTimer();
    const diagnostics: string[] = [];
    const driver = createClaudeDriver({
      runtime,
      spawner,
      timer,
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic.code),
    });
    const run = driver.run({ prompt: "long task", timeoutMs: 100 });
    const child = spawner.children[0];
    if (child === undefined) throw new Error("fake child was not created");

    timer.fireNext();
    expect(diagnostics).toContain("RUN_TIMEOUT");
    expect(child.signals).toEqual(["SIGINT"]);
    child.complete(130, "SIGINT");

    expect((await run.result).status).toBe("cancelled");
    await driver.dispose();
  });

  test("accepts a timer implementation with the shared scheduler shape", () => {
    const timer: ClaudeTimerScheduler = new ManualTimer();
    expect(timer).toBeDefined();
  });
});
