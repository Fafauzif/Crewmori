import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";

// Production UI tests with request-controlled fixtures. No DB, provider or live credentials.
const socket = createServer();
await new Promise(resolve => socket.listen(0, "127.0.0.1", resolve));
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const env = { ...process.env, CREWMORI_UX_TEST: "true", CREWMORI_E2E_ORIGIN: origin, CREWMORI_BACKEND_ENABLED: "true", APP_URL: origin };
// Even when invoked from a configured checkout, this runner must never use live services.
for (const key of ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_PICKER_API_KEY", "TOKEN_ENCRYPTION_KEY", "GEMINI_API_KEY", "ANTHROPIC_API_KEY", "ELEVENLABS_API_KEY", "ELEVENLABS_AGENT_ID", "ELEVENLABS_WEBHOOK_SECRET", "ELEVENLABS_TOOL_SECRET", "EXA_API_KEY", "RESEND_API_KEY", "RESEND_FROM", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "PAYMENT_SANDBOX_SECRET"]) env[key] = "";
const logs = [];
const web = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { env, stdio: ["ignore", "pipe", "pipe"] });
for (const stream of [web.stdout, web.stderr]) stream.on("data", chunk => { logs.push(String(chunk)); if (logs.length > 50) logs.shift(); });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { ready = (await fetch(`${origin}/api/health`)).ok; } catch { /* not listening yet */ }
    if (ready) break;
    if (web.exitCode !== null) throw Error("Production server exited before the UI tests started.");
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw Error("Production server did not start. Run npm run build before test:ux.");
  const tests = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--config", "playwright.ux.config.ts", ...process.argv.slice(2)], { env, stdio: "inherit" });
  const [code] = await once(tests, "exit"); process.exitCode = code ?? 1;
  if (code) process.stderr.write(logs.join("").slice(-4000));
} catch (error) { process.stderr.write(`${error.message}\n${logs.join("").slice(-4000)}`); process.exitCode = 1; }
finally { if (web.exitCode === null) { const done = once(web, "exit"); web.kill("SIGTERM"); await done; } }
