/* Navigation principale et liens du pied de page. Les rubriques sans page publiée gardent l'adresse prévue. */
export type Rubrique = "sante" | "frontaliers" | "arrivee" | "prevoyance" | "entreprises" | "guides";

export const NAV: { id: Rubrique; href: string; label: string }[] = [
  { id: "sante", href: "/assurance-maladie/", label: "Santé" },
  { id: "frontaliers", href: "/frontaliers/", label: "Frontaliers" },
  { id: "arrivee", href: "/nouveaux-arrivants/", label: "Nouveaux arrivants" },
  { id: "prevoyance", href: "/3e-pilier/", label: "Prévoyance" },
  { id: "entreprises", href: "/entreprises/", label: "Entreprises" },
  { id: "guides", href: "/guides/", label: "Guides" },
];

export const PIED: { href: string; label: string }[] = [
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
];

export const PIED_EN: typeof PIED = [
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
