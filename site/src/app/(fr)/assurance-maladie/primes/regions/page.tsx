import type { Metadata } from "next";
import { PageRegions, metaRegions } from "@/components/donnees/page-regions";

export const metadata: Metadata = metaRegions("fr");

export default function Page() {
  return <PageRegions locale="fr" />;
}
