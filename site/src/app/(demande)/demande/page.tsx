import type { Metadata } from "next";
import { FormulaireDemande } from "@/components/demande/formulaire-demande";

export const metadata: Metadata = {
  title: { absolute: "Votre demande | Guide Assurance" },
  description: "Décrivez votre besoin en trois étapes. Un conseiller d’un courtier partenaire vous rappelle pour comparer les offres avec vous, sans frais ni engagement.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <FormulaireDemande locale="fr" />;
}
