import { PgBoss } from "pg-boss";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { z } from "zod";
import { database, transaction, closeDatabase } from "../src/server/db";
import { integrationStatus, requireConfiguration, runtimeConfig } from "../src/server/config";
import { agentGraph, recordRunFailure } from "../src/server/agent-runtime";
import { ServiceError } from "../src/server/errors";

import { ingestKnowledge } from "../src/server/knowledge";
import { privateStorage } from "../src/server/files";
import { runMaintenance } from "../src/server/maintenance";

let activeBoss: PgBoss | undefined;

async function main() {
  if (!runtimeConfig().enabled) throw Error("Enable CREWMORI_BACKEND_ENABLED before starting the worker.");
  const { DATABASE_URL } = requireConfiguration(["DATABASE_URL"]);
  const boss = new PgBoss({ connectionString: DATABASE_URL, schema: "crewmori_jobs", max: 3 });
  activeBoss = boss;
  boss.on("error", () => process.stderr.write("Crewmori queue error. Inspect worker health and database access.\n"));
  const checkpointer = new PostgresSaver(database(), undefined, { schema: "crewmori_checkpoints" });
  await checkpointer.setup();
  await boss.start();
  await boss.createQueue("agent.run", { retryLimit: 2, retryDelay: 10, retryBackoff: true, expireInSeconds: 240 });
  await boss.createQueue("knowledge.ingest", { retryLimit: 0, expireInSeconds: 600 });
  await boss.work("knowledge.ingest", { localConcurrency: 1 }, async (jobs) => { for (const job of jobs) await ingestKnowledge(z.object({ jobId: z.uuid() }).parse(job.data).jobId); });
  await boss.createQueue("maintenance.sweep", { retryLimit: 0, expireInSeconds: 240 });
  // Storage cleanup only runs when the private bucket is configured for this worker.
  const removeObjects = integrationStatus().storage.configured ? (paths: string[]) => privateStorage().bucket.remove(paths) : undefined;
  await boss.work("maintenance.sweep", { localConcurrency: 1 }, async () => {
    const { failed } = await runMaintenance(removeObjects);
    if (failed.length) process.stderr.write(`Crewmori maintenance incomplete: ${failed.join(", ")}.\n`);
  });
  await boss.schedule("maintenance.sweep", "*/5 * * * *");
  const graph = agentGraph(checkpointer);
  await boss.work("agent.run", { localConcurrency: 2 }, async (jobs) => {
    for (const job of jobs) {
      const input = z.object({ workspaceId: z.string().uuid(), runId: z.string().uuid(), controlVersion: z.number().int().positive() }).parse(job.data);
      try {
        await graph.invoke(input, { configurable: { thread_id: `${input.workspaceId}:${input.runId}:${input.controlVersion}` } });
      } catch (error) {
        await recordRunFailure(input, error);
        if (error instanceof ServiceError && error.code === "WORKSPACE_BUSY") throw error;
      }
    }
  });
  let relaying = false, stopping = false;
  const relay = async () => {
    if (relaying || stopping) return;
    relaying = true;
    try {
      await transaction(async (client) => {
        const knowledge = await client.query("select * from crewmori.outbox where dispatched_at is null and kind='knowledge.ingest' order by created_at limit 10 for update skip locked");
        for (const item of knowledge.rows) {
          await boss.send("knowledge.ingest", { jobId: item.reference_id }, { singletonKey: item.deduplication_key, singletonSeconds: 86400 });
          await client.query("update crewmori.outbox set dispatched_at=now() where id=$1", [item.id]);
        }
        const pending = await client.query("select o.*,r.control_version from crewmori.outbox o join crewmori.agent_runs r on r.workspace_id=o.workspace_id and r.id=o.reference_id where o.dispatched_at is null and o.kind='agent.run' order by o.created_at limit 20 for update of o skip locked");
        for (const item of pending.rows) {
          const version = Number(item.deduplication_key.split(":").at(-1));
          await boss.send("agent.run", { workspaceId: item.workspace_id, runId: item.reference_id, controlVersion: version }, { singletonKey: item.deduplication_key, singletonSeconds: 86400 });
          await client.query("update crewmori.outbox set dispatched_at=now() where id=$1", [item.id]);
        }
      });
    } catch { process.stderr.write("Crewmori outbox relay will retry.\n"); }
    finally { relaying = false; }
  };
  const timer = setInterval(() => void relay(), 1000);
  await relay();
  process.stdout.write("Crewmori worker ready.\n");
  const stop = async () => {
    if (stopping) return;
    stopping = true; clearInterval(timer);
    await boss.stop({ graceful: true, timeout: 120000 });
    while (relaying) await new Promise((resolve) => setTimeout(resolve, 50));
    await closeDatabase();
  };
  process.once("SIGTERM", () => void stop());
  process.once("SIGINT", () => void stop());
}
main().catch(async () => {
  process.stderr.write("Worker startup failed. Check backend configuration and migrations.\n");
  await activeBoss?.stop({ graceful: false }).catch(() => {});
  await closeDatabase(); process.exitCode = 1;
});
