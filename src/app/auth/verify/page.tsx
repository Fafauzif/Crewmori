import { Suspense } from "react";
import AuthHandoff from "@/views/auth-handoff";
export default function VerifyPage() {
  return <Suspense fallback={<main className="public-main"><section className="panel auth-panel" role="status"><h1>Preparing your sign-in</h1><p>Keep this page open while we connect you securely.</p></section></main>}><AuthHandoff /></Suspense>;
}
