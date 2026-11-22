import type { Metadata } from "next";
import { PageImpot3a, metaImpot3a } from "@/components/outils/pages-3a";

export const metadata: Metadata = metaImpot3a("en");

export default function Page() {
  return <PageImpot3a locale="en" />;
}
