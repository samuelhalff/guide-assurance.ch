import type { Metadata } from "next";
import { PageCaissesChiffres, metaCaissesChiffres } from "@/components/outils/page-caisses-chiffres";

export const metadata: Metadata = metaCaissesChiffres("en");

export default function Page() {
  return <PageCaissesChiffres locale="en" />;
}
