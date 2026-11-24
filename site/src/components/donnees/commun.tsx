import { FaqSections } from "@/components/site/faq-sections";
import { IconeTelephone, LienRappel } from "@/components/demande/lien-rappel";
import type { Locale } from "@/lib/i18n";
import { nombre as formaterNombre } from "@/lib/nombres";

/* Éléments communs des pages de données (régions de primes, chiffres clés, historique 3a, économie d'impôt par
   commune) : formats de nombres, questions fréquentes, appel « Être rappelé » (emplacement `donnees`). */
export const N = "\u202f";
/* 1234.5 -> « 1 234,50 » / "1,234.50" ; d décimales (src/lib/nombres.ts, sans Intl). */
export const nombre = (x: number, locale: Locale, d = 0) => formaterNombre(x, d, locale);
export const chf = (x: number, locale: Locale, d = 0) => (locale === "fr" ? `${nombre(x, locale, d)}${N}CHF` : `CHF ${nombre(x, locale, d)}`);
export const pct = (x: number, locale: Locale, d = 0) => (locale === "fr" ? `${nombre(x, locale, d)}${N}%` : `${nombre(x, locale, d)}%`);

export type Faq = { q: string; a: string };
/* FAQ visible : composant commun des pages outils (FaqSections), alimenté par le même tableau que le nœud
   FAQPage du JSON-LD (faqLd), donc texte identique. */
export function Faqs({ faq, maj }: { faq: Faq[]; maj: string }) {
  return (
    <div className="wrap faq">
      <FaqSections faq={faq.map((f) => ({ q: f.q, a: [f.a] }))} />
      <p className="maj">{maj}</p>
    </div>
  );
}

/* Appel discret « Être rappelé » : sujet du formulaire court présélectionné (sante, prevoyance). */
export function AppelRappel({ locale, sujet, question }: { locale: Locale; sujet: "sante" | "prevoyance"; question: string }) {
  return (
    <p className="rappel-liste">
      {question}{" "}
      <LienRappel locale={locale} emplacement="donnees" sujet={sujet}>
        <IconeTelephone size={16} />
        {locale === "fr" ? "Être rappelé" : "Request a call-back"}
      </LienRappel>
    </p>
  );
}

/* Lien de téléchargement d'un fichier de données (CSV). */
export function Telechargement({ href, libelle, detail }: { href: string; libelle: string; detail: string }) {
  return (
    <p className="telechargement">
      <a href={href} download>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 3v10M6 9.5l4 4 4-4M4 16.5h12" />
        </svg>
        {libelle}
      </a>{" "}
      <span>{detail}</span>
    </p>
  );
}
