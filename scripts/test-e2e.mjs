import { mkdtemp, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { Pool } from "pg";
import { mockServices } from "../tests/e2e/mock-services.mjs";

const directory = await mkdtemp(join(tmpdir(), "crewmori-e2e-")), data = join(directory, "data");
let pgBin, started = false, services, web, worker;
const logs = [];
const run = (command, args, env) => {
  const result = spawnSync(command, args, { encoding: "utf8", env: env || process.env });
  if (result.error || result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  return result.stdout;
};
async function port() { const socket = createServer(); await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve)); const port = socket.address().port; await new Promise((resolve) => socket.close(resolve)); return port; }
function child(args, env) {
  const process = spawn(globalThis.process.execPath, args, { env, stdio: ["ignore", "pipe", "pipe"] });
  for (const output of [process.stdout, process.stderr]) output.on("data", (data) => { logs.push(data.toString()); if (logs.length > 100) logs.shift(); });
  return process;
}
try {
  pgBin = process.env.PG_BIN || dirname(await realpath(run("which", ["postgres"]).trim()));
  const dbPort = await port(), webPort = await port();
  run(join(pgBin, "initdb"), ["-D", data, "--auth=trust", "--username=postgres", "--encoding=UTF8", "--no-locale"]);
  run(join(pgBin, "pg_ctl"), ["-D", data, "-l", join(directory, "postgres.log"), "-o", `-h 127.0.0.1 -p ${dbPort} -k ${directory}`, "-w", "start"]); started = true;
  const connectionString = `postgresql://postgres@127.0.0.1:${dbPort}/postgres`, db = new Pool({ connectionString });
  await db.query("create role anon nologin; create role authenticated nologin; create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;"); await db.end();
  services = await mockServices();
  const origin = `http://127.0.0.1:${webPort}`;
  const env = { ...process.env, CREWMORI_DB_TEST: "disposable", CREWMORI_E2E_ORIGIN: origin, CREWMORI_BACKEND_ENABLED: "true", APP_URL: origin, DATABASE_URL: connectionString, SUPABASE_URL: services.origin, SUPABASE_PUBLISHABLE_KEY: "disposable-publishable", SUPABASE_SECRET_KEY: "disposable-secret", STORAGE_BUCKET: "crewmori-private", ANTHROPIC_API_KEY: "disposable-anthropic", ANTHROPIC_MODEL: "controlled-claude", ANTHROPIC_BASE_URL: services.origin, GEMINI_API_KEY: "disposable-gemini", GEMINI_MODEL: "controlled-gemini", GEMINI_EMBEDDING_MODEL: "controlled-embedding", GOOGLE_GEMINI_BASE_URL: services.origin, AGENT_DAILY_TOKEN_BUDGET: "200000", PAYMENT_PROVIDER: "sandbox", PAYMENT_SANDBOX_SECRET: "disposable-sandbox-secret" };
  run(process.execPath, ["--import", "tsx", "scripts/migrate.ts"], env);
  web = child(["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(webPort)], env);
  worker = child(["--import", "tsx", "scripts/worker.ts"], env);
  let ready = false;
  for (let attempt = 0; attempt < 150; attempt++) { try { ready = (await fetch(`${origin}/api/health`)).ok; } catch {} if (ready) break; if (web.exitCode !== null) throw new Error("Production server exited."); await new Promise((resolve) => setTimeout(resolve, 100)); }
  if (!ready) throw new Error("Production server did not become ready.");
  const tests = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test"], { env, stdio: "inherit" });
  const [exitCode] = await once(tests, "exit"); process.exitCode = exitCode ?? 1;
  if (process.exitCode) process.stderr.write(logs.join("").slice(-6000));
} catch (error) { process.stderr.write(`${error.message}\n${logs.join("").slice(-6000)}`); process.exitCode = 1; }
finally {
  for (const service of [worker, web]) if (service && service.exitCode === null) { const done = once(service, "exit"); service.kill("SIGTERM"); await done; }
  await services?.close();
  if (started) run(join(pgBin, "pg_ctl"), ["-D", data, "-m", "immediate", "-w", "stop"]);
  await rm(directory, { recursive: true, force: true });
}
