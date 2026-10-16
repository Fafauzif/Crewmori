"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { StoreProvider, useStore } from "@/lib/store";
import { DirtyProvider, Empty, LinkButton, Panel } from "@/components/ui";
import { Shell, Delegate } from "./shell";
import { Home, Team, Activity } from "@/views/home-team";
import Acquisition from "@/views/acquisition";
import Work from "@/views/work";
import MoneyViews from "@/views/money";
import Settings from "@/views/settings";
import PublicViews from "@/views/public";
function Content() {
  const path = usePathname(),
    router = useRouter();
  const { ready, state } = useStore();
  const [delegate, setDelegate] = useState<string | null>(null);
  const onAsk = (text = "") => setDelegate(text);
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
    if (ready && path.startsWith("/app") && !state.session)
      router.replace("/auth/sign-in?returnTo=" + encodeURIComponent(path));
  }, [path, ready, router, state.session]);
  if (!ready)
    return (
      <div className="loading-shell" role="status">
        <h2>Opening your studio…</h2>
        <div className="loading-bar" />
        <div className="loading-bar" style={{ width: "60%" }} />
      </div>
    );
  if (path.startsWith("/app") && !state.session)
    return (
      <div className="loading-shell" role="status">
        Opening sample sign in…
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
  return (
    <Shell onAsk={onAsk}>
      {page}
      {delegate !== null && (
        <Delegate initial={delegate} onClose={() => setDelegate(null)} />
      )}
    </Shell>
  );
}
export default function Application() {
  return (
    <StoreProvider>
      <DirtyProvider>
        <Content />
      </DirtyProvider>
    </StoreProvider>
  );
}
