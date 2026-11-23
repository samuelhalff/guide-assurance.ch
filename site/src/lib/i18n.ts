/* Langues du site : français à la racine, anglais sous /en/. Chaînes de l'habillage commun (tête, menu, pied,
   fil d'Ariane, pages guide, partage) et correspondance des pages hors Markdown entre les deux langues.
   Les pages Markdown portent leur équivalent dans content/en/*.md (clé `fr`). */
export type Locale = "fr" | "en";

export const DICT = {
  fr: {
    navPrincipale: "Principale",
    piedNav: "Pied de page",
    filAriane: "Fil d’Ariane",
    menu: "Menu",
    fermerMenu: "Fermer le menu",
    theme: "Thème",
    accueil: "Accueil",
    marqueAria: "Guide Assurance, accueil",
    editeur: "Guide Assurance est édité par West Bay SA, Genthod (GE).",
    autreLangue: { court: "EN", long: "English", lang: "en" },
    majLe: "Mis à jour le",
    source: (n: number) => `${n} source${n > 1 ? "s" : ""}`,
    voirSources: "Voir les sources",
    outilsLies: "Outils liés",
    faq: "Questions fréquentes",
    partager: "Partager l’outil",
    lienCopie: "Lien copié.",
    copieImpossible: (url: string) => `Copie impossible : ${url}`,
    inLanguage: "fr-CH",
  },
  en: {
    navPrincipale: "Main",
    piedNav: "Footer",
    filAriane: "Breadcrumb",
    menu: "Menu",
    fermerMenu: "Close the menu",
    theme: "Theme",
    accueil: "Home",
    marqueAria: "Guide Assurance, home",
    editeur: "Guide Assurance is published by West Bay SA, Genthod (GE), Switzerland.",
    autreLangue: { court: "FR", long: "Français", lang: "fr" },
    majLe: "Updated on",
    source: (n: number) => `${n} source${n > 1 ? "s" : ""}`,
    voirSources: "Show sources",
    outilsLies: "Related tools",
    faq: "Frequently asked questions",
    partager: "Share this tool",
    lienCopie: "Link copied.",
    copieImpossible: (url: string) => `Could not copy: ${url}`,
    inLanguage: "en",
  },
} as const;

/* Format des dates affichées : « 22 novembre 2026 », « 1er décembre » ; « 22 November 2026 » en anglais. */
const FMT = {
  fr: new Intl.DateTimeFormat("fr-CH", { day: "numeric", month: "long", year: "numeric" }),
  en: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }),
};
export function dateLongue(iso: string, locale: Locale) {
  const s = FMT[locale].format(new Date(`${iso}T00:00`));
  return locale === "fr" ? s.replace(/^1 /, "1er ") : s;
}

/* Pages écrites en TSX : adresse française -> adresse anglaise. */
export const PAGES_FR_EN: Record<string, string> = {
  "/": "/en/",
  "/guides/": "/en/guides/",
  "/outils/": "/en/tools/",
  "/simulateur-frontalier/": "/en/cross-border-calculator/",
  "/lettre-resiliation/": "/en/cancellation-letter/",
  "/assurance-maladie/comparateur/": "/en/health-insurance/compare/",
  "/3e-pilier/taux-3a/": "/en/pillar-3a/interest-rates/",
  "/3e-pilier/economie-impot/": "/en/pillar-3a/tax-savings/",
  "/assurance-menage-rc/calculateur-somme/": "/en/household-and-liability-insurance/sum-insured-calculator/",
  "/protection-juridique/comparatif-garanties/": "/en/legal-protection-insurance/cover-compared/",
  /* Pages de données (rapport 08, idées 2, 3, 6, 9) : chemins aussi dans lib/nav.ts (PAGES_DONNEES, SLUG_CANTON_3A). */
  "/assurance-maladie/primes/regions/": "/en/health-insurance/premiums/regions/",
  "/chiffres-cles-2027/": "/en/key-figures-2027/",
  "/3e-pilier/taux-3a/historique/": "/en/pillar-3a/interest-rates/history/",
  "/3e-pilier/economie-impot/communes/": "/en/pillar-3a/tax-savings/municipalities/",
  "/3e-pilier/economie-impot/communes/geneve/": "/en/pillar-3a/tax-savings/municipalities/geneva/",
  "/3e-pilier/economie-impot/communes/vaud/": "/en/pillar-3a/tax-savings/municipalities/vaud/",
  "/3e-pilier/economie-impot/communes/valais/": "/en/pillar-3a/tax-savings/municipalities/valais/",
  "/3e-pilier/economie-impot/communes/fribourg/": "/en/pillar-3a/tax-savings/municipalities/fribourg/",
  "/3e-pilier/economie-impot/communes/neuchatel/": "/en/pillar-3a/tax-savings/municipalities/neuchatel/",
  "/3e-pilier/economie-impot/communes/jura-bernois/": "/en/pillar-3a/tax-savings/municipalities/bernese-jura/",
  "/3e-pilier/economie-impot/communes/jura/": "/en/pillar-3a/tax-savings/municipalities/jura/",
};
export const PAGES_EN_FR: Record<string, string> = Object.fromEntries(Object.entries(PAGES_FR_EN).map(([fr, en]) => [en, fr]));
