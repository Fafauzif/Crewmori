import { database } from "./db";
import { integrationStatus } from "./config";

// An undispatched outbox row older than this means the worker is not relaying jobs.
export const OUTBOX_STALL_SECONDS = 300;
export async function readiness(source = database) {
  if (!integrationStatus().database.configured) return { ok: false, database: "not_configured" as const };
  try {
    const started = Date.now();
    const row = (await source().query("select extract(epoch from now()-min(created_at))::int as age from crewmori.outbox where dispatched_at is null")).rows[0];
    const outboxAgeSeconds = row?.age === null || row?.age === undefined ? 0 : Number(row.age);
    const worker = outboxAgeSeconds > OUTBOX_STALL_SECONDS ? "stalled" as const : "ok" as const;
    return { ok: worker === "ok", database: "ok" as const, databaseLatencyMs: Date.now() - started, worker, outboxAgeSeconds };
  } catch {
    return { ok: false, database: "unavailable" as const };
  }
}
