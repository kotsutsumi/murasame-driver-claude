import type { AgentId, TaskId } from "@murasame/protocol";
import { asAgentId, asTaskId } from "@murasame/protocol";
import type { ClaudeRunId } from "./types.ts";

export function asClaudeRunId(value: string): ClaudeRunId {
  if (value.length === 0) throw new TypeError("ClaudeRunId must not be empty");
  return value as ClaudeRunId;
}

export function createClaudeRunId(sequence: number): ClaudeRunId {
  return asClaudeRunId(`claude-run-${sequence}`);
}

export function createRunAgentId(runId: ClaudeRunId): AgentId {
  return asAgentId(`agent_claude_run_${runId}`);
}

export function createRunTaskId(runId: ClaudeRunId): TaskId {
  return asTaskId(`task_claude_run_${runId}`);
}
