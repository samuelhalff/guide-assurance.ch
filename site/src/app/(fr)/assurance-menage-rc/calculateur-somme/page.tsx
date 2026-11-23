import type { Metadata } from "next";
import { PageSommeMenage, metaSommeMenage } from "@/components/outils/page-somme-menage";

export const metadata: Metadata = metaSommeMenage("fr");

export default function Page() {
  return <PageSommeMenage locale="fr" />;
}
