import type { Metadata } from "next";
import { DemandeEnvoyee } from "@/components/demande/demande-envoyee";

/* Hors sitemap (src/app/sitemap.ts ne liste que les pages publiées) et noindex. */
export const metadata: Metadata = {
  title: { absolute: "Demande envoyée | Guide Assurance" },
  robots: { index: false, follow: false },
};

export default function Page() {
  return <DemandeEnvoyee locale="fr" />;
}
