import type { Metadata, Viewport } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { robotsMeta } from "@/lib/metadata";

/* Vérification Bing Webmaster Tools (rapport 09, G4) : valeur de la balise msvalidate.01 fournie par Bing, lue au
   build dans NEXT_PUBLIC_BING_VERIFICATION. Vide ou absente : aucune balise. */
const BING_VERIFICATION = process.env.NEXT_PUBLIC_BING_VERIFICATION?.trim();

/* Métadonnées communes aux deux mises en page racines (fr à la racine, en sous /en/). */
export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  robots: robotsMeta,
  /* Icônes : fichiers src/app/favicon.ico, icon.svg et apple-icon.png (tuile encre, bouquetin ocre). */
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
  /* Vérification du domaine pour Trustpilot (compte Guide Assurance, 23.11.2026) : identifiant public, sans secret. */
  verification: {
    other: {
      "trustpilot-one-time-domain-verification-id": "8db0af47-c69f-465f-8cc5-f95bf37dbbe2",
      ...(BING_VERIFICATION ? { "msvalidate.01": BING_VERIFICATION } : {}),
    },
  },
};

export const baseViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#1B1E1A" },
  ],
};
