import type { Metadata } from "next";
import { PageHistorique3a, metaHistorique3a } from "@/components/donnees/page-historique-3a";

export const metadata: Metadata = metaHistorique3a("fr");

export default function Page() {
  return <PageHistorique3a locale="fr" />;
}
