"use client";
import { useEffect, useRef, type RefObject } from "react";
import { suivre } from "@/lib/analytics";
import { RAPPEL, ecrirePreremplissage, lirePreremplissage } from "@/lib/demande";

export type EmplacementRappel = "tete" | "accueil" | "guide" | "comparateur" | "produit" | "outil3a" | "lettre" | "frontalier" | "rappels" | "barometre" | "kit_rh" | "donnees" | "actualite";

/* Vue d'un appel « Être rappelé » : rappel_vu {emplacement}, une fois par emplacement et par page, quand la moitié
   de l'appel est à l'écran. Rien d'autre ne part (aucune valeur saisie). La tête est exclue : toujours visible,
   sa vue doublerait les pages vues. */
const vus = new Set<EmplacementRappel>();
export function useRappelVu(ref: RefObject<Element | null>, emplacement: EmplacementRappel, actif = true) {
  useEffect(() => {
    const el = ref.current;
    if (!actif || !el || emplacement === "tete" || vus.has(emplacement) || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entrees) => {
        if (!entrees.some((e) => e.isIntersecting)) return;
        io.disconnect();
        if (vus.has(emplacement)) return;
        vus.add(emplacement);
        suivre("rappel_vu", { emplacement });
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, emplacement, actif]);
}

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
  const ref = useRef<HTMLAnchorElement>(null);
  useRappelVu(ref, emplacement);
  const ouvrir = () => {
    if (sujet) ecrirePreremplissage({ ...lirePreremplissage(), besoin: [sujet] });
    suivre("rappel_ouvert", { emplacement }, true);
  };
  return (
    <a {...rest} ref={ref} className={className} href={RAPPEL[locale]} onClick={ouvrir}>
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
