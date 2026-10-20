import { z } from "zod";
import { Annotation, StateGraph, START, END, type BaseCheckpointSaver } from "@langchain/langgraph";
import { type Artifact, type Role, referenceSchema, artifactSchema } from "./contracts";
import { database, transaction } from "./db";
import { runtimeConfig } from "./config";
import { assertService, ServiceError } from "./errors";
import { appendEvent } from "./repository";
import { logError } from "./log";
import { resolveReferences } from "./tasks";
import { reasoningAdapter, type ReasoningAdapter, type ReasoningOutput } from "./providers/reasoning";

export interface RunReference { workspaceId: string; runId: string; controlVersion: number }
const usageSchema = z.object({ inputTokens: z.number().int().nonnegative(), outputTokens: z.number().int().nonnegative(), model: z.string().min(1) });

export async function runReasoning(ref: RunReference, adapter: ReasoningAdapter): Promise<ReasoningOutput> {
  const config = runtimeConfig();
  const prepared = await transaction(async (client) => {
    await client.query("select id from crewmori.workspaces where id=$1 for update", [ref.workspaceId]);
    const found = await client.query("select * from crewmori.agent_runs where workspace_id=$1 and id=$2 for update", [ref.workspaceId, ref.runId]);
    assertService(found.rowCount, "RUN_NOT_FOUND", "Task unavailable.", 404);
    const run = found.rows[0];
    assertService(run.control_version === ref.controlVersion && ["queued", "running", "completed"].includes(run.state), "RUN_INTERRUPTED", "Task was paused, cancelled or superseded.", 409);
    const prior = await client.query("select * from crewmori.model_calls where workspace_id=$1 and run_id=$2 and control_version=$3", [ref.workspaceId, ref.runId, ref.controlVersion]);
    if (prior.rowCount) {
      const call = prior.rows[0];
      if (call.state === "completed") return { cached: { artifact: artifactSchema.parse(call.artifact), usage: usageSchema.parse(call.usage) } };
      throw new ServiceError("UNKNOWN_MODEL_OUTCOME", "A prior model attempt has no confirmed response. Explicit review and retry are required.", 409);
    }
    assertService(run.state !== "completed", "INVALID_STATE", "Completed tasks cannot be dispatched again.", 409);
    const active = await client.query("select count(*)::int as count from crewmori.agent_runs where workspace_id=$1 and state='running' and id<>$2", [ref.workspaceId, ref.runId]);
    assertService(active.rows[0].count < 2, "WORKSPACE_BUSY", "Two tasks are already running.", 409);
    const sources = await resolveReferences(client, ref.workspaceId, z.array(referenceSchema).parse(run.input_refs), run.role === "promoter");
    if (run.role === "promoter") assertService(sources.every((source) => {
      const content = source.content as Record<string, unknown>;
      return content.audience === "public" && content.published === true;
    }), "PUBLIC_CLAIMS_REQUIRED", "Promoter requires explicitly published public source versions.", 409);
    const input = { role: run.role as Role, instruction: run.instruction as string, sources };
    // One token cannot encode less than one byte; this deliberately over-reserves
    // input bytes plus schema/system overhead and the hard output token limit.
    const reserved = Buffer.byteLength(JSON.stringify(input), "utf8") + 6000 + config.AGENT_MAX_OUTPUT_TOKENS;
    await client.query("insert into crewmori.usage_budgets(workspace_id,day) values($1,(now() at time zone 'UTC')::date) on conflict do nothing", [ref.workspaceId]);
    const budget = await client.query("update crewmori.usage_budgets set reserved_tokens=reserved_tokens+$2 where workspace_id=$1 and day=(now() at time zone 'UTC')::date and reserved_tokens+consumed_tokens+$2<=$3 returning day", [ref.workspaceId, reserved, config.AGENT_DAILY_TOKEN_BUDGET]);
    assertService(budget.rowCount, "BUDGET_EXHAUSTED", "The workspace token budget cannot cover this task.", 409);
    const call = await client.query("insert into crewmori.model_calls(workspace_id,run_id,control_version,reserved_tokens,budget_day,state) values($1,$2,$3,$4,$5,'reserved') returning id", [ref.workspaceId, ref.runId, ref.controlVersion, reserved, budget.rows[0].day]);
    await client.query("update crewmori.agent_runs set state='running',updated_at=now() where workspace_id=$1 and id=$2", [ref.workspaceId, ref.runId]);
    await appendEvent(client, ref.workspaceId, "run.started", `${run.role} is preparing a grounded draft.`, [{ table: "agent_runs", id: ref.runId }]);
    return { input, callId: call.rows[0].id, reserved };
  });
  if (prepared.cached) return prepared.cached;
  // Check immediately before the paid provider call; never resume cancelled work.
  const current = await database().query("select state,control_version from crewmori.agent_runs where workspace_id=$1 and id=$2", [ref.workspaceId, ref.runId]);
  if (current.rows[0]?.state !== "running" || current.rows[0]?.control_version !== ref.controlVersion) {
    await transaction(async (client) => {
      const call = await client.query("update crewmori.model_calls set state='cancelled' where id=$1 and state='reserved' returning *", [prepared.callId]);
      if (call.rowCount) await client.query("update crewmori.usage_budgets set reserved_tokens=reserved_tokens-$2 where workspace_id=$1 and day=$3", [ref.workspaceId, prepared.reserved, call.rows[0].budget_day]);
    });
    throw new ServiceError("RUN_INTERRUPTED", "Task changed before model dispatch.", 409);
  }
  let output: ReasoningOutput;
  try {
    output = await adapter.generate(prepared.input!);
    output = { artifact: artifactSchema.parse(output.artifact), usage: usageSchema.parse(output.usage) };
    assertService(output.usage.inputTokens + output.usage.outputTokens <= prepared.reserved!, "USAGE_BOUND_EXCEEDED", "Provider usage exceeded its reserved bound.", 502);
  } catch (error) {
    await database().query("update crewmori.model_calls set state='unknown' where id=$1 and state='reserved'", [prepared.callId]);
    throw error;
  }
  await transaction(async (client) => {
    const saved = await client.query("update crewmori.model_calls set state='completed',artifact=$2,usage=$3 where id=$1 and state='reserved' returning budget_day", [prepared.callId, JSON.stringify(output.artifact), JSON.stringify(output.usage)]);
    if (saved.rowCount) await client.query("update crewmori.usage_budgets set reserved_tokens=reserved_tokens-$2,consumed_tokens=consumed_tokens+$3 where workspace_id=$1 and day=$4", [ref.workspaceId, prepared.reserved, output.usage.inputTokens + output.usage.outputTokens, saved.rows[0].budget_day]);
  });
  return output;
}

