import { describe, expect, test } from "bun:test";
import { buildClaudeEnvironment } from "../src/environment.ts";

describe("Claude process environment", () => {
  test("merges base and run environment and removes undefined values", () => {
    const environment = buildClaudeEnvironment(
      { MURASAME_BASE: "base", MURASAME_OVERRIDE: "base" },
      { MURASAME_OVERRIDE: "run", MURASAME_REMOVED: undefined },
    );

    expect(environment.MURASAME_BASE).toBe("base");
    expect(environment.MURASAME_OVERRIDE).toBe("run");
    expect(environment.MURASAME_REMOVED).toBeUndefined();
  });
});
