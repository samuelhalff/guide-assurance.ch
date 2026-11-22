import type { Metadata } from "next";
import { PageTaux3a, metaTaux3a } from "@/components/outils/pages-3a";

export const metadata: Metadata = metaTaux3a("fr");

export default function Page() {
  return <PageTaux3a locale="fr" />;
}
