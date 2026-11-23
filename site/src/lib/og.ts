/* Images de partage (Open Graph) par page, générées au build par src/app/og-pages/[nom]/route.tsx
   (next/og, export statique) : rubrique, titre de la page, date de mise à jour. Une page absente de la liste
   garde l'image générale de sa langue (accueil). */
import { HUB_OUTILS, OUTILS, OUTILS_EN, PAGES_DONNEES, PAGES_DONNEES_EN, SLUG_CANTON_3A } from "@/lib/nav";
import { DATE_PAGE, DATE_PAGE_DONNEES, DATE_PAGE_OUTILS } from "@/lib/donnees";
import { dateLongue, type Locale } from "@/lib/i18n";
import { dateIndexGuides, toutesLesPages, type PageContenu } from "@/lib/content/pages";
import { pagesIdees } from "@/lib/pages-idees";
import { BASE_ACTUALITES, articlesPublies, cheminArticle } from "@/lib/actualites";

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
    { path: "/guides/", locale: "fr", rubrique: "Guides", titre: "Tous les guides d’assurance", maj: dateIndexGuides("fr") },
    { path: "/en/guides/", locale: "en", rubrique: "Guides", titre: "All insurance guides", maj: dateIndexGuides("en") },
    { path: HUB_OUTILS.fr, locale: "fr", rubrique: "Outils et chiffres", titre: "Outils gratuits et chiffres de l’assurance en Suisse romande", maj: DATE_PAGE_OUTILS },
    { path: HUB_OUTILS.en, locale: "en", rubrique: "Tools and figures", titre: "Free tools and insurance figures for French-speaking Switzerland", maj: DATE_PAGE_OUTILS },
    { path: OUTILS.comparateur, locale: "fr", rubrique: OUTIL_FR, titre: "Comparer les primes de l’assurance maladie 2027", maj: DATE_PAGE.comparateur },
    { path: OUTILS_EN.comparateur, locale: "en", rubrique: OUTIL_EN, titre: "Compare 2027 health insurance premiums", maj: DATE_PAGE.comparateur },
    { path: OUTILS.lettre, locale: "fr", rubrique: OUTIL_FR, titre: "Votre lettre de résiliation d’assurance maladie", maj: DATE_PAGE.lettre },
    { path: OUTILS_EN.lettre, locale: "en", rubrique: OUTIL_EN, titre: "Your health insurance cancellation letter", maj: DATE_PAGE.lettre },
    { path: OUTILS.simulateur, locale: "fr", rubrique: OUTIL_FR, titre: "Frontalier : LAMal ou assurance maladie française ?", maj: DATE_PAGE.simulateur },
    { path: OUTILS_EN.simulateur, locale: "en", rubrique: OUTIL_EN, titre: "Cross-border worker: LAMal or French health insurance?", maj: DATE_PAGE.simulateur },
    { path: OUTILS.taux3a, locale: "fr", rubrique: OUTIL_FR, titre: "Taux et frais du 3e pilier", maj: DATE_PAGE.taux3a },
    { path: OUTILS_EN.taux3a, locale: "en", rubrique: OUTIL_EN, titre: "Pillar 3a rates and fees", maj: DATE_PAGE.taux3a },
    { path: OUTILS.assurance3a, locale: "fr", rubrique: "3e pilier", titre: "3a et 3b auprès d’un assureur", maj: DATE_PAGE.assurance3a },
    { path: OUTILS_EN.assurance3a, locale: "en", rubrique: "Pillar 3a", titre: "Pillar 3a and 3b with an insurer", maj: DATE_PAGE.assurance3a },
    { path: OUTILS.impot3a, locale: "fr", rubrique: OUTIL_FR, titre: "Économie d’impôt grâce au 3e pilier", maj: DATE_PAGE.impot3a },
    { path: OUTILS_EN.impot3a, locale: "en", rubrique: OUTIL_EN, titre: "Tax savings from pillar 3a", maj: DATE_PAGE.impot3a },
    { path: OUTILS.sommeMenage, locale: "fr", rubrique: OUTIL_FR, titre: "Calculer la somme d’assurance de son ménage", maj: DATE_PAGE.sommeMenage },
    { path: OUTILS_EN.sommeMenage, locale: "en", rubrique: OUTIL_EN, titre: "Work out the sum insured for your household contents", maj: DATE_PAGE.sommeMenage },
    { path: OUTILS.garantiesPj, locale: "fr", rubrique: "Protection juridique", titre: "Protection juridique : ce que couvrent les contrats", maj: DATE_PAGE.garantiesPj },
    { path: OUTILS_EN.garantiesPj, locale: "en", rubrique: "Legal protection", titre: "Legal protection insurance: what the policies cover", maj: DATE_PAGE.garantiesPj },
    ...pagesDonnees(),
  ];
}

