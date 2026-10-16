import { mkdtemp, rm, realpath, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";

// Always creates a disposable cluster. Never accepts an existing DATABASE_URL.
const directory = await mkdtemp(join(tmpdir(), "crewmori-db-test-"));
const data = join(directory, "data");
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`${command} failed: ${result.stderr || result.stdout}`);
  return result;
}
let started = false;
let pgBin;
try {
  pgBin = process.env.PG_BIN || dirname(await realpath(run("which", ["postgres"]).stdout.trim()));
  const server = createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  run(join(pgBin, "initdb"), ["-D", data, "--auth=trust", "--username=postgres", "--encoding=UTF8", "--no-locale"]);
  run(join(pgBin, "pg_ctl"), ["-D", data, "-l", join(directory, "postgres.log"), "-o", `-h 127.0.0.1 -p ${port} -k ${directory}`, "-w", "start"]);
  started = true;
  const tests = (await readdir("tests/db")).filter((name) => name.endsWith(".test.ts")).map((name) => `tests/db/${name}`);
  const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...tests], {
    stdio: "inherit", shell: false,
    env: { ...process.env, DATABASE_URL: `postgresql://postgres@127.0.0.1:${port}/postgres`, CREWMORI_DB_TEST: "disposable" },
  });
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (started) run(join(pgBin, "pg_ctl"), ["-D", data, "-m", "immediate", "-w", "stop"]);
  await rm(directory, { recursive: true, force: true });
}
