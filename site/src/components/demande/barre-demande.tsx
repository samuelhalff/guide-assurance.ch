"use client";
import { useEffect, useRef, useState } from "react";
import { useRappelVu } from "@/components/demande/lien-rappel";
import type { Porte } from "@shared/demande/portes";
import { RAPPEL, TEXTE_CTA, TEXTE_RAPPEL, ecrirePreremplissage, lienDemande, lirePreremplissage } from "@/lib/demande";
import { suivre } from "@/lib/analytics";
import { buttonVariants } from "@/components/ui/button";

const CLE_MASQUEE = "ga-barre-demande-masquee";

/* Barre collante du bas d'écran, mobile seulement (CSS), visible après la moitié de la page.
   Masquée pour la session si le lecteur la ferme. L'animation d'entrée saute avec prefers-reduced-motion (CSS).
   Sans porte (pages produit sans formulaire propre), elle mène au formulaire court « Être rappelé », sujet présélectionné. */
export function BarreDemande({ locale = "fr", porte, rappelSujet }: { locale?: "fr" | "en"; porte?: Porte; rappelSujet?: string }) {
  const [visible, setVisible] = useState(false);
  const [masquee, setMasquee] = useState(true);
  const lienRappel = useRef<HTMLAnchorElement>(null);
  useRappelVu(lienRappel, "produit", visible && !masquee && !porte);

  useEffect(() => {
    let m = false;
    try {
      m = sessionStorage.getItem(CLE_MASQUEE) === "1";
    } catch {
      /* rien */
    }
    setMasquee(m);
    if (m) return;
    const verifier = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setVisible(max > 0 && window.scrollY / max >= 0.5);
    };
    verifier();
    window.addEventListener("scroll", verifier, { passive: true });
    window.addEventListener("resize", verifier);
    return () => {
      window.removeEventListener("scroll", verifier);
      window.removeEventListener("resize", verifier);
    };
  }, []);

  if (masquee) return null;
  const t = TEXTE_CTA[locale];
  const masquer = () => {
    setMasquee(true);
    try {
      sessionStorage.setItem(CLE_MASQUEE, "1");
    } catch {
      /* rien */
    }
  };
  return (
    <div className="barre-demande" data-visible={visible || undefined} aria-hidden={!visible} inert={!visible}>
      {porte ? (
        <a data-slot="button" className={buttonVariants({ size: "barre" })} href={lienDemande(locale, porte)}>
          {t.bouton}
        </a>
      ) : (
        <a
          ref={lienRappel}
          className={buttonVariants({ size: "barre" })}
          href={RAPPEL[locale]}
          onClick={() => {
            if (rappelSujet) ecrirePreremplissage({ ...lirePreremplissage(), besoin: [rappelSujet] });
            suivre("rappel_ouvert", { emplacement: "produit" }, true);
          }}
        >
          {TEXTE_RAPPEL[locale].tete}
        </a>
      )}
      <button type="button" className="commande" onClick={masquer} aria-label={t.fermer}>
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
