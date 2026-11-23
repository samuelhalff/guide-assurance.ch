import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PORTES_DEF, PORTES_FORMULAIRE, type Porte } from "@shared/demande/portes";
import { FormulaireDemande } from "@/components/demande/formulaire-demande";
import { estPorte } from "@/lib/demande";

/* Formulaire ouvert sur une porte par son adresse (/demande/menage-rc/…) : liens des guides et des outils. */
export const dynamicParams = false;
export function generateStaticParams() {
  return PORTES_FORMULAIRE.map((porte) => ({ porte }));
}

export async function generateMetadata({ params }: { params: Promise<{ porte: string }> }): Promise<Metadata> {
  const { porte } = await params;
  const sujet = estPorte(porte) ? PORTES_DEF[porte].sujet.fr : "vos assurances";
  return {
    title: { absolute: "Votre demande | Guide Assurance" },
    description: `Décrivez votre besoin pour ${sujet} en trois étapes. Un conseiller d’un courtier partenaire vous rappelle pour comparer les offres avec vous, sans frais ni engagement.`,
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: { params: Promise<{ porte: string }> }) {
  const { porte } = await params;
  if (!estPorte(porte)) notFound();
  return <FormulaireDemande locale="fr" porte={porte as Porte} />;
}
