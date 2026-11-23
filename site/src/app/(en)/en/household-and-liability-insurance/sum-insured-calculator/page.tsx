import type { Metadata } from "next";
import { PageSommeMenage, metaSommeMenage } from "@/components/outils/page-somme-menage";

export const metadata: Metadata = metaSommeMenage("en");

export default function Page() {
  return <PageSommeMenage locale="en" />;
}
