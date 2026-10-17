"use client";
import { UiText } from "@/components/ui-text";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { workspaceReturnPath } from "@/lib/auth-experience";
import { Panel } from "@/components/ui";

const failures: Record<string, string> = {
  cancelled: "Google sign-in was cancelled. Try again when you are ready.",
  expired: "This sign-in link expired or was already used. Start again.",
  failed: "Google did not complete the sign-in. Try again.",
  unavailable: "Google sign-in is unavailable right now. Try again shortly.",
};

// Connected accounts are created and resumed only through Google.
export default function ConnectedAuth({ mode }: { mode: string }) {
  const params = useSearchParams(), { state, t } = useStore();
  const [opening, setOpening] = useState(false);
  const error = failures[params.get("error") || ""];
  const returnTo = workspaceReturnPath(params.get("returnTo"));
  const href = `/auth/verify?phase=google&returnTo=${encodeURIComponent(returnTo)}`;
  const title = mode === "sign-up" ? "Create your workspace" : mode === "sign-in" ? "Welcome back" : "Sign in with Google";
  return <main className="public-main"><div className="auth-layout"><div className="auth-aside"><Link href="/"><img src="/assets/brand/crewmori-primary-green.svg" alt="Crewmori" /></Link><h2><UiText>{"Your work. Your business. Your team."}</UiText></h2></div><Panel className="auth-panel"><h1>{t(title)}</h1>
    {state.session && <><p><UiText>{"You’re already signed in to Crewmori."}</UiText></p><Link className="btn primary" href={returnTo}><UiText>{"Continue to your workspace"}</UiText></Link><p className="muted"><UiText>{"Use a different Google account only if you want to switch workspaces."}</UiText></p></>}
    {error && <p role="alert" className="public-error">{t(error)}</p>}
    {["recover", "reset"].includes(mode) && <p className="muted"><UiText>{"Crewmori uses your Google account, so there is no separate password to recover."}</UiText></p>}
    <a className={`btn ${state.session ? "secondary" : "primary"} google-sign-in`} href={href} onClick={() => setOpening(true)} aria-busy={opening}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>
      {t(opening ? "Opening secure sign-in…" : state.session ? "Use another Google account" : "Continue with Google")}
    </a>
    {opening && <p className="feedback" role="status"><UiText>{"Opening Google. Choose your account, then Crewmori will prepare your workspace."}</UiText></p>}
    <p className="muted auth-note">{t(mode === "sign-up" ? "Your workspace is created the first time you continue." : "New here? Continuing with Google creates your workspace.")}</p>
  </Panel></div></main>;
}
