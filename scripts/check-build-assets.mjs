import { readdir, readFile, access } from "node:fs/promises";
import { join } from "node:path";

// A successful compile is insufficient if its browser manifests refer to absent chunks.
const root = ".next";
await access(join(root, "BUILD_ID"));
const paths = await readdir(join(root, "server"), { recursive: true });
const chunks = new Set();
for (const path of paths.filter(path => path.endsWith("client-reference-manifest.js"))) {
  const manifest = await readFile(join(root, "server", path), "utf8");
  for (const match of manifest.matchAll(/static\/chunks\/[A-Za-z0-9_.-]+\.js/g)) chunks.add(match[0]);
}
const missing = [];
for (const chunk of chunks) { try { await access(join(root, chunk)); } catch { missing.push(chunk); } }
if (missing.length) { console.error(`Build manifests reference ${missing.length} missing browser chunk(s):\n${missing.join("\n")}\nStop the old local server and make a clean production build before testing.`); process.exitCode = 1; }
else console.log(`Verified ${chunks.size} referenced browser chunks in the production build.`);
