import { Pool, type PoolClient } from "pg";
import { requireConfiguration, runtimeConfig } from "./config";

let pool: Pool | undefined;
export function database(): Pool {
  if (!pool) {
    const { DATABASE_URL } = requireConfiguration(["DATABASE_URL"]);
    pool = new Pool({ connectionString: DATABASE_URL, max: runtimeConfig().DATABASE_POOL_SIZE, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000, application_name: "crewmori" });
    // Do not print connection errors: provider messages can contain credentials.
    pool.on("error", () => process.stderr.write("Crewmori database connection interrupted.\n"));
  }
  return pool;
}
export async function transaction<T>(work: (client: PoolClient) => Promise<T>, source = database()): Promise<T> {
  const client = await source.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '15s'");
    await client.query("SET LOCAL lock_timeout = '10s'");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
export async function closeDatabase() { await pool?.end(); pool = undefined; }
