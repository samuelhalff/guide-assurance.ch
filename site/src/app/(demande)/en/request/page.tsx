import type { Metadata } from "next";
import { FormulaireDemande } from "@/components/demande/formulaire-demande";

export const metadata: Metadata = {
  title: { absolute: "Your request | Guide Assurance" },
  description: "Describe your needs in three steps. An adviser from a partner broker then calls you back to compare offers with you, at no cost and with no commitment.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <FormulaireDemande locale="en" />;
}
