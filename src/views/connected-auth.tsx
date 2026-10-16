"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BackendClient } from "@/lib/backend-client";
import { useStore } from "@/lib/store";
import { Button, Field, Panel } from "@/components/ui";
import type { StoreState } from "@/lib/types";

export default function ConnectedAuth({ mode }: { mode: string }) {
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [confirmation, setConfirmation] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const router = useRouter(), params = useSearchParams(), { refresh, state } = useStore();
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "reset" && password !== confirmation) throw new Error("The passwords do not match.");
      const client = new BackendClient();
      const input = mode === "recover" ? { email } : mode === "reset" ? { password } : { email, password };
      const result = await client.request<{ authenticated?: boolean; confirmationRequired?: boolean; message?: string }>(`/api/auth/${mode}`, input);
      setPassword(""); setConfirmation("");
      if (mode === "recover") { setMessage(result.message || "Check your email for recovery instructions."); return; }
      if (mode === "reset") { setMessage("Your password has been updated."); return; }
      if (result.confirmationRequired) { setMessage("Check your email to confirm your account, then sign in."); return; }
      await client.request("/api/workspaces", { name: "My studio" });
      const { state: workspace } = await client.request<{ state: StoreState }>("/api/workspace/state");
      await refresh();
      const returnTo = params.get("returnTo") || "/app/home";
      const destination = returnTo.startsWith("/app/") && !/[\\\r\n]/.test(returnTo) && !returnTo.includes("//") ? returnTo : "/app/home";
      router.replace(Object.values(workspace.tables.onboarding_sessions || {})[0]?.state === "completed" ? destination : "/onboarding");
    } catch (error) { setError(error instanceof Error ? error.message : "Authentication could not finish."); }
    finally { setBusy(false); }
  };
  const title = mode === "sign-up" ? "Create your workspace" : mode === "recover" ? "Recover your account" : mode === "reset" ? "Choose a new password" : "Welcome back";
  return <main className="public-main"><div className="auth-layout"><div className="auth-aside"><Link href="/"><img src="/assets/brand/crewmori-primary-green.svg" alt="Crewmori" /></Link><h2>Your work. Your business. Your team.</h2></div><Panel className="auth-panel"><h1>{title}</h1>
    {state.session && mode === "sign-in" && <p><Link href="/app/home">Continue to your workspace</Link></p>}
    {error && <p role="alert" className="public-error">{error}</p>}{message && <p role="status">{message}</p>}
    <form onSubmit={submit}>
      {mode !== "reset" && <Field label="Email"><input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>}
      {mode !== "recover" && <Field label="Password"><input required type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={mode === "sign-in" ? 1 : 12} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>}
      {mode === "reset" && <Field label="Confirm password"><input required type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></Field>}
      <Button type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "recover" ? "Send recovery email" : mode === "reset" ? "Update password" : mode === "sign-up" ? "Create account" : "Sign in"}</Button>
    </form><div className="auth-links"><Link href="/auth/sign-in">Sign in</Link><Link href="/auth/sign-up">Create account</Link><Link href="/auth/recover">Forgot password?</Link></div>
  </Panel></div></main>;
}
