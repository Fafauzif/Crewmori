"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="loading-shell">
      <h1>Your studio couldn’t open this view.</h1>
      <p>Your saved sample records are still in this browser.</p>
      <button className="btn primary" onClick={reset}>
        Try again
      </button>
      <Link className="btn secondary" href="/app/home">
        Return home
      </Link>
    </main>
  );
}
