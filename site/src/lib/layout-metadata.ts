import type { Metadata, Viewport } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { robotsMeta } from "@/lib/metadata";

/* Métadonnées communes aux deux mises en page racines (fr à la racine, en sous /en/). */
export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  robots: robotsMeta,
  /* Icônes : fichiers src/app/favicon.ico, icon.svg et apple-icon.png (tuile encre, bouquetin ocre). */
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
};

export const baseViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#1B1E1A" },
  ],
};
