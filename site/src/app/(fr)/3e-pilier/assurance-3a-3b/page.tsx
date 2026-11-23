import type { Metadata } from "next";
import { PageAssurance3a, metaAssurance3a } from "@/components/outils/page-assurance-3a";

export const metadata: Metadata = metaAssurance3a("fr");

export default function Page() {
  return <PageAssurance3a locale="fr" />;
}
