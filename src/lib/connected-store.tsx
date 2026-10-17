"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Context } from "./store";
import { NotificationToast } from "@/components/notification-toast";
import { BackendClient, BackendError, isDefinitiveFailure } from "./backend-client";
import { emptyState } from "./workspace-state";
import { translate } from "./i18n";
import { a, n, o, s, type Input, type Result, type StoreState } from "./types";
import { CommandIntents, ownerBindingIsCurrent, ownerCommandBinding, ownerIdentity, projectionForScope, projectionSignature, refreshDelay, resourceScope, ScopedRead, type ResourceScope } from "./resource-scope";

export function ConnectedStoreProvider({ children }: { children: ReactNode }) {
  const path = usePathname(), params = useSearchParams();
  const scope = resourceScope(path, params.get("version") || "");
  const [state, setState] = useState<StoreState>(emptyState), [ready, setReady] = useState(false), [storageError, setError] = useState(""), [toast, setToast] = useState("");
  const [loadedScope, setLoadedScope] = useState(""), [refreshing, setRefreshing] = useState(false), [sessionExpired, setSessionExpired] = useState(false);
  const ref = useRef(state), activeScope = useRef<ResourceScope>(scope), generation = useRef(0);
  const reads = useRef(new ScopedRead<void>()), failures = useRef(0), expired = useRef(false), committed = useRef(false);
  const queues = useRef(new Map<string, Promise<unknown>>()), intents = useRef(new CommandIntents());
  const buyerExchange = useRef<Promise<unknown>>(Promise.resolve());
  const signature = useRef(""), identity = useRef("");
  const notify = useCallback((message: string) => setToast(message), []);
  const apply = useCallback((next: StoreState) => {
    const nextSignature = projectionSignature(next);
    if (signature.current === nextSignature) return;
    signature.current = nextSignature; ref.current = next; setState(next);
  }, []);
  const refresh = useCallback(async (showStatus = false) => {
    const target = activeScope.current, current = generation.current;
    if (showStatus) setRefreshing(true);
    return reads.current.run(target.key, async (signal) => {
      if (signal.aborted || generation.current !== current) return;
      try {
        const client = new BackendClient(), options = { signal };
        let next = emptyState();
        if (target.kind === "profile") {
          next.remote = await client.request<Record<string, unknown>>(`/api/public/profile?handle=${encodeURIComponent(target.id || "")}`, undefined, "GET", options);
        } else if (target.kind === "buyer") {
          const invite = new URLSearchParams(window.location.hash.slice(1)).get("invite");
          if (invite) {
            // Exchanges set one shared HttpOnly buyer cookie. Keep their order stable across route changes.
            const exchange = buyerExchange.current.then(() => client.request("/api/buyer/session", { token: invite }));
            buyerExchange.current = exchange.catch(() => {});
            await exchange;
            if (generation.current !== current || signal.aborted) return;
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
          }
          const remote = await client.request<Record<string, unknown>>(`/api/buyer/state?engagement=${encodeURIComponent(target.id || "")}&version=${encodeURIComponent(target.version || "")}`, undefined, "GET", options);
          next.remote = remote; next.revision = n(remote.revision);
        } else if (target.kind === "session") {
          // Public/auth pages never load private workspace records just to choose a CTA.
          const response = await client.request<{ user: { id: string; email?: string } }>("/api/auth/user", undefined, "GET", options);
          next.session = true; next.ui = { authenticated_email: response.user.email || "" };
        } else if (target.kind === "owner") {
          try {
            next = (await client.request<{ state: StoreState }>("/api/workspace/state", undefined, "GET", options)).state;
          } catch (error) {
            // Callback normally creates the workspace. Recover only a specifically missing workspace.
            if (!(error instanceof BackendError && error.code === "WORKSPACE_NOT_FOUND")) throw error;
            await client.request("/api/workspaces", { name: "My studio" });
            next = (await client.request<{ state: StoreState }>("/api/workspace/state", undefined, "GET", options)).state;
          }
          next.session = true; next.remote = undefined;
          next.ui = { ...next.ui, authenticated_email: s(Object.values(next.tables.owners || {})[0]?.email) };
        }
        if (generation.current !== current || signal.aborted) return;
        if (target.kind === "owner") {
          const nextIdentity = ownerIdentity(next);
          if (identity.current && identity.current !== nextIdentity) { intents.current.clear(); setToast(""); }
          identity.current = nextIdentity;
        }
        if (ownerIdentity(next) !== ownerIdentity(ref.current) || next.revision >= ref.current.revision || !next.session || !!ref.current.remote || !ref.current.session) apply(next);
        intents.current.reconciled(target.key);
        failures.current = 0; expired.current = false; committed.current = false;
        setSessionExpired(false); setError(""); setLoadedScope(target.key); setReady(true);
      } catch (error) {
        if (generation.current !== current || signal.aborted) return;
        if (error instanceof BackendError && error.status === 401) {
          if (target.kind === "owner" && ref.current.session) {
            // Keep this page and its local drafts mounted; writes remain blocked until reauthenticated.
            expired.current = true; setSessionExpired(true); setError("");
          } else {
            apply(emptyState()); setError(target.kind === "buyer" ? error.message : ""); setReady(true); setLoadedScope(target.key);
          }
        } else {
          failures.current++;
          const message = error instanceof Error ? error.message : "The latest view could not be loaded.";
          setError(committed.current ? `Saved. The latest view could not refresh. ${message}` : message);
        }
      }
    }).finally(() => { if (showStatus && generation.current === current) setRefreshing(false); });
  }, [apply]);
  const refreshWorkspace = useCallback(() => refresh(true), [refresh]);
  useEffect(() => {
    const scopeReads = reads.current;
    generation.current++; scopeReads.cancel(); activeScope.current = scope;
    // State is also masked synchronously below, before this effect can expose another audience.
    apply(emptyState()); setLoadedScope(scope.key); setError(""); setToast(""); setRefreshing(false); setSessionExpired(false); expired.current = false; failures.current = 0; committed.current = false;
    setReady(["session", "passive"].includes(scope.kind));
    let disposed = false, timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (disposed || !["owner", "buyer"].includes(scope.kind)) return;
      timer = setTimeout(async () => {
        if (document.visibilityState === "visible" && navigator.onLine && !expired.current) {
          await (queues.current.get(scope.key) || Promise.resolve());
          if (!disposed) await refresh();
        }
        schedule();
      }, refreshDelay(failures.current));
    };
    const focus = () => {
      if (!disposed && document.visibilityState === "visible" && navigator.onLine && !expired.current) void (queues.current.get(scope.key) || Promise.resolve()).then(async () => { if (!disposed) await refresh(); });
    };
    if (scope.kind !== "passive") void refresh().then(schedule);
    window.addEventListener("focus", focus); window.addEventListener("online", focus); window.addEventListener("hashchange", focus); document.addEventListener("visibilitychange", focus);
    return () => { disposed = true; clearTimeout(timer); scopeReads.cancel(); window.removeEventListener("focus", focus); window.removeEventListener("online", focus); window.removeEventListener("hashchange", focus); document.removeEventListener("visibilitychange", focus); };
    // Resource identity, rather than pathname, owns the read lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.key, apply, refresh]);
  // The callback belongs to the rendered projection, not mutable refs that may advance before
  // an old form handler finishes. Keep its workspace/owner binding immutable until re-render.
  const visibleState = projectionForScope(loadedScope, scope.key, state);
  const renderedBinding = scope.kind === "owner" ? ownerCommandBinding(visibleState) : { identity: "", workspaceId: undefined };
  const renderedOwnerIdentity = renderedBinding.identity, renderedWorkspaceId = renderedBinding.workspaceId;
  const command = useCallback((type: string, input: Input = {}): Promise<Result> => {
    // A retry of unchanged input reuses its transport key; successful actions discard it.
    const commandScope = scope.key;
    const commandIdentity = commandScope === "owner" ? renderedOwnerIdentity : "";
    const signature = JSON.stringify([commandScope, commandIdentity, type, input]);
    const isCurrentCommand = () => activeScope.current.key === commandScope && (commandScope !== "owner" || ownerBindingIsCurrent({ identity: commandIdentity, workspaceId: renderedWorkspaceId }, identity.current));
    const existing = intents.current.existing(signature);
    if (existing) return existing;
    const idempotencyKey = intents.current.key(signature);
    let revalidation: Promise<void> | undefined;
    const run = async (): Promise<Result> => {
      if (!isCurrentCommand()) return { ok: false, code: "SCOPE_CHANGED", message: "This page changed. Review the current record before trying again." };
      if (expired.current && !["session.set", "session.signOut"].includes(type)) return { ok: false, code: "UNAUTHENTICATED", message: "Your session expired. Sign in, then reconnect before saving. Your draft is still open in this tab." };
      if (!navigator.onLine && !(["ui.set", "preferences.save"].includes(type) && !ref.current.session)) return { ok: false, code: "OFFLINE", message: "You are offline. Reconnect before saving or sending. Your draft is still open in this tab." };
      try {
        // Bind every owner write to the workspace that supplied this form. A cookie/account change
        // in another tab must fail authorization rather than applying old fields to a new account.
        const client = new BackendClient(commandScope === "owner" ? renderedWorkspaceId : undefined);
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
          await client.request("/api/auth/sign-out", {});
          reads.current.cancel(); generation.current++; intents.current.clear(); identity.current = ""; expired.current = false;
          setSessionExpired(false); setToast(""); apply(emptyState());
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
        if (result.ok) intents.current.confirmed(signature);
        if (isCurrentCommand()) {
          if (result.ok && type !== "inquiry.submit") {
            committed.current = true;
            // Until canonical data catches up, an identical click must reuse this confirmed receipt.
            intents.current.confirmed(signature, commandScope);
            // A confirmed write has succeeded even if its follow-up read fails. Never invite a duplicate save.
            reads.current.cancel(); revalidation = refresh();
          }
          if (!result.ok) notify(result.message);
        }
        return result;
      } catch (error) {
        const code = error instanceof BackendError ? error.code : "CONNECTION_INTERRUPTED";
        intents.current.rejected(signature, isDefinitiveFailure(error));
        if (isCurrentCommand() && error instanceof BackendError && error.status === 401 && commandScope === "owner") { expired.current = true; setSessionExpired(true); }
        if (code === "STALE_VERSION" && isCurrentCommand()) revalidation = refresh();
        const message = error instanceof Error ? error.message : "The connection was interrupted. Retry the same action to check its result.";
        if (isCurrentCommand()) notify(message);
        return { ok: false, code, message, outcomeUnknown: !isDefinitiveFailure(error) };
      }
    };
    const promise = (queues.current.get(commandScope) || Promise.resolve()).then(run, run).finally(() => intents.current.settled(signature));
    // Following writes use the refreshed versions, while the caller receives the committed receipt immediately.
    queues.current.set(commandScope, promise.then(async () => { await revalidation; }));
    intents.current.track(signature, promise);
    return promise;
  }, [apply, notify, path, refresh, scope.key, renderedOwnerIdentity, renderedWorkspaceId]);
  // Mask synchronously on render: effects must never be relied on to hide private records.
  const visibleReady = loadedScope === scope.key ? ready : ["session", "passive"].includes(scope.kind);
  const prefs = Object.values(visibleState.tables.preferences || {})[0], locale = s(prefs?.locale, "en");
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dataset.backend = "connected"; document.documentElement.dataset.motion = s(prefs?.motion, "system"); return () => { delete document.documentElement.dataset.backend; }; }, [locale, prefs?.motion]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 8000); return () => clearTimeout(timer); }, [toast]);
  const value = useMemo(() => ({ state: visibleState, ready: visibleReady, connected: true, refresh: refreshWorkspace, refreshing, sessionExpired: loadedScope === scope.key && sessionExpired, refreshError: visibleReady ? storageError : "", rows: (table: string) => Object.values(visibleState.tables[table] || {}), record: (table: string, id: string) => visibleState.tables[table]?.[id] || (["owners", "profiles", "preferences", "onboarding_sessions", "workspaces"].includes(table) ? Object.values(visibleState.tables[table] || {})[0] : undefined), command, notify, t: (text: string) => translate(text, locale), storageError: visibleReady ? "" : storageError, resetStorage: () => void refreshWorkspace() }), [visibleState, visibleReady, refreshWorkspace, refreshing, loadedScope, scope.key, sessionExpired, storageError, command, notify, locale]);
  return <Context.Provider value={value}>
    {children}
    {toast && loadedScope === scope.key && <NotificationToast message={toast} dismissLabel={translate("Dismiss notification", locale)} onDismiss={() => setToast("")} />}
  </Context.Provider>;
}
