"use client";
import { UiText } from "@/components/ui-text";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BackendClient } from "@/lib/backend-client";
import { useStore } from "@/lib/store";
import { workspaceReturnPath } from "@/lib/auth-experience";

/** Visible status surrounds the real OAuth exchange; it never declares authentication itself. */
export default function AuthHandoff() {
  const params = useSearchParams(), { t } = useStore();
  const phase = params.get("phase") === "workspace" ? "workspace" : "google";
  const returnTo = workspaceReturnPath(params.get("returnTo"));
  const [error, setError] = useState("");
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const slowTimer = window.setTimeout(() => { if (active) setSlow(true); }, 8000);
    const run = async () => {
      setError(""); setSlow(false);
      if (phase === "google") {
        // Let the readable handoff paint before beginning the secure provider navigation.
        window.location.replace(`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }
      try {
        const result = await new BackendClient().request<{ destination: string }>("/api/auth/complete", { returnTo });
        if (active) window.location.replace(result.destination === "/onboarding" ? "/onboarding" : workspaceReturnPath(result.destination));
      } catch (failure) { if (active) setError(failure instanceof Error ? failure.message : "Your workspace could not be prepared. Try again."); }
    };
    const startTimer = window.setTimeout(() => void run(), 50);
    return () => { active = false; window.clearTimeout(slowTimer); window.clearTimeout(startTimer); };
  }, [phase, returnTo, attempt]);
  return <main className="public-main"><section className="panel auth-panel" aria-labelledby="auth-status-title">
    <Link href="/" aria-label="Crewmori home"><img src="/assets/brand/crewmori-primary-green.svg" alt="Crewmori" width="200" height="56" /></Link>
    <div role="status" aria-live="polite" aria-atomic="true">
      <h1 id="auth-status-title">{t(error ? "We couldn’t finish signing you in" : phase === "google" ? "Opening Google securely" : "Preparing your workspace")}</h1>
      <p>{t(error ? "You can retry opening your existing workspace or return to sign in." : phase === "google" ? "Choose your Google account on the next screen. You’ll return here to finish signing in." : "Google has returned you to Crewmori. We’re checking your session and opening your business workspace.")}</p>
    </div>
    {error && <p className="feedback error" role="alert">{t(error)}</p>}
    {slow && !error && <p className="feedback" role="status"><UiText>{"This is taking longer than usual. You can retry or return to sign in; you don’t need to create another account."}</UiText></p>}
    {(error || slow) && <div className="public-actions"><button className="btn primary" onClick={() => setAttempt((value) => value + 1)}><UiText>{"Try again"}</UiText></button><Link className="btn secondary" href={`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`}><UiText>{"Back to sign in"}</UiText></Link></div>}
    <p className="muted"><UiText>{"Keep this page open. Crewmori will continue only after the session is verified."}</UiText></p>
  </section></main>;
}
