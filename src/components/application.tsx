"use client";
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { StoreProvider, useStore } from "@/lib/store";
import { ownerIdentity } from "@/lib/resource-scope";
import { DirtyProvider, Empty, LinkButton, Panel } from "@/components/ui";
import { Shell, Delegate } from "./shell";
import { Home, Team, Activity } from "@/views/home-team";
const Acquisition = dynamic(() => import("@/views/acquisition"), { loading: ViewLoading });
const Work = dynamic(() => import("@/views/work"), { loading: ViewLoading });
const MoneyViews = dynamic(() => import("@/views/money"), { loading: ViewLoading });
const Settings = dynamic(() => import("@/views/settings"), { loading: ViewLoading });
const PublicViews = dynamic(() => import("@/views/public"), { loading: ViewLoading });
const AskContext = createContext<(text?: string) => void>(() => {});

/** Mounted by the root layout, so changing an owner route does not destroy the shell. */
export function ApplicationFrame({ children, connected }: { children: ReactNode; connected: boolean }) {
  return <StoreProvider connected={connected}><DirtyProvider><WorkspaceFrame>{children}</WorkspaceFrame></DirtyProvider></StoreProvider>;
}
function WorkspaceFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { ready, state, connected, refreshing, refreshError, sessionExpired, refresh } = useStore();
  const identity = connected ? ownerIdentity(state) : "sample";
  const [delegate, setDelegate] = useState<{ identity: string; text: string } | null>(null);
  const [offline, setOffline] = useState(false);
  const onAsk = (text = "") => setDelegate({ identity, text });
  const returnTo = path + (typeof window !== "undefined" ? window.location.search : "");
  useEffect(() => { if (!path.startsWith("/app")) setDelegate(null); }, [path]);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  const body = <>
    {connected && sessionExpired ? <div className="resource-status error" role="alert"><div><strong>Your session expired.</strong><p>Keep this tab open to preserve your draft. Sign in in a new tab, then reconnect here.</p></div><div className="actions"><a className="btn primary" href={`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`} target="_blank" rel="noopener noreferrer">Sign in in a new tab</a><button className="btn secondary" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? "Reconnecting…" : "Reconnect"}</button></div></div>
      : connected && offline ? <div className="resource-status warning" role="status"><div><strong>You appear to be offline.</strong><p>Keep this tab open to preserve your draft. Reconnect before saving or sending.</p></div></div>
        : connected && refreshError && ready ? <div className="resource-status warning" role="status"><div><strong>Latest updates are unavailable.</strong><p>{refreshError}</p></div><button className="btn secondary" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? "Checking…" : "Try again"}</button></div> : null}
    {children}
  </>;
  return <AskContext.Provider value={onAsk}>{path.startsWith("/app") && ready && state.session
    ? <Shell key={identity} onAsk={onAsk}>{body}{delegate?.identity === identity && <Delegate initial={delegate.text} onClose={() => setDelegate(null)} />}</Shell>
    : body}</AskContext.Provider>;
}

function ViewLoading() { const path = usePathname(); return <ResourceSkeleton path={path} withinShell={path.startsWith("/app")} />; }
function ResourceSkeleton({ path, withinShell = false }: { path: string; withinShell?: boolean }) {
  const owner = path.startsWith("/app");
  const list = /\/(opportunities|offers|projects|clients|invoices|expenses)(?:\/)?$/.test(path);
  const heading = path.startsWith("/buyer") || path.startsWith("/inquiry") ? "Opening your client space" : owner ? "Loading your workspace" : "Loading this page";
  const skeleton = <div className="resource-skeleton" aria-busy="true"><span className="sr-only" role="status">{heading}…</span><div aria-hidden="true"><div className="skeleton-heading" /><div className="skeleton-description" />{list ? <div className="skeleton-table">{[0, 1, 2, 3, 4].map((row) => <div className="skeleton-row" key={row}><i /><i /><i /></div>)}</div> : <div className="skeleton-panels"><div /><div /></div>}</div></div>;
  return withinShell ? skeleton : owner ? <div className="app-shell-skeleton"><aside aria-hidden="true"><img src="/assets/brand/crewmori-primary-green.svg" alt="" /><div className="skeleton-nav" />{[0, 1, 2, 3, 4].map((i) => <div className="skeleton-nav" key={i} />)}</aside><main><div className="skeleton-topbar" aria-hidden="true" />{skeleton}</main></div> : <main className="loading-shell">{skeleton}</main>;
}
function Content() {
  const path = usePathname(),
    router = useRouter();
  const { ready, state, storageError, connected, refresh } = useStore();
  const onAsk = useContext(AskContext);
  useEffect(() => {
    if (!ready) return;
    const heading = document.querySelector<HTMLElement>("h1");
    document.title =
      (heading?.textContent?.trim() ? heading.textContent.trim() + " · " : "") +
      "Crewmori";
    if (heading && !document.querySelector("dialog[open]")) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }, [path, ready]);
  useEffect(() => {
    if (ready && (path.startsWith("/app") || path === "/onboarding") && !state.session)
      // Keep the query so deep links such as ?connection=drive survive sign-in.
      router.replace("/auth/sign-in?returnTo=" + encodeURIComponent(path + window.location.search));
  }, [path, ready, router, state.session]);
  if (connected && storageError && !ready) return <div className="loading-shell" role="alert"><h1>Workspace unavailable</h1><p>{storageError}</p><button onClick={() => void refresh()}>Try again</button></div>;
  if (!ready) return <ResourceSkeleton path={path} />;
  if ((path.startsWith("/app") || path === "/onboarding") && !state.session)
    return (
      <div className="loading-shell" role="status">
        Opening sign in…
      </div>
    );
  if (!path.startsWith("/app")) return <PublicViews path={path} />;
  let page;
  if (path === "/app/home") page = <Home onAsk={onAsk} />;
  else if (path === "/app/team") page = <Team onAsk={onAsk} />;
  else if (path === "/app/team/activity") page = <Activity />;
  else if (/^\/app\/(opportunities|offers|promotion)(\/|$)/.test(path))
    page = <Acquisition path={path} />;
  else if (/^\/app\/(projects|clients|calendar)(\/|$)/.test(path))
    page = <Work path={path} />;
  else if (path.startsWith("/app/money/")) page = <MoneyViews path={path} />;
  else if (path.startsWith("/app/settings/") || path === "/app/connections")
    page = <Settings path={path} />;
  else
    page = (
      <Panel>
        <Empty
          title="This page isn’t in your workspace"
          description="Return to your studio to pick up where you left off."
        >
          <LinkButton href="/app/home">Back to Home</LinkButton>
        </Empty>
      </Panel>
    );
  return page;
}
export default function Application() { return <Content />; }
