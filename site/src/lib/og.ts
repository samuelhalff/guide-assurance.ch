/* Images de partage (Open Graph) par page, générées au build par src/app/og-pages/[nom]/route.tsx
   (next/og, export statique) : rubrique, titre de la page, date de mise à jour. Une page absente de la liste
   garde l'image générale de sa langue (accueil). */
import { OUTILS, OUTILS_EN } from "@/lib/nav";
import { MAJ_ISO } from "@/lib/site";
import { DATE_PAGE } from "@/lib/donnees";
import { dateLongue, type Locale } from "@/lib/i18n";
import { toutesLesPages, type PageContenu } from "@/lib/content/pages";

export type Partage = { path: string; cle: string; locale: Locale; rubrique: string; titre: string; maj: string };

const RUBRIQUES: { prefixe: string; fr: string; en: string }[] = [
  { prefixe: "/assurance-maladie/", fr: "Santé", en: "Health" },
  { prefixe: "/complementaire-sante/", fr: "Santé", en: "Health" },
  { prefixe: "/assurance-accident/", fr: "Santé", en: "Health" },
  { prefixe: "/3e-pilier/", fr: "Prévoyance", en: "Pensions" },
  { prefixe: "/entreprises/", fr: "Entreprises", en: "Business" },
  { prefixe: "/frontaliers/", fr: "Frontaliers", en: "Cross-border workers" },
  { prefixe: "/nouveaux-arrivants/", fr: "Nouveaux arrivants", en: "Moving to Switzerland" },
];
function rubriqueGuide(p: PageContenu): string {
  const fr = p.locale === "fr" ? p.slug : (p.fr ?? "");
  if (p.rubrique === "legal") return p.locale === "fr" ? "À propos du site" : "About the site";
  const r = RUBRIQUES.find((x) => fr.startsWith(x.prefixe));
  return r ? r[p.locale] : p.locale === "fr" ? "Assurances" : "Insurance";
}

/* "/" -> accueil, "/en/health-insurance/compare/" -> en--health-insurance--compare */
export const clePartage = (path: string) => (path === "/" ? "accueil" : path.replace(/^\/|\/$/g, "").replace(/\//g, "--"));

const OUTIL_FR = "Outil gratuit";
const OUTIL_EN = "Free tool";

function pagesTsx(): Omit<Partage, "cle">[] {
  return [
    { path: "/", locale: "fr", rubrique: "Suisse romande", titre: "Comparez vos primes maladie 2027, sans faux pas", maj: DATE_PAGE.accueil },
    { path: "/en/", locale: "en", rubrique: "French-speaking Switzerland", titre: "Compare your 2027 health insurance premiums", maj: DATE_PAGE.accueil },
    { path: "/guides/", locale: "fr", rubrique: "Guides", titre: "Tous les guides d’assurance", maj: MAJ_ISO },
    { path: "/en/guides/", locale: "en", rubrique: "Guides", titre: "All insurance guides", maj: MAJ_ISO },
    { path: OUTILS.comparateur, locale: "fr", rubrique: OUTIL_FR, titre: "Comparer les primes de l’assurance maladie 2027", maj: DATE_PAGE.comparateur },
    { path: OUTILS_EN.comparateur, locale: "en", rubrique: OUTIL_EN, titre: "Compare 2027 health insurance premiums", maj: DATE_PAGE.comparateur },
    { path: OUTILS.lettre, locale: "fr", rubrique: OUTIL_FR, titre: "Votre lettre de résiliation d’assurance maladie", maj: MAJ_ISO },
    { path: OUTILS_EN.lettre, locale: "en", rubrique: OUTIL_EN, titre: "Your health insurance cancellation letter", maj: MAJ_ISO },
    { path: OUTILS.simulateur, locale: "fr", rubrique: OUTIL_FR, titre: "Frontalier : LAMal ou assurance maladie française ?", maj: MAJ_ISO },
    { path: OUTILS_EN.simulateur, locale: "en", rubrique: OUTIL_EN, titre: "Cross-border worker: LAMal or French health insurance?", maj: MAJ_ISO },
    { path: OUTILS.taux3a, locale: "fr", rubrique: OUTIL_FR, titre: "Taux d’intérêt des comptes 3a", maj: DATE_PAGE.taux3a },
    { path: OUTILS_EN.taux3a, locale: "en", rubrique: OUTIL_EN, titre: "Pillar 3a account interest rates", maj: DATE_PAGE.taux3a },
    { path: OUTILS.impot3a, locale: "fr", rubrique: OUTIL_FR, titre: "Économie d’impôt grâce au 3e pilier", maj: DATE_PAGE.impot3a },
    { path: OUTILS_EN.impot3a, locale: "en", rubrique: OUTIL_EN, titre: "Tax savings from pillar 3a", maj: DATE_PAGE.impot3a },
  ];
}

let cache: Partage[] | null = null;
export function pagesPartage(): Partage[] {
  if (cache) return cache;
  const guides = (["fr", "en"] as const).flatMap((l) =>
    toutesLesPages(l).map((p) => ({ path: p.slug, locale: l, rubrique: rubriqueGuide(p), titre: p.h1, maj: p.updated })),
  );
  cache = [...pagesTsx(), ...guides].map((p) => ({ ...p, cle: clePartage(p.path) }));
  return cache;
}

export const partageParCle = (cle: string) => pagesPartage().find((p) => p.cle === cle);

/* Adresse de l'image d'une page ; l'accueil de la langue sinon. */
export function imagePartage(path: string, locale: Locale): string {
  const p = pagesPartage().find((x) => x.path === path);
  return `/og-pages/${p ? p.cle : locale === "en" ? "en" : "accueil"}.png`;
}

export const ligneMaj = (p: Partage) => `${p.locale === "fr" ? "Mis à jour le" : "Updated on"} ${dateLongue(p.maj, p.locale)}`;
