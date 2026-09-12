import { describe, expect, test } from "bun:test";
import { createClaudeDriver } from "../src/index.ts";
import { FakeSpawner, makeRuntime } from "./helpers.ts";

function readFixture(name: string): Promise<string> {
  return Bun.file(new URL(`./fixtures/${name}`, import.meta.url)).text();
}

describe("ClaudeDriver run", () => {
  test("feeds stdin and stream-json stdout through adapter into runtime", async () => {
    const runtime = makeRuntime();
    const spawner = new FakeSpawner();
    const diagnostics: string[] = [];
    const driver = createClaudeDriver({
      runtime,
      executable: "claude-test",
      spawner,
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic.code),
    });
    const run = driver.run({ prompt: "hello from stdin" });
    const child = spawner.children[0];
    if (child === undefined) throw new Error("fake child was not created");

    child.stdout.push(await readFixture("simple.jsonl"));
    child.complete();

    const result = await run.result;
    const snapshot = runtime.snapshot();
    expect(result.status).toBe("completed");
    expect(result.claudeSessionId).toBe("claude-session-1");
    expect(result.stdoutBytes).toBeGreaterThan(0);
    expect(child.stdin.writes).toEqual(["hello from stdin"]);
    expect(child.stdin.ended).toBe(true);
    expect(spawner.calls[0]?.command).toBe("claude-test");
    expect(spawner.calls[0]?.options.shell).toBe(false);
    expect(spawner.calls[0]?.options.detached).toBe(false);
    expect(spawner.calls[0]?.options.stdio).toEqual(["pipe", "pipe", "pipe"]);
    expect(snapshot.streams[0]?.text).toBe("hello from fixture");
    expect(snapshot.tasks[0]?.status).toBe("completed");
    expect(snapshot.agents[0]?.status).toBe("completed");
    expect(diagnostics).not.toContain("RUNTIME_EVENT_REJECTED");

    await driver.dispose();
  });

  test("is independent of stdout JSONL chunk boundaries", async () => {
    const runtime = makeRuntime();
    const spawner = new FakeSpawner();
    const driver = createClaudeDriver({ runtime, spawner });
    const run = driver.run({ prompt: "hello" });
    const child = spawner.children[0];
    if (child === undefined) throw new Error("fake child was not created");

    const data = await readFixture("simple.jsonl");
    for (const character of data) child.stdout.push(character);
    child.complete();

    expect((await run.result).status).toBe("completed");
    expect(runtime.snapshot().streams[0]?.text).toBe("hello from fixture");
    await driver.dispose();
  });

  test("deduplicates partial text when the complete message uses shifted block indexes", async () => {
    const runtime = makeRuntime();
    const spawner = new FakeSpawner();
    const driver = createClaudeDriver({ runtime, spawner });
    const run = driver.run({ prompt: "hello" });
    const child = spawner.children[0];
    if (child === undefined) throw new Error("fake child was not created");

    child.stdout.push(await readFixture("partial-shifted.jsonl"));
    child.complete();

    expect((await run.result).status).toBe("completed");
    expect(runtime.snapshot().streams.find((stream) => stream.stream === "assistant")?.text).toBe(
      "hello",
    );
    await driver.dispose();
  });

  test("returns failed for a spawn failure without throwing from run", async () => {
    const runtime = makeRuntime();
    const spawner = new FakeSpawner();
    spawner.throwError = new Error("ENOENT");
    const diagnostics: string[] = [];
    const driver = createClaudeDriver({
      runtime,
      spawner,
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic.code),
    });

    const run = driver.run({ prompt: "hello" });

    expect(run.state).toBe("failed");
    expect((await run.result).status).toBe("failed");
    expect(diagnostics).toContain("SPAWN_FAILED");
    await driver.dispose();
  });

  test("detects a silent zero-exit process", async () => {
    const runtime = makeRuntime();
    const spawner = new FakeSpawner();
    const diagnostics: string[] = [];
    const driver = createClaudeDriver({
      runtime,
      spawner,
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic.code),
    });
    const run = driver.run({ prompt: "hello" });
    spawner.children[0]?.complete();

    expect((await run.result).status).toBe("failed");
    expect(diagnostics).toContain("EMPTY_SUCCESSFUL_RUN");
    await driver.dispose();
  });

  test("turns an asynchronous stdin error into a failed run", async () => {
    const runtime = makeRuntime();
    const spawner = new FakeSpawner();
    const diagnostics: string[] = [];
    const driver = createClaudeDriver({
      runtime,
      spawner,
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic.code),
    });
    const run = driver.run({ prompt: "hello" });
    const child = spawner.children[0];
    if (child === undefined) throw new Error("fake child was not created");

    child.stdin.fail(new Error("broken pipe"));
    child.complete(143, "SIGTERM");

    expect((await run.result).status).toBe("failed");
    expect(diagnostics).toContain("STDIN_WRITE_FAILED");
    await driver.dispose();
  });
});
