import type { Metadata } from "next";
import { PagePrimesUe, metaPrimesUe } from "@/components/outils/pages-primes-ue";

export const metadata: Metadata = metaPrimesUe("fr");

export default function Page() {
  return <PagePrimesUe locale="fr" />;
}
