"use client";
import { suivre } from "@/lib/analytics";
import { RAPPEL, ecrirePreremplissage, lirePreremplissage } from "@/lib/demande";

export type EmplacementRappel = "tete" | "accueil" | "guide" | "comparateur" | "produit" | "outil3a";

/* Lien vers le formulaire court « Être rappelé ». Le clic part vers PostHog (rappel_ouvert, emplacement seul). */
export function LienRappel({
  locale = "fr",
  emplacement,
  sujet,
  className,
  children,
  ...rest
}: {
  locale?: "fr" | "en";
  emplacement: EmplacementRappel;
  /** Sujet du formulaire court à présélectionner (code de la porte rappel), passé par sessionStorage, jamais par l'URL. */
  sujet?: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick">) {
  const ouvrir = () => {
    if (sujet) ecrirePreremplissage({ ...lirePreremplissage(), besoin: [sujet] });
    suivre("rappel_ouvert", { emplacement }, true);
  };
  return (
    <a {...rest} className={className} href={RAPPEL[locale]} onClick={ouvrir}>
      {children}
    </a>
  );
}

/* Combiné de téléphone, 18 px, trait courant. */
export function IconeTelephone({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}
