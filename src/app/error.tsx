"use client";
import Link from "next/link";
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="loading-shell">
      <h1>Your studio couldn’t open this view.</h1>
      <p>This view ran into a problem. Try opening it again, or return to your workspace.</p>
      {error.digest && <p className="muted">Support reference: {error.digest}</p>}
      <button className="btn primary" onClick={reset}>
        Try again
      </button>
      <Link className="btn secondary" href="/app/home">
        Return home
      </Link>
    </main>
  );
}
