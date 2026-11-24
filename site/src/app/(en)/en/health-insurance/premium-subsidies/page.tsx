import type { Metadata } from "next";
import { PageSubsides, metaSubsides } from "@/components/outils/page-subsides";

export const metadata: Metadata = metaSubsides("en");

export default function Page() {
  return <PageSubsides locale="en" />;
}
