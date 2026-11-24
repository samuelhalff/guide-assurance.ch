import type { Metadata } from "next";
import { PageLibrePassage, metaLibrePassage } from "@/components/outils/page-libre-passage";

export const metadata: Metadata = metaLibrePassage("en");

export default function Page() {
  return <PageLibrePassage locale="en" />;
}
