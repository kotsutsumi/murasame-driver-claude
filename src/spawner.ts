import { spawn as nodeSpawn } from "node:child_process";
import type { ClaudeChildProcess, ClaudeProcessSpawner, ClaudeSpawnOptions } from "./types.ts";

export const nodeProcessSpawner: ClaudeProcessSpawner = {
  spawn(command: string, args: readonly string[], options: ClaudeSpawnOptions): ClaudeChildProcess {
    return nodeSpawn(command, [...args], {
      cwd: options.cwd,
      env: options.env,
      shell: false,
      detached: false,
      stdio: ["pipe", "pipe", "pipe"],
    }) as unknown as ClaudeChildProcess;
  },
};
