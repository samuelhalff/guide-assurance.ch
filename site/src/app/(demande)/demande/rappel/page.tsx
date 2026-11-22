import type { Metadata } from "next";
import { FormulaireRappel } from "@/components/demande/formulaire-rappel";

export const metadata: Metadata = {
  title: { absolute: "Être rappelé | Guide Assurance" },
  description: "Laissez votre nom et votre numéro de téléphone\u202f: un conseiller d’un courtier partenaire vous rappelle pour faire le point, sans frais ni engagement.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <FormulaireRappel locale="fr" />;
}
