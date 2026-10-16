import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { database, closeDatabase } from "../src/server/db";

async function migrate() {
  const db = database();
  // Session-level lock covers the entire migration set across concurrent deploys.
  const lock = await db.connect();
  try {
    await lock.query("select pg_advisory_lock(17062026)");
    await lock.query("create table if not exists public.crewmori_migrations (name text primary key, sha256 text not null, applied_at timestamptz not null default now())");
    await lock.query("revoke all on public.crewmori_migrations from public, anon, authenticated");
    const files = (await readdir(new URL("../supabase/migrations/", import.meta.url))).filter((name) => name.endsWith(".sql")).sort();
    for (const name of files) {
      const sql = await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");
      const hash = createHash("sha256").update(sql).digest("hex");
      const existing = await lock.query("select sha256 from public.crewmori_migrations where name=$1", [name]);
      if (existing.rowCount) {
        if (existing.rows[0].sha256 !== hash) throw Error(`Applied migration changed: ${name}`);
        continue;
      }
      await lock.query("BEGIN");
      try {
        await lock.query(sql);
        await lock.query("insert into public.crewmori_migrations(name,sha256) values($1,$2)", [name, hash]);
        await lock.query("COMMIT");
      } catch (error) { await lock.query("ROLLBACK"); throw error; }
      process.stdout.write(`Applied ${name}\n`);
    }
  } finally {
    await lock.query("select pg_advisory_unlock(17062026)");
    lock.release();
    await closeDatabase();
  }
}
migrate().catch(() => { process.stderr.write("Migration failed. Check database access and migration history.\n"); process.exitCode = 1; });
