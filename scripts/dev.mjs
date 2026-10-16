import { spawn } from "node:child_process";
const args = process.argv.slice(2);
const port = args.includes("--port")
  ? args[args.lastIndexOf("--port") + 1]
  : "4173";
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "0.0.0.0",
    "--port",
    port,
  ],
  { stdio: "inherit" },
);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code) => process.exit(code || 0));
