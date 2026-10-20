// Structured, single-line error logs. Provider and driver messages can embed credentials,
// so connection strings and secret-looking parameters are redacted before writing.
export function redact(text: string): string {
  return text
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/g, "Bearer <redacted>")
    .replace(/\b([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi, "$1<redacted>@")
    .replace(/\b(api[_-]?key|secret|token|password)(["']?\s*[:=]\s*["']?)[^\s"'&,]+/gi, "$1$2<redacted>");
}

export interface ErrorDetails { name: string; message?: string; code?: string; constraint?: string; table?: string; stack?: string[] }
export function errorDetails(error: unknown): ErrorDetails {
  if (!(error instanceof Error)) return { name: typeof error };
  const pg = error as Error & { code?: unknown; constraint?: unknown; table?: unknown };
  return {
    name: error.name,
    message: redact(error.message).slice(0, 500),
    ...(typeof pg.code === "string" ? { code: pg.code } : {}),
    ...(typeof pg.constraint === "string" ? { constraint: pg.constraint } : {}),
    ...(typeof pg.table === "string" ? { table: pg.table } : {}),
    ...(error.stack ? { stack: redact(error.stack).split("\n").slice(1, 8).map((line) => line.trim()) } : {}),
  };
}

export function logError(event: string, error: unknown, context: Record<string, unknown> = {}) {
  process.stderr.write(`${JSON.stringify({ level: "error", event, time: new Date().toISOString(), ...context, error: errorDetails(error) })}\n`);
}
