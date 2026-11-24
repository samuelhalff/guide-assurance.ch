"use client";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";

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

/* `pleine` : bouton sur toute la largeur, libellé centré (encadré du résultat ménage). */
export function CtaOffres({ locale, href, libelle, note, className, pleine, onClick }: { locale: Locale; href: string; libelle?: string; note?: ReactNode; className?: string; pleine?: boolean; onClick?: () => void }) {
  const t = TEXTE_OFFRES[locale];
  return (
    <div className={`cta-demande cta-offres${className ? ` ${className}` : ""}`}>
      <a data-slot="button" className={cn(buttonVariants(), pleine ? "w-full justify-center" : "max-[719px]:justify-between")} href={href} onClick={onClick}>
        {libelle ?? t.bouton}
        {FLECHE}
      </a>
      <p>{note ?? t.rassurance}</p>
    </div>
  );
}

/* `detail` : seconde ligne, plus petite (ex. la somme assurée), pour que le libellé tienne sur une ligne à côté du bouton de l'assistant. */
export function BarreOffres({ locale, href, libelle, detail, visible, onClick }: { locale: Locale; href: string; libelle?: string; detail?: string; visible: boolean; onClick?: () => void }) {
  return (
    <div className="barre-demande barre-offres" data-visible={visible || undefined} aria-hidden={!visible} inert={!visible}>
      <a data-slot="button" className={buttonVariants({ size: "barre" })} href={href} onClick={onClick}>
        <span>{libelle ?? TEXTE_OFFRES[locale].bouton}</span>
        {detail ? <small>{detail}</small> : null}
      </a>
    </div>
  );
}
