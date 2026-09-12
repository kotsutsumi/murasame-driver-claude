import { describe, expect, test } from "bun:test";
import { createClaudeDriver } from "../src/index.ts";
import { FakeSpawner, makeRuntime } from "./helpers.ts";

describe("Claude process exit", () => {
  test("preserves stderr and reports non-zero exit", async () => {
    const runtime = makeRuntime();
    const spawner = new FakeSpawner();
    const diagnostics: string[] = [];
    const driver = createClaudeDriver({
      runtime,
      spawner,
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic.code),
    });
    const run = driver.run({ prompt: "invalid option" });
    const child = spawner.children[0];
    if (child === undefined) throw new Error("fake child was not created");

    child.stderr.push("unknown option\n");
    child.complete(2);

    const result = await run.result;
    expect(result.status).toBe("failed");
    expect(result.exitCode).toBe(2);
    expect(result.signal).toBeNull();
    expect(result.stderr).toBe("unknown option\n");
    expect(diagnostics).toContain("PROCESS_EXIT_NON_ZERO");
    await driver.dispose();
  });

  test("keeps a signal exit distinct in the run result", async () => {
    const runtime = makeRuntime();
    const spawner = new FakeSpawner();
    const driver = createClaudeDriver({ runtime, spawner });
    const run = driver.run({ prompt: "stop" });
    spawner.children[0]?.complete(null, "SIGTERM");

    const result = await run.result;
    expect(result.status).toBe("failed");
    expect(result.exitCode).toBeNull();
    expect(result.signal).toBe("SIGTERM");
    await driver.dispose();
  });
});
