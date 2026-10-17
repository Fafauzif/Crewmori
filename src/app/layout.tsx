import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplicationFrame } from "@/components/application";
import { runtimeConfig } from "@/server/config";
import "./globals.css";
import "@/views/acquisition.css";
import "@/views/work.css";
import "@/views/money.css";
import "@/views/settings.css";
import "@/views/public.css";
import "@/views/home-team.css";
export const metadata: Metadata = {
  title: "Crewmori · Your business, with a team",
  description:
    "Six thoughtful specialists for the business around your freelance work.",
  icons: { icon: "/assets/brand/crewmori-favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body><Suspense fallback={<main className="loading-shell" role="status"><h1>Opening Crewmori…</h1><p>Your workspace will be ready shortly.</p></main>}><ApplicationFrame connected={runtimeConfig().enabled}>{children}</ApplicationFrame></Suspense></body>
    </html>
  );
}
