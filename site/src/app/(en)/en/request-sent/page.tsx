import type { Metadata } from "next";
import { DemandeEnvoyee } from "@/components/demande/demande-envoyee";

/* Not in the sitemap (src/app/sitemap.ts lists published pages only) and noindex. */
export const metadata: Metadata = {
  title: { absolute: "Request sent | Guide Assurance" },
  robots: { index: false, follow: false },
};

export default function Page() {
  return <DemandeEnvoyee locale="en" />;
}
