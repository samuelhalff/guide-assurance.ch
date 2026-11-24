import type { Porte } from "@shared/demande/portes-cles";
import { TEXTE_CTA, TEXTE_RAPPEL, lienDemande } from "@/lib/demande";
import { LienRappel, type EmplacementRappel } from "@/components/demande/lien-rappel";
import { buttonVariants } from "@/components/ui/button";

/* Appel au formulaire de demande : bouton plein + ligne de réassurance + lien vers le formulaire court « Être rappelé ». `onClick` sert au simulateur
   (préremplissage en sessionStorage juste avant de partir). */
export function CtaDemande({ locale = "fr", porte, onClick, emplacement = "guide" }: { locale?: "fr" | "en"; porte: Porte; onClick?: () => void; emplacement?: EmplacementRappel }) {
  const t = TEXTE_CTA[locale];
  return (
    <div className="cta-demande">
      <a className={buttonVariants({ className: "max-[719px]:justify-between" })} href={lienDemande(locale, porte)} onClick={onClick}>
        {t.bouton}
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </a>
      <p>{t.rassurance}</p>
      <p className="cta-rappel">
        {TEXTE_RAPPEL[locale].guideQ}{" "}
        <LienRappel locale={locale} emplacement={emplacement} sujet={emplacement === "frontalier" ? "frontaliers" : undefined}>{TEXTE_RAPPEL[locale].guideLien}</LienRappel>
        {TEXTE_RAPPEL[locale].guideSuite}
      </p>
    </div>
  );
}
