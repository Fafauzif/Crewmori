import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ConfigurationError, runtimeConfig } from "./config";
import { ServiceError, assertService } from "./errors";
import { assertSameOrigin } from "./security";
import { logError } from "./log";

export async function rawBody(request: Request, limit = 1_000_000): Promise<string> {
  const bytes = await bodyBytes(request, limit);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
export async function bodyBytes(request: Request, limit: number): Promise<Uint8Array> {
  assertService(Number(request.headers.get("content-length") || 0) <= limit, "BODY_TOO_LARGE", "Request exceeds the size limit.", 413);
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) { await reader.cancel(); throw new ServiceError("BODY_TOO_LARGE", "Request exceeds the size limit.", 413); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function jsonBody<T>(request: Request, schema: z.ZodType<T>) {
  assertService(request.headers.get("content-type")?.split(";")[0] === "application/json", "INVALID_CONTENT_TYPE", "Use application/json.", 415);
  let json: unknown;
  try { json = JSON.parse(await rawBody(request)); }
  catch (error) { if (error instanceof ServiceError) throw error; throw new ServiceError("INVALID_JSON", "Request body is not valid JSON.", 422); }
  return schema.parse(json);
}
export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}
export async function api(request: Request, action: () => Promise<Response>, options: { webhook?: boolean } = {}): Promise<Response> {
  try {
    const config = runtimeConfig();
    assertService(config.enabled, "BACKEND_DISABLED", "The backend is not enabled in this deployment.", 503);
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !options.webhook) assertSameOrigin(request, config.APP_URL);
    return await action();
  } catch (error) {
    // Variable names stay in server logs; anonymous callers only learn that the capability is unavailable.
    if (error instanceof ConfigurationError) {
      process.stderr.write(`${JSON.stringify({ level: "warn", event: "config.missing", route: new URL(request.url).pathname, keys: error.keys })}\n`);
      return json({ error: { code: "NOT_CONFIGURED", message: "This capability is not set up in this deployment yet." } }, 503);
    }
    if (error instanceof ServiceError) return json({ error: { code: error.code, message: error.message } }, error.status);
    if (error instanceof z.ZodError) return json({ error: { code: "VALIDATION_ERROR", message: "Check the submitted fields.", fields: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) } }, 422);
    // Malformed identifiers that slip past route validation are client errors, not server faults.
    if (error instanceof URIError || (error as { code?: unknown })?.code === "22P02") return json({ error: { code: "VALIDATION_ERROR", message: "Check the submitted fields." } }, 422);
    const requestId = randomUUID();
    logError("request.failed", error, { requestId, method: request.method, route: new URL(request.url).pathname });
    return json({ error: { code: "INTERNAL_ERROR", message: "The request could not be completed.", requestId } }, 500);
  }
}
