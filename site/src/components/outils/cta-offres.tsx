"use client";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n";

/* Appel « Recevoir des offres » des outils ménage et protection juridique : même bouton que CtaDemande, mais vers une
   porte de la demande (adresse construite par DEMANDE_PORTE, src/lib/demande-porte.ts).
   BarreOffres : version collante du bas d'écran (mobile seulement, styles .barre-demande), affichée quand `visible`. */
export const TEXTE_OFFRES = {
  fr: { bouton: "Recevoir des offres", rassurance: "C’est gratuit et sans engagement, et un seul conseiller vous contacte." },
  en: { bouton: "Get quotes", rassurance: "It is free and without commitment, and only one adviser contacts you." },
} as const;

const FLECHE = (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export function CtaOffres({ locale, href, libelle, note, className }: { locale: Locale; href: string; libelle?: string; note?: ReactNode; className?: string }) {
  const t = TEXTE_OFFRES[locale];
  return (
    <div className={`cta-demande cta-offres${className ? ` ${className}` : ""}`}>
      <a className="bouton" href={href}>
        {libelle ?? t.bouton}
        {FLECHE}
      </a>
      <p>{note ?? t.rassurance}</p>
    </div>
  );
}

export function BarreOffres({ locale, href, libelle, visible }: { locale: Locale; href: string; libelle?: string; visible: boolean }) {
  return (
    <div className="barre-demande barre-offres" data-visible={visible || undefined} aria-hidden={!visible} inert={!visible}>
      <a className="bouton" href={href}>
        {libelle ?? TEXTE_OFFRES[locale].bouton}
      </a>
    </div>
  );
}
