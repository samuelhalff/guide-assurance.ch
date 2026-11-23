import type { Metadata } from "next";
import { PageCommunes3a, metaCommunes3a } from "@/components/donnees/page-communes-3a";

export const metadata: Metadata = metaCommunes3a("fr");

export default function Page() {
  return <PageCommunes3a locale="fr" />;
}
