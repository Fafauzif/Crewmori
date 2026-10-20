import { Pool, type PoolClient } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { requireConfiguration, runtimeConfig } from "./config";

let pool: Pool | undefined;
export function database(): Pool {
  if (!pool) {
    const { DATABASE_URL } = requireConfiguration(["DATABASE_URL"]);
    // Serverless instances scale out, so each keeps a small pool unless DATABASE_POOL_SIZE says otherwise.
    const max = process.env.VERCEL && !process.env.DATABASE_POOL_SIZE ? 2 : runtimeConfig().DATABASE_POOL_SIZE;
    // statement_timeout also bounds queries that run outside transaction(), which sets its own tighter limit.
    pool = new Pool({ connectionString: DATABASE_URL, max, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000, statement_timeout: 30000, application_name: "crewmori" });
    // Do not print connection errors: provider messages can contain credentials.
    pool.on("error", () => process.stderr.write("Crewmori database connection interrupted.\n"));
    // Fluid compute: release idle connections before an instance is suspended.
    if (process.env.VERCEL) attachDatabasePool(pool);
  }
  return pool;
}
// Snapshot transactions read one consistent view without taking the workspace write lock.
export async function transaction<T>(work: (client: PoolClient) => Promise<T>, source = database(), snapshot = false): Promise<T> {
  const client = await source.connect();
  // A connection whose ROLLBACK failed is destroyed instead of returning to the pool.
  let broken: Error | undefined;
  try {
    // One round trip: hosted databases add network latency to every statement.
    await client.query(`${snapshot ? "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" : "BEGIN"}; SET LOCAL statement_timeout = '15s'; SET LOCAL lock_timeout = '10s'`);
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    // Keep the original failure; a rollback error only says the connection is unusable.
    await client.query("ROLLBACK").catch((rollback: unknown) => { broken = rollback instanceof Error ? rollback : Error("ROLLBACK failed"); });
    throw error;
  } finally { client.release(broken); }
}
export async function closeDatabase() { await pool?.end(); pool = undefined; }
