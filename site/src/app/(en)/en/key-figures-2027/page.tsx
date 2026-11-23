import type { Metadata } from "next";
import { PageChiffresCles, metaChiffresCles } from "@/components/donnees/page-chiffres-cles";

export const metadata: Metadata = metaChiffresCles("en");

export default function Page() {
  return <PageChiffresCles locale="en" />;
}
