import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { OwnerActor } from "./contracts";
import { a, s, type Entity } from "../lib/types";
import { database, transaction } from "./db";
import { assertService } from "./errors";
import { appendEvent, lockWorkspace } from "./repository";
import { privateStorage } from "./files";
import { embedText } from "./providers/embeddings";
import { rateLimit } from "./domain";

export function chunkText(text: string, size = 1600, overlap = 200): string[] {
  const cleaned = text.replace(/\u0000/g, "").trim();
  const chunks: string[] = [];
  for (let offset = 0; offset < cleaned.length && chunks.length < 40; offset += size - overlap) chunks.push(cleaned.slice(offset, offset + size));
  return chunks;
}
export async function enqueueKnowledge(client: PoolClient, workspaceId: string, source: Entity, retry = false) {
  if (source.archived) { await client.query("delete from crewmori.knowledge_chunks where workspace_id=$1 and source_id=$2", [workspaceId, source.id]); return; }
  const inserted = await client.query("insert into crewmori.knowledge_jobs(workspace_id,source_id,source_version) values($1,$2,$3) on conflict(workspace_id,source_id,source_version) do nothing returning id", [workspaceId, source.id, source.version]);
  let job = inserted.rows[0];
  if (!job && retry) job = (await client.query("update crewmori.knowledge_jobs set state='queued',error_code=null where workspace_id=$1 and source_id=$2 and source_version=$3 and state in ('failed','superseded') returning id", [workspaceId, source.id, source.version])).rows[0];
  if (job) await client.query("insert into crewmori.outbox(workspace_id,kind,reference_id,deduplication_key) values($1,'knowledge.ingest',$2,$3)", [workspaceId, job.id, `knowledge:${job.id}:${randomUUID()}`]);
}
async function extractSource(workspaceId: string, source: Entity): Promise<string> {
  if (s(source.content).trim()) return s(source.content).slice(0, 56000);
  const attachmentId = a<string>(source.attachment_ids)[0];
  assertService(attachmentId, "SOURCE_TEXT_REQUIRED", "Add source text or upload a text-based PDF or TXT file.", 422);
  const attachment = (await database().query("select data from crewmori.records where workspace_id=$1 and collection='attachments' and id=$2", [workspaceId, attachmentId])).rows[0];
  const file = (await database().query("select * from crewmori.files where workspace_id=$1 and id::text=$2 and state='available'", [workspaceId, s(attachment?.data?.storage_locator)])).rows[0];
  assertService(file, "FILE_UNAVAILABLE", "This source file is unavailable.", 404);
  const downloaded = await privateStorage().bucket.download(file.object_path);
  assertService(!downloaded.error && downloaded.data, "FILE_UNAVAILABLE", "This source file could not be read.", 502);
  if (file.mime_type === "text/plain") return (await downloaded.data.text()).slice(0, 56000);
  assertService(file.mime_type === "application/pdf", "SOURCE_TEXT_REQUIRED", "Add a written description for this image before indexing it.", 422);
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loading = getDocument({ data: new Uint8Array(await downloaded.data.arrayBuffer()), useSystemFonts: true, useWorkerFetch: false });
  const document = await loading.promise;
  try {
    assertService(document.numPages <= 80, "PDF_TOO_LONG", "Choose a PDF with at most 80 pages.", 422);
    let content = "";
    for (let page = 1; page <= document.numPages && content.length < 56000; page++) {
      const text = await (await document.getPage(page)).getTextContent();
      content += text.items.map((item) => "str" in item ? item.str : "").join(" ") + "\n";
    }
    assertService(content.trim(), "SOURCE_TEXT_REQUIRED", "This PDF has no selectable text. Add a written summary.", 422);
    return content.slice(0, 56000);
  } finally { await loading.destroy(); }
}
export async function ingestKnowledge(jobId: string, embed: typeof embedText = embedText) {
  const job = await transaction(async (client) => {
    const item = (await client.query("select * from crewmori.knowledge_jobs where id=$1", [jobId])).rows[0];
    if (!item || item.state !== "queued") return null;
    await client.query("select id from crewmori.workspaces where id=$1 for update", [item.workspace_id]);
    const claimed = await client.query("update crewmori.knowledge_jobs set state='running' where id=$1 and state='queued' returning id", [jobId]);
    if (!claimed.rowCount) return null;
    return item;
  });
  if (!job) return;
  try {
    await transaction(async (client) => { await rateLimit(client, `knowledge:${job.workspace_id}`, 30, 86400); });
    const saved = (await database().query("select data,id,version from crewmori.records where workspace_id=$1 and collection='sources' and id=$2", [job.workspace_id, job.source_id])).rows[0];
    assertService(saved && saved.version === job.source_version && !saved.data.archived, "SOURCE_CHANGED", "The source changed before extraction.", 409);
    const source: Entity = { ...saved.data, id: saved.id, version: saved.version };
    const text = await extractSource(job.workspace_id, source), chunks = chunkText(text);
    assertService(chunks.length, "SOURCE_TEXT_REQUIRED", "Add source text before indexing.", 422);
    const embedded: Array<{ content: string; values: number[]; model: string; dimensions: number }> = [];
    for (const content of chunks) embedded.push({ content, ...await embed(content) });
    await transaction(async (client) => {
      await client.query("select id from crewmori.workspaces where id=$1 for update", [job.workspace_id]);
      const current = (await client.query("select version,data from crewmori.records where workspace_id=$1 and collection='sources' and id=$2", [job.workspace_id, job.source_id])).rows[0];
      assertService(current?.version === job.source_version && !current.data.archived, "SOURCE_CHANGED", "The source changed during indexing.", 409);
      const version = current.version + 1;
      await client.query("update crewmori.records set version=$3,data=data || $4::jsonb where workspace_id=$1 and collection='sources' and id=$2", [job.workspace_id, job.source_id, version, JSON.stringify({ extracted_text: text, extraction_status: "indexed", status: "ready", indexed_at: new Date().toISOString(), chunk_count: embedded.length })]);
      await client.query("delete from crewmori.knowledge_chunks where workspace_id=$1 and source_id=$2", [job.workspace_id, job.source_id]);
      for (const [position, chunk] of embedded.entries()) await client.query("insert into crewmori.knowledge_chunks(workspace_id,source_id,source_version,position,content,embedding,model,dimensions) values($1,$2,$3,$4,$5,$6,$7,$8)", [job.workspace_id, job.source_id, version, position, chunk.content, chunk.values, chunk.model, chunk.dimensions]);
      await client.query("update crewmori.knowledge_jobs set state='completed' where id=$1", [jobId]);
      await appendEvent(client, job.workspace_id, "knowledge.indexed", "Source text was extracted and indexed for retrieval.", [{ table: "sources", id: job.source_id, version }]);
    });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "INDEXING_FAILED";
    await transaction(async (client) => {
      await client.query("select id from crewmori.workspaces where id=$1 for update", [job.workspace_id]);
      await client.query("update crewmori.knowledge_jobs set state=$2,error_code=$3 where id=$1", [jobId, code === "SOURCE_CHANGED" ? "superseded" : "failed", code]);
      await appendEvent(client, job.workspace_id, "knowledge.blocked", "Source indexing needs attention. Check the source and provider configuration before retrying.", [{ table: "sources", id: job.source_id }]);
    });
  }
}
export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) return 0;
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2; }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}
export async function searchKnowledge(actor: OwnerActor, query: string, semantic = true) {
  assertService(query.trim().length >= 2 && query.length <= 2000, "INVALID_QUERY", "Enter a search of 2–2,000 characters.", 422);
  const rows = await transaction(async (client) => {
    await lockWorkspace(client, actor);
    await rateLimit(client, `search:${actor.workspaceId}`, 200, 86400);
    return (await client.query("select c.*,r.data->>'label' as title,ts_rank(to_tsvector('simple',c.content),plainto_tsquery('simple',$2)) as lexical from crewmori.knowledge_chunks c join crewmori.records r on r.workspace_id=c.workspace_id and r.collection='sources' and r.id=c.source_id and r.version=c.source_version where c.workspace_id=$1 and coalesce((r.data->>'archived')::boolean,false)=false order by lexical desc limit 2000", [actor.workspaceId, query])).rows;
  });
  if (!rows.length) return [];
  const vector = semantic ? await embedText(query) : null;
  return rows.filter((row) => !vector || (row.model === vector.model && row.dimensions === vector.dimensions)).map((row) => ({ sourceId: row.source_id as string, version: row.source_version as number, title: s(row.title), text: row.content as string, score: vector ? cosine(vector.values, row.embedding) : Number(row.lexical) })).sort((a, b) => b.score - a.score).slice(0, 6);
}
