import type { Role } from "../server/contracts";

export class BackendError extends Error {
  constructor(readonly code: string, message: string, readonly status: number, readonly requestId?: string, readonly outcomeUnknown = false) { super(message); this.name = "BackendError"; }
}
export type RequestOptions = { signal?: AbortSignal; timeoutMs?: number };
/** Only a definitive rejection may release the intent's retry key. Network status 0 is uncertain. */
export const isDefinitiveFailure = (error: unknown) => error instanceof BackendError
  && error.status >= 400 && error.status < 500 && !error.outcomeUnknown
  && !["DISPATCH_REVIEW_REQUIRED", "DISPATCH_FINALIZATION_REQUIRED"].includes(error.code);
const errorMessage = (status: number) => status === 401
  ? "Your session expired. Sign in to continue."
  : status === 429 ? "Too many requests. Wait a moment, then try again."
    : status >= 500 ? "The service could not respond. Try again in a moment."
      : "This request could not be completed. Please try again.";
/** Same-origin HTTP adapter. Reads can be cancelled; uncertain writes are never retried here. */
export class BackendClient {
  constructor(private workspaceId?: string, private buyerToken?: string) {}
  async request<T>(path: string, input?: unknown, method = input === undefined ? "GET" : "POST", options: RequestOptions = {}): Promise<T> {
    if (!path.startsWith("/api/") || path.includes("\\") || path.includes("..")) throw new Error("Use an application API path.");
    const reading = ["GET", "HEAD"].includes(method.toUpperCase());
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    if (options.signal?.aborted) controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? (reading ? 20_000 : 45_000));
    try {
      const headers: Record<string, string> = { accept: "application/json" };
      if (input !== undefined) headers["content-type"] = "application/json";
      if (this.workspaceId) headers["x-workspace-id"] = this.workspaceId;
      if (this.buyerToken) headers.authorization = `Bearer ${this.buyerToken}`;
      const response = await fetch(path, { method, headers, credentials: "same-origin", cache: "no-store", signal: controller.signal, body: input === undefined ? undefined : JSON.stringify(input) });
      const body = await response.text();
      let data: unknown;
      try { data = body ? JSON.parse(body) : undefined; }
      catch {
        // Do not expose proxy HTML, provider bodies, or JSON parser details to the interface.
        throw new BackendError(response.ok ? "INVALID_RESPONSE" : "REQUEST_FAILED", response.ok ? "The service returned an unreadable response. Please try again." : errorMessage(response.status), response.status, undefined, !reading);
      }
      const error = data && typeof data === "object" && "error" in data ? (data as { error?: { code?: string; message?: string; requestId?: string } }).error : undefined;
      if (!response.ok) throw new BackendError(error?.code || "REQUEST_FAILED", error?.message || errorMessage(response.status), response.status, error?.requestId);
      if (data === undefined && response.status !== 204) throw new BackendError("INVALID_RESPONSE", "The service returned an empty response. Please try again.", response.status, undefined, !reading);
      return data as T;
    } catch (error) {
      if (error instanceof BackendError) throw error;
      if (controller.signal.aborted) {
        const message = reading
          ? timedOut ? "This is taking longer than expected. Please try again." : "The request was cancelled."
          : "The connection ended before the result was confirmed. Retry the same action to check its result; do not create a second action.";
        throw new BackendError(timedOut ? "REQUEST_TIMEOUT" : "REQUEST_ABORTED", message, 0, undefined, !reading);
      }
      throw new BackendError("CONNECTION_INTERRUPTED", reading ? "Could not connect. Check your connection and try again." : "The result has not been confirmed. Retry the same action to check its result.", 0, undefined, !reading);
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }
  }
  startTask(role: Role, instruction: string, references: Array<{ table: string; id: string; version: number }>, idempotencyKey: string) {
    return this.request<{ id: string; state: string; control_version: number }>("/api/tasks", { role, instruction, references, idempotencyKey });
  }
  activity(after = 0) { return this.request<{ events: unknown[]; nextSequence: number; hasMore: boolean }>(`/api/activity?after=${after}`); }
}
