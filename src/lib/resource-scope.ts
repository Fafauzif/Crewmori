import type { Result, StoreState } from "./types";
import { emptyState } from "./workspace-state";

export type ResourceScope = { key: string; kind: "owner" | "buyer" | "profile" | "session" | "passive"; id?: string; version?: string };
/** Owner navigation shares a scope. Other audiences must never reuse its projection. */
export function resourceScope(path: string, version = ""): ResourceScope {
  if (path === "/onboarding" || /^\/app(?:\/|$)/.test(path)) return { key: "owner", kind: "owner" };
  const buyer = /^\/(?:buyer|inquiry)\/([^/]+)/.exec(path);
  if (buyer) return { key: `buyer:${buyer[1]}:${version}`, kind: "buyer", id: buyer[1], version };
  const profile = /^\/u\/([^/]+)/.exec(path);
  if (profile) return { key: `profile:${profile[1]}`, kind: "profile", id: profile[1] };
  if (path === "/" || path.startsWith("/auth/")) return { key: "session", kind: "session" };
  return { key: `passive:${path}`, kind: "passive" };
}
export const ownerIdentity = (state: StoreState) => state.session && !state.remote
  ? `${Object.keys(state.tables.workspaces || {})[0] || ""}:${Object.keys(state.tables.owners || {})[0] || ""}` : "";
export const ownerCommandBinding = (state: StoreState) => ({ identity: ownerIdentity(state), workspaceId: state.session && !state.remote ? Object.keys(state.tables.workspaces || {})[0] : undefined });
export const ownerBindingIsCurrent = (binding: ReturnType<typeof ownerCommandBinding>, activeIdentity: string) => !!binding.workspaceId && !!binding.identity && binding.identity === activeIdentity;
/** Generated response clocks are ignored; worker changes at equal revisions still count. */
export const projectionSignature = (state: StoreState) => JSON.stringify([state.revision, state.session, state.tables, state.ui, state.remote]);
export const refreshDelay = (failures: number) => Math.min(60_000, 5_000 * 2 ** Math.min(Math.max(failures, 0), 4));
export const projectionForScope = (loaded: string, requested: string, state: StoreState) => loaded === requested ? state : emptyState();

/** Coalesce reads in one audience and cancel abandoned reads when its scope changes. */
export class ScopedRead<T> {
  private current?: { key: string; controller: AbortController; promise: Promise<T> };
  run(key: string, load: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (this.current?.key === key) return this.current.promise;
    this.cancel();
    const controller = new AbortController();
    const promise = Promise.resolve().then(() => load(controller.signal)).finally(() => {
      if (this.current?.promise === promise) this.current = undefined;
    });
    this.current = { key, controller, promise };
    return promise;
  }
  cancel() { this.current?.controller.abort(); this.current = undefined; }
}

/** Retry identity and duplicate protection survive uncertain writes and delayed canonical reads. */
export class CommandIntents {
  private keys = new Map<string, string>();
  private pending = new Map<string, Promise<Result>>();
  private awaitingProjection = new Map<string, string>();
  key(signature: string) {
    const key = this.keys.get(signature) || crypto.randomUUID();
    this.keys.set(signature, key); return key;
  }
  existing(signature: string) { return this.pending.get(signature); }
  track(signature: string, promise: Promise<Result>) { this.pending.set(signature, promise); }
  confirmed(signature: string, scope?: string) {
    this.keys.delete(signature);
    if (scope) this.awaitingProjection.set(signature, scope);
  }
  rejected(signature: string, definitive: boolean) { if (definitive) this.keys.delete(signature); }
  settled(signature: string) { if (!this.awaitingProjection.has(signature)) this.pending.delete(signature); }
  reconciled(scope: string) {
    for (const [intent, intentScope] of this.awaitingProjection) if (intentScope === scope) { this.awaitingProjection.delete(intent); this.pending.delete(intent); }
  }
  clear() { this.keys.clear(); this.pending.clear(); this.awaitingProjection.clear(); }
}
