import type { Metadata } from "next";
import { PageGarantiesPj, metaGarantiesPj } from "@/components/outils/page-garanties-pj";

export const metadata: Metadata = metaGarantiesPj("en");

export default function Page() {
  return <PageGarantiesPj locale="en" />;
}
