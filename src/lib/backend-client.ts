import type { Role } from "../server/contracts";

export class BackendError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) { super(message); }
}
/** HTTP adapter for the frontend migration. It never imports server implementation. */
export class BackendClient {
  constructor(private workspaceId?: string, private buyerToken?: string) {}
  async request<T>(path: string, input?: unknown, method = input === undefined ? "GET" : "POST"): Promise<T> {
    if (!path.startsWith("/api/") || path.includes("\\") || path.includes("..")) throw new Error("Use an application API path.");
    const headers: Record<string, string> = {};
    if (input !== undefined) headers["content-type"] = "application/json";
    if (this.workspaceId) headers["x-workspace-id"] = this.workspaceId;
    if (this.buyerToken) headers.authorization = `Bearer ${this.buyerToken}`;
    const response = await fetch(path, { method, headers, credentials: "same-origin", cache: "no-store", body: input === undefined ? undefined : JSON.stringify(input) });
    const data = await response.json();
    if (!response.ok) throw new BackendError(data.error?.code || "REQUEST_FAILED", data.error?.message || "The request failed.", response.status);
    return data as T;
  }
  startTask(role: Role, instruction: string, references: Array<{ table: string; id: string; version: number }>, idempotencyKey: string) {
    return this.request<{ id: string; state: string; control_version: number }>("/api/tasks", { role, instruction, references, idempotencyKey });
  }
  activity(after = 0) { return this.request<{ events: unknown[]; nextSequence: number; hasMore: boolean }>(`/api/activity?after=${after}`); }
}
