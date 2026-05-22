import type { Metadata } from "next";
import "./globals.css";

// Every page in this single-tenant app depends on DB state — nothing should
// be statically pre-rendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "World Cup Pool",
  description: "Private World Cup prediction game for friends.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
