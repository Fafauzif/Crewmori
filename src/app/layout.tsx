import type { Metadata } from "next";
import "./globals.css";
import "@/views/acquisition.css";
import "@/views/work.css";
import "@/views/money.css";
import "@/views/settings.css";
import "@/views/public.css";
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
      <body>{children}</body>
    </html>
  );
}