export async function saveRunArtifact(ref: RunReference, output: ReasoningOutput) {
  await transaction(async (client) => {
    await client.query("select id from crewmori.workspaces where id=$1 for update", [ref.workspaceId]);
    const found = await client.query("select * from crewmori.agent_runs where workspace_id=$1 and id=$2 for update", [ref.workspaceId, ref.runId]);
    assertService(found.rowCount && found.rows[0].control_version === ref.controlVersion, "RUN_INTERRUPTED", "Task control changed.", 409);
    const run = found.rows[0];
    if (run.state === "completed") return;
    assertService(run.state === "running", "RUN_INTERRUPTED", "Task is no longer running.", 409);
    await resolveReferences(client, ref.workspaceId, z.array(referenceSchema).parse(run.input_refs), run.role === "promoter");
    await client.query("update crewmori.agent_runs set state='completed',artifact=$3,usage=$4,error_code=null,updated_at=now() where workspace_id=$1 and id=$2", [ref.workspaceId, ref.runId, JSON.stringify(output.artifact), JSON.stringify(output.usage)]);
    await appendEvent(client, ref.workspaceId, "artifact.saved", `${run.role} saved a draft for owner review.`, [{ table: "agent_runs", id: ref.runId }]);
  });
}

const GraphState = Annotation.Root({
  workspaceId: Annotation<string>(), runId: Annotation<string>(), controlVersion: Annotation<number>(),
  artifact: Annotation<Artifact | undefined>(), usage: Annotation<ReasoningOutput["usage"] | undefined>(),
});
export function agentGraph(checkpointer?: BaseCheckpointSaver, adapter: ReasoningAdapter = reasoningAdapter()) {
  return new StateGraph(GraphState)
    .addNode("reason", async (state) => runReasoning(state, adapter))
    .addNode("persist", async (state) => {
      assertService(state.artifact && state.usage, "INVALID_ARTIFACT", "The task has no confirmed output.");
      await saveRunArtifact(state, { artifact: state.artifact, usage: state.usage });
      return {};
    })
    .addEdge(START, "reason").addEdge("reason", "persist").addEdge("persist", END).compile({ checkpointer });
}

export async function recordRunFailure(ref: RunReference, error: unknown) {
  const code = error instanceof ServiceError ? error.code : "PROVIDER_UNAVAILABLE";
  if (["RUN_INTERRUPTED", "WORKSPACE_BUSY"].includes(code)) return;
  await blockRun(ref, code);
}
async function blockRun(ref: RunReference, code: string) {
  await transaction(async (client) => {
    await client.query("select id from crewmori.workspaces where id=$1 for update", [ref.workspaceId]);
    const result = await client.query("update crewmori.agent_runs set state='blocked',error_code=$3,updated_at=now() where workspace_id=$1 and id=$2 and control_version=$4 and state in ('queued','running') returning id", [ref.workspaceId, ref.runId, code, ref.controlVersion]);
    if (result.rowCount) await appendEvent(client, ref.workspaceId, "run.blocked", "Task needs attention before another attempt.", [{ table: "agent_runs", id: ref.runId }]);
  });
}

// A busy workspace is a scheduling condition, not a failure: wait for a free slot,
// then block with a readable reason instead of leaving the run queued forever.
export const BUSY_RETRY_SECONDS = 30;
export const BUSY_RETRY_LIMIT = 30;
export const agentJobSchema = z.object({ workspaceId: z.string().uuid(), runId: z.string().uuid(), controlVersion: z.number().int().positive(), busyAttempt: z.number().int().nonnegative().default(0) });
export async function runAgentJob(data: unknown, invoke: (ref: RunReference) => Promise<unknown>, requeue: (data: z.infer<typeof agentJobSchema>, delaySeconds: number) => Promise<unknown>) {
  const { busyAttempt, ...ref } = agentJobSchema.parse(data);
  try {
    await invoke(ref);
  } catch (error) {
    if (!(error instanceof ServiceError && error.code === "WORKSPACE_BUSY")) {
      if (!(error instanceof ServiceError)) logError("agent.run_failed", error, { workspaceId: ref.workspaceId, runId: ref.runId });
      return recordRunFailure(ref, error);
    }
    if (busyAttempt < BUSY_RETRY_LIMIT) return requeue({ ...ref, busyAttempt: busyAttempt + 1 }, BUSY_RETRY_SECONDS);
    await blockRun(ref, "WORKSPACE_BUSY");
  }
}
