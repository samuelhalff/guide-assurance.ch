import type { Metadata } from "next";
import { PagePrimesUe, metaPrimesUe } from "@/components/outils/pages-primes-ue";

export const metadata: Metadata = metaPrimesUe("en");

export default function Page() {
  return <PagePrimesUe locale="en" />;
}
