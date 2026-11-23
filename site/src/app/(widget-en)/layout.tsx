import "../styles/widget.css";
import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/site";

/* Widgets intégrables : mise en page racine sans GTM, sans PostHog, sans assistant ni thème enregistré. */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  robots: { index: false, follow: true },
  referrer: "strict-origin-when-cross-origin",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "light dark" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
