import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PORTES_DEF, PORTES_FORMULAIRE, type Porte } from "@shared/demande/portes";
import { FormulaireDemande } from "@/components/demande/formulaire-demande";
import { estPorte } from "@/lib/demande";

/* Formulaire ouvert sur une porte par son adresse (/en/request/menage-rc/…) : liens des guides et des outils. */
export const dynamicParams = false;
export function generateStaticParams() {
  return PORTES_FORMULAIRE.map((porte) => ({ porte }));
}

export async function generateMetadata({ params }: { params: Promise<{ porte: string }> }): Promise<Metadata> {
  const { porte } = await params;
  const sujet = estPorte(porte) ? PORTES_DEF[porte].sujet.en : "your insurance";
  return {
    title: { absolute: "Your request | Guide Assurance" },
    description: `Describe what you need for ${sujet} in three steps. An adviser from a partner broker then calls you back to compare offers with you, at no cost and with no commitment.`,
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: { params: Promise<{ porte: string }> }) {
  const { porte } = await params;
  if (!estPorte(porte)) notFound();
  return <FormulaireDemande locale="en" porte={porte as Porte} />;
}
