import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";

const socket = createServer();
await new Promise((resolve, reject) => { socket.once("error", reject); socket.listen(0, "127.0.0.1", resolve); });
const port = socket.address().port;
await new Promise((resolve) => socket.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  env: { ...process.env, CREWMORI_BACKEND_ENABLED: "false", APP_URL: origin }, stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
server.stdout.on("data", (data) => { logs = (logs + data).slice(-2000); });
server.stderr.on("data", (data) => { logs = (logs + data).slice(-2000); });
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw Error(`Server exited before readiness: ${logs}`);
    try { ready = (await fetch(`${origin}/api/health`)).ok; } catch {}
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, "Production server did not become ready.");
  assert.equal((await (await fetch(`${origin}/api/health`)).json()).backend, "disabled");
  assert.equal((await fetch(`${origin}/api/tasks`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}" })).status, 503);
  assert.equal((await fetch(`${origin}/api/activity`)).status, 503);
  assert.equal((await fetch(`${origin}/api/does-not-exist`)).status, 404);
  assert.equal((await fetch(`${origin}/app/home`)).status, 200);
  console.log("HTTP smoke passed: health, disabled mutations/queries, unknown API, and existing frontend route.");
} finally {
  if (server.exitCode === null) { const ended = once(server, "exit"); server.kill("SIGTERM"); await ended; }
}