/* Pages de données (rapport 08, idées 2, 3, 6, 9). */
const NOMS_3A = {
  fr: { GE: "Genève", VD: "Vaud", VS: "Valais", FR: "Fribourg", NE: "Neuchâtel", JU: "Jura", BE: "Jura bernois" },
  en: { GE: "Geneva", VD: "Vaud", VS: "Valais", FR: "Fribourg", NE: "Neuchâtel", JU: "Jura", BE: "Bernese Jura" },
} as const;
function pagesDonnees(): Omit<Partage, "cle">[] {
  const D = DATE_PAGE_DONNEES;
  const cantons = (Object.keys(NOMS_3A.fr) as (keyof typeof NOMS_3A.fr)[]).flatMap((c) => [
    { path: `${PAGES_DONNEES.communes3a}${SLUG_CANTON_3A.fr[c]}/`, locale: "fr" as const, rubrique: "Données", titre: `Économie d’impôt 3a par commune : ${NOMS_3A.fr[c]}`, maj: D.communes3a },
    { path: `${PAGES_DONNEES_EN.communes3a}${SLUG_CANTON_3A.en[c]}/`, locale: "en" as const, rubrique: "Data", titre: `Pillar 3a tax savings by municipality: ${NOMS_3A.en[c]}`, maj: D.communes3a },
  ]);
  return [
    { path: PAGES_DONNEES.chiffres, locale: "fr", rubrique: "Données", titre: "Chiffres clés 2027 : assurance maladie et 3e pilier", maj: D.chiffres },
    { path: PAGES_DONNEES_EN.chiffres, locale: "en", rubrique: "Data", titre: "2027 key figures: health insurance and pillar 3a", maj: D.chiffres },
    { path: PAGES_DONNEES.regions, locale: "fr", rubrique: "Données", titre: "Primes LAMal 2027 par région de prime", maj: D.regions },
    { path: PAGES_DONNEES_EN.regions, locale: "en", rubrique: "Data", titre: "2027 health insurance premiums by premium region", maj: D.regions },
    { path: PAGES_DONNEES.historique3a, locale: "fr", rubrique: "Données", titre: "Historique des taux des comptes 3a", maj: D.historique3a },
    { path: PAGES_DONNEES_EN.historique3a, locale: "en", rubrique: "Data", titre: "Pillar 3a interest rate history", maj: D.historique3a },
    { path: PAGES_DONNEES.communes3a, locale: "fr", rubrique: "Données", titre: "Économie d’impôt 3a commune par commune", maj: D.communes3a },
    { path: PAGES_DONNEES_EN.communes3a, locale: "en", rubrique: "Data", titre: "Pillar 3a tax savings, municipality by municipality", maj: D.communes3a },
    ...cantons,
  ];
}

let cache: Partage[] | null = null;
export function pagesPartage(): Partage[] {
  if (cache) return cache;
  const guides = (["fr", "en"] as const).flatMap((l) =>
    toutesLesPages(l).map((p) => ({ path: p.slug, locale: l, rubrique: rubriqueGuide(p), titre: p.h1, maj: p.updated })),
  );
  const idees = pagesIdees().flatMap((p) => [
    { path: p.fr, locale: "fr" as const, rubrique: p.rubriqueFr, titre: p.titreFr, maj: p.lastmod },
    { path: p.en, locale: "en" as const, rubrique: p.rubriqueEn, titre: p.titreEn, maj: p.lastmod },
  ]);
  /* Actualités publiées (et leur liste dès le premier article) ; jamais les brouillons. */
  const actus = (["fr", "en"] as const).flatMap((l) => {
    const xs = articlesPublies(l);
    const rub = l === "fr" ? "Actualités" : "News";
    return [
      ...(xs.length ? [{ path: BASE_ACTUALITES[l], locale: l, rubrique: rub, titre: l === "fr" ? "Actualités de l’assurance en Suisse romande" : "Insurance news, French-speaking Switzerland", maj: xs[0].dateModified }] : []),
      ...xs.map((a) => ({ path: cheminArticle(a), locale: l, rubrique: rub, titre: a.title, maj: a.dateModified })),
    ];
  });
  cache = [...pagesTsx(), ...guides, ...idees, ...actus].map((p) => ({ ...p, cle: clePartage(p.path) }));
  return cache;
}

export const partageParCle = (cle: string) => pagesPartage().find((p) => p.cle === cle);

/* Adresse de l'image d'une page ; l'accueil de la langue sinon. */
export function imagePartage(path: string, locale: Locale): string {
  const p = pagesPartage().find((x) => x.path === path);
  return `/og-pages/${p ? p.cle : locale === "en" ? "en" : "accueil"}.png`;
}

export const ligneMaj = (p: Partage) => `${p.locale === "fr" ? "Mis à jour le" : "Updated on"} ${dateLongue(p.maj, p.locale)}`;
