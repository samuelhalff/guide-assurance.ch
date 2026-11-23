/* Navigation principale et liens du pied de page. Les rubriques sans page publiée gardent l'adresse prévue. */
/* « Actualités » : seulement quand au moins un article est publié (compté au build, next.config.ts), dans le menu
   comme dans le pied de page. */
const AVEC_ACTUS_FR = (process.env.NEXT_PUBLIC_ACTUALITES_FR ?? "0") !== "0";
const AVEC_ACTUS_EN = (process.env.NEXT_PUBLIC_ACTUALITES_EN ?? "0") !== "0";
export type Rubrique = "sante" | "frontaliers" | "arrivee" | "prevoyance" | "entreprises" | "guides" | "outils" | "actualites";

/* Page « Outils et chiffres » (hub des outils et des pages de données). */
export const HUB_OUTILS = { fr: "/outils/", en: "/en/tools/" } as const;

/* `court` : libellé de la tête au-dessus de 820 px quand la place manque (8 entrées, ou moins de 1101 px). */
export const NAV: { id: Rubrique; href: string; label: string; court?: string }[] = [
  { id: "sante", href: "/assurance-maladie/", label: "Santé" },
  { id: "frontaliers", href: "/frontaliers/", label: "Frontaliers" },
  { id: "arrivee", href: "/nouveaux-arrivants/", label: "Nouveaux arrivants" },
  { id: "prevoyance", href: "/3e-pilier/", label: "Prévoyance" },
  { id: "entreprises", href: "/entreprises/", label: "Entreprises" },
  { id: "guides", href: "/guides/", label: "Guides" },
  { id: "outils", href: HUB_OUTILS.fr, label: "Outils et chiffres", court: "Outils" },
  ...(AVEC_ACTUS_FR ? [{ id: "actualites" as const, href: "/actualites/", label: "Actualités" }] : []),
];

export const PIED: { href: string; label: string }[] = [
  ...(AVEC_ACTUS_FR ? [{ href: "/actualites/", label: "Actualités" }] : []),
  { href: "/chiffres-cles-2027/", label: "Chiffres clés 2027" },
  { href: "/integrer/", label: "Intégrer nos outils" },
  { href: "/methodologie/", label: "Méthodologie" },
  { href: "/independance/", label: "Nos liens avec les assureurs" },
  { href: "/confidentialite/", label: "Confidentialité" },
  { href: "/mentions-legales/", label: "Mentions légales" },
];

export const OUTILS = {
  simulateur: "/simulateur-frontalier/",
  lettre: "/lettre-resiliation/",
  comparateur: "/assurance-maladie/comparateur/",
  taux3a: "/3e-pilier/taux-3a/",
  impot3a: "/3e-pilier/economie-impot/",
} as const;

/* Version anglaise (sous /en/). */
export const NAV_EN: typeof NAV = [
  { id: "sante", href: "/en/health-insurance/", label: "Health" },
  { id: "frontaliers", href: "/en/cross-border-workers/", label: "Cross-border" },
  { id: "arrivee", href: "/en/moving-to-switzerland/", label: "New arrivals" },
  { id: "prevoyance", href: "/en/pillar-3a/", label: "Pensions" },
  { id: "entreprises", href: "/en/business/", label: "Business" },
  { id: "guides", href: "/en/guides/", label: "Guides" },
  { id: "outils", href: HUB_OUTILS.en, label: "Tools and figures", court: "Tools" },
  ...(AVEC_ACTUS_EN ? [{ id: "actualites" as const, href: "/en/news/", label: "News" }] : []),
];

export const PIED_EN: typeof PIED = [
  ...(AVEC_ACTUS_EN ? [{ href: "/en/news/", label: "News" }] : []),
  { href: "/en/key-figures-2027/", label: "Key figures 2027" },
  { href: "/en/embed/", label: "Embed our tools" },
  { href: "/en/methodology/", label: "Methodology" },
  { href: "/en/independence/", label: "Ties with insurers" },
  { href: "/en/privacy/", label: "Privacy" },
  { href: "/en/legal-notice/", label: "Legal notice" },
];

export const OUTILS_EN = {
  simulateur: "/en/cross-border-calculator/",
  lettre: "/en/cancellation-letter/",
  comparateur: "/en/health-insurance/compare/",
  taux3a: "/en/pillar-3a/interest-rates/",
  impot3a: "/en/pillar-3a/tax-savings/",
} as const;

export const nav = (locale: "fr" | "en") => (locale === "en" ? NAV_EN : NAV);
export const pied = (locale: "fr" | "en") => (locale === "en" ? PIED_EN : PIED);
export const outils = (locale: "fr" | "en") => (locale === "en" ? OUTILS_EN : OUTILS);

/* Pages de données (rapport 08, idées 2, 3, 6 et 9) : historique des taux 3a, chiffres clés 2027, économie d'impôt 3a
   par commune (une page par canton sous communes3a), primes 2027 par région de prime. */
export const PAGES_DONNEES = {
  regions: "/assurance-maladie/primes/regions/",
  chiffres: "/chiffres-cles-2027/",
  historique3a: "/3e-pilier/taux-3a/historique/",
  communes3a: "/3e-pilier/economie-impot/communes/",
} as const;
export const PAGES_DONNEES_EN = {
  regions: "/en/health-insurance/premiums/regions/",
  chiffres: "/en/key-figures-2027/",
  historique3a: "/en/pillar-3a/interest-rates/history/",
  communes3a: "/en/pillar-3a/tax-savings/municipalities/",
} as const;
/* Slug des pages cantonales de l'économie d'impôt par commune. */
export const SLUG_CANTON_3A = {
  fr: { GE: "geneve", VD: "vaud", VS: "valais", FR: "fribourg", NE: "neuchatel", JU: "jura", BE: "jura-bernois" },
  en: { GE: "geneva", VD: "vaud", VS: "valais", FR: "fribourg", NE: "neuchatel", JU: "jura", BE: "bernese-jura" },
} as const;
