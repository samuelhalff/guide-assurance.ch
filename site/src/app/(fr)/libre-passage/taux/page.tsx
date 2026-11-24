import type { Metadata } from "next";
import { PageLibrePassage, metaLibrePassage } from "@/components/outils/page-libre-passage";

export const metadata: Metadata = metaLibrePassage("fr");

export default function Page() {
  return <PageLibrePassage locale="fr" />;
}
