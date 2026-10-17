"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Context } from "./store";
import { BackendClient, BackendError } from "./backend-client";
import { emptyState } from "./workspace-state";
import { translate } from "./i18n";
import { a, n, o, s, type Input, type Result, type StoreState } from "./types";

export function ConnectedStoreProvider({ children }: { children: ReactNode }) {
  const path = usePathname(), params = useSearchParams(), version = params.get("version") || "";
  const [state, setState] = useState<StoreState>(emptyState), [ready, setReady] = useState(false), [storageError, setError] = useState(""), [toast, setToast] = useState("");
  const ref = useRef(state), queue = useRef<Promise<unknown>>(Promise.resolve()), generation = useRef(0);
  const keys = useRef(new Map<string, string>());
  // Signed-in email after the one-time workspace bootstrap; later refreshes only read state.
  const owner = useRef<string | undefined>(undefined);
  const notify = useCallback((message: string) => setToast(message), []);
  const apply = useCallback((next: StoreState) => { ref.current = next; setState(next); }, []);
  const refresh = useCallback(async () => {
    const current = generation.current;
    try {
      const client = new BackendClient();
      let next = emptyState();
      if (/^\/u\//.test(path)) {
        const response = await client.request<{ profile: unknown }>(`/api/public/profile?handle=${encodeURIComponent(path.split("/")[2])}`);
        next.remote = response;
      } else if (/^\/(buyer|inquiry)\//.test(path)) {
        const invite = new URLSearchParams(window.location.hash.slice(1)).get("invite");
        if (invite) {
          await client.request("/api/buyer/session", { token: invite });
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
        const remote = await client.request<Record<string, unknown>>(`/api/buyer/state?engagement=${encodeURIComponent(path.split("/")[2])}&version=${encodeURIComponent(version)}`);
        next.remote = remote;
        next.revision = n(remote.revision);
      } else {
        try {
          if (owner.current === undefined) {
            const response = await client.request<{ user: { id: string; email?: string } }>("/api/auth/user");
            await client.request("/api/workspaces", { name: "My studio" });
            owner.current = response.user.email || "";
          }
          next = (await client.request<{ state: StoreState }>("/api/workspace/state")).state;
          next.session = true;
          next.remote = undefined;
          next.ui = { ...next.ui, authenticated_email: owner.current };
        } catch (error) {
          if (!(error instanceof BackendError && error.status === 401)) throw error;
          owner.current = undefined;
        }
      }
      if (generation.current !== current) return;
      if (next.revision >= ref.current.revision || !next.session || ref.current.remote || !ref.current.session) apply(next); setError(""); setReady(true);
    } catch (error) {
      if (generation.current !== current) return;
      setError(error instanceof Error ? error.message : "The workspace could not be loaded.");
    }
  }, [path, version, apply]);
  useEffect(() => {
    generation.current++;
    setReady(false);
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void queue.current.then(refresh); }, 5000);
    const focus = () => void queue.current.then(refresh);
    window.addEventListener("focus", focus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [refresh]);
  const command = useCallback((type: string, input: Input = {}): Promise<Result> => {
    // A retry of unchanged input reuses its transport key; successful actions discard it.
    const signature = JSON.stringify([type, input]);
    const idempotencyKey = keys.current.get(signature) || crypto.randomUUID();
    keys.current.set(signature, idempotencyKey);
    const run = async (): Promise<Result> => {
      try {
        const client = new BackendClient();
        const clean = { ...input };
        delete clean.idempotency_key; delete clean.command_id; delete clean.grant_id; delete clean.actor;
        const aliases: Record<string, string> = { owner_alya: "owners", workspace_alya: "workspaces", profile_alya: "profiles", preferences_alya: "preferences", onboarding_alya: "onboarding_sessions" };
        const resolveId = (value: unknown) => typeof value === "string" && aliases[value] ? Object.keys(ref.current.tables[aliases[value]] || {})[0] : value;
        if (clean.id) clean.id = resolveId(clean.id);
        if (clean.values) clean.values = Object.fromEntries(Object.entries(o(clean.values)).map(([key, value]) => [key, key.endsWith("_id") ? resolveId(value) : value]));
        let result: Result;
        if (type === "ui.set" && !ref.current.session) {
          apply({ ...ref.current, ui: { ...ref.current.ui, ...o(input.values) } });
          return { ok: true, message: "Preferences saved for this visit." };
        }
        if (type === "preferences.save" && !ref.current.session) {
          const next = structuredClone(ref.current);
          next.tables.preferences = { visitor: { id: "visitor", version: 1, ...o(input.values) } }; apply(next);
          return { ok: true, message: "Preferences saved for this visit." };
        }
        if (type === "session.set" || type === "session.signOut") {
          if (input.authenticated !== false && type !== "session.signOut") return { ok: false, message: "Sign in with your account to continue." };
          await client.request("/api/auth/sign-out", {}); owner.current = undefined; apply(emptyState());
          return { ok: true, message: "Signed out." };
        } else if (type === "inquiry.submit") {
          const response = await client.request<{ result: Result }>("/api/public/inquiries", { handle: s(o(input.values).handle), values: input.values, idempotencyKey });
          result = response.result;
        } else if (type === "agent.start") {
          const refs = [...a<{ table: string; id: string; version: number }>(input.references), ...a<{ table: string; id: string; version: number }>(input.input_refs)];
          for (const id of [...a<string>(input.source_ids), ...[s(input.opportunity_id), s(input.project_id), s(input.invoice_id), s(input.service_id)].filter(Boolean)]) {
            for (const [table, records] of Object.entries(ref.current.tables)) if (records[id]) refs.push({ table, id, version: records[id].version });
          }
          const role = s(input.role_id, "scout") === "auto" ? "scout" : s(input.role_id, "scout");
          const run = await client.request<{ id: string }>("/api/tasks", { role, instruction: s(input.instruction, s(input.intent, s(input.task_kind, "Review the selected business records and propose next steps."))), references: Array.from(new Map(refs.map((r) => [`${r.table}:${r.id}`, r])).values()), idempotencyKey });
          result = { ok: true, id: run.id, message: "Task queued for your AI teammate." };
        } else if (["message.send", "invoice.send", "calendar.invite"].includes(type)) {
          const response = await client.request<{ result: Result }>("/api/dispatch", { type, input: clean, idempotencyKey });
          result = response.result;
        } else if (type === "artifact.apply") {
          const response = await client.request<{ result: Result }>(`/api/runs/${encodeURIComponent(s(input.id))}/apply`, { expectedVersion: input.expected_version, confirmed: true, idempotencyKey });
          result = response.result;
        } else if (type === "agent.control") {
          const run = ref.current.tables.agent_runs?.[s(input.id, s(input.run_id))];
          const response = await client.request<{ id: string }>(`/api/runs/${encodeURIComponent(s(run?.id))}`, { action: input.action, expectedVersion: run?.version, idempotencyKey });
          result = { ok: true, id: response.id, message: "Task control updated." };
        } else if (type === "payment.startRequest" || type === "payment.check") {
          const payment = await client.request<{ id: string; url: string | null; provider: string }>("/api/payments/start", { requestId: s(input.id), buyer: /^\/(buyer|inquiry)\//.test(path), idempotencyKey });
          result = { ok: true, id: payment.id, message: payment.provider === "sandbox" ? "Sandbox request ready in the buyer portal." : "Checkout is ready in the buyer portal." };
        } else if (type === "connection.change") {
          if (input.action === "disconnect") await client.request("/api/connections/google", undefined, "DELETE");
          else {
            const capability = s(input.id, s(input.connection_id));
            const response = await client.request<{ url: string }>("/api/connections/google", { capabilities: capability === "calendar" ? ["calendar_read", "calendar_write"] : [capability] });
            window.location.assign(response.url);
          }
          result = { ok: true, message: "Connection updated." };
        } else {
          const buyer = /^\/(buyer|inquiry)\//.test(path);
          // Uploads and worker events advance the workspace revision independently of this form,
          // so commands rely on form-captured record versions to reject stale edits.
          const response = await client.request<{ result: Result }>(buyer ? "/api/buyer/commands" : "/api/commands", { type, input: clean, idempotencyKey });
          result = response.result;
        }
        keys.current.delete(signature);
        if (type !== "inquiry.submit") await refresh();
        if (!result.ok) notify(result.message);
        return result;
      } catch (error) {
        const code = error instanceof BackendError ? error.code : "CONNECTION_INTERRUPTED";
        if (error instanceof BackendError && error.status < 500 && !["DISPATCH_REVIEW_REQUIRED", "DISPATCH_FINALIZATION_REQUIRED"].includes(code)) keys.current.delete(signature);
        if (code === "STALE_VERSION") await refresh();
        const message = error instanceof Error ? error.message : "The connection was interrupted. Retry the same action to check its result.";
        notify(message); return { ok: false, code, message };
      }
    };
    const promise = queue.current.then(run, run);
    queue.current = promise;
    return promise;
  }, [apply, notify, path, refresh]);
  const prefs = Object.values(state.tables.preferences || {})[0], locale = s(prefs?.locale, "en");
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dataset.backend = "connected"; document.documentElement.dataset.motion = s(prefs?.motion, "system"); return () => { delete document.documentElement.dataset.backend; }; }, [locale, prefs?.motion]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 8000); return () => clearTimeout(timer); }, [toast]);
  return <Context.Provider value={{ state, ready, connected: true, refresh, rows: (table) => Object.values(state.tables[table] || {}), record: (table, id) => state.tables[table]?.[id] || (["owners", "profiles", "preferences", "onboarding_sessions", "workspaces"].includes(table) ? Object.values(state.tables[table] || {})[0] : undefined), command, notify, t: (text) => translate(text, locale), storageError, resetStorage: () => void refresh() }}>
    {children}
    {storageError && ready && <div className="toast" role="alert">{storageError}<button onClick={() => void refresh()}>Retry</button></div>}
    {toast && <div className="toast" role="status">{toast}<button onClick={() => setToast("")}>×</button></div>}
  </Context.Provider>;
}
