/* Actualités côté site : articles lus au build (lib/actualites-core.ts), outils liés, jetons d'aperçu. */
import path from "node:path";
import { OUTILS, OUTILS_EN, PAGES_DONNEES, PAGES_DONNEES_EN } from "@/lib/nav";
import { ROUTES_IDEES } from "@/lib/pages-idees";
import { brouillonsDe, jetonApercu, lireDossier, publies, type Article, type LocaleA } from "@/lib/actualites-core";

export * from "@/lib/actualites-core";

const DIR = (l: LocaleA) => path.join(process.cwd(), "content", l, "actualites");
const cache: Partial<Record<LocaleA, Article[]>> = {};
export const tousLesArticles = (l: LocaleA) => (cache[l] ??= lireDossier(DIR(l), l));
export const articlesPublies = (l: LocaleA) => publies(tousLesArticles(l));
export const brouillons = (l: LocaleA) => brouillonsDe(tousLesArticles(l));
export const articlePublie = (l: LocaleA, slug: string) => articlesPublies(l).find((a) => a.slug === slug);

/* Article de l'autre langue, seulement s'il est publié lui aussi. */
export function equivalentPublie(a: Article): Article | undefined {
  if (a.locale === "en") return a.fr ? articlePublie("fr", a.fr) : undefined;
  return articlesPublies("en").find((x) => x.fr === a.slug);
}

/* Clé des jetons d'aperçu (site/.env.local, jamais dans le dépôt public). Absente : aucun aperçu construit. */
export const CLE_APERCU = process.env.ACTUALITES_APERCU_CLE ?? "";
export type Apercu = { jeton: string; article?: Article; index?: true };
export function apercus(l: LocaleA): Apercu[] {
  if (CLE_APERCU.length < 32) return [];
  const xs: Apercu[] = brouillons(l).map((a) => ({ jeton: jetonApercu(CLE_APERCU, l, a.slug), article: a }));
  if (l === "fr") xs.push({ jeton: jetonApercu(CLE_APERCU, "index"), index: true });
  return xs;
}
export const cheminApercu = (l: LocaleA, slug: string) => `${l === "fr" ? "/apercu/" : "/en/preview/"}${jetonApercu(CLE_APERCU, l, slug)}/`;

/* Outils liés (clés du champ `outils`). */
export const OUTILS_ACTUALITES: Record<string, Record<LocaleA, { href: string; titre: string; detail: string }>> = {
  comparateur: {
    fr: { href: OUTILS.comparateur, titre: "Comparer les primes LAMal 2027", detail: "Primes approuvées de votre région, de la plus basse à la plus haute" },
    en: { href: OUTILS_EN.comparateur, titre: "Compare 2027 LAMal premiums", detail: "Approved premiums in your region, lowest first" },
  },
  lettre: {
    fr: { href: OUTILS.lettre, titre: "Lettre de résiliation", detail: "Date limite et lettre prête à imprimer" },
    en: { href: OUTILS_EN.lettre, titre: "Cancellation letter", detail: "Deadline and a letter ready to print" },
  },
  rappels: {
    fr: { href: ROUTES_IDEES.rappels.fr, titre: "Rappels d’échéance dans l’agenda", detail: "Fichier .ics, sans adresse e-mail" },
    en: { href: ROUTES_IDEES.rappels.en, titre: "Renewal reminders in your calendar", detail: ".ics file, no e-mail address" },
  },
  barometre: {
    fr: { href: ROUTES_IDEES.barometre.fr, titre: "Baromètre des primes 2027", detail: "Hausse et écarts par canton romand" },
    en: { href: ROUTES_IDEES.barometre.en, titre: "2027 premium barometer", detail: "Increase and spread by canton" },
  },
  chiffres: {
    fr: { href: PAGES_DONNEES.chiffres, titre: "Chiffres clés 2027", detail: "Une phrase datée et sourcée par chiffre" },
    en: { href: PAGES_DONNEES_EN.chiffres, titre: "2027 key figures", detail: "One dated, sourced sentence per figure" },
  },
  regions: {
    fr: { href: PAGES_DONNEES.regions, titre: "Primes 2027 par région", detail: "Médiane, quartiles, minimum et maximum" },
    en: { href: PAGES_DONNEES_EN.regions, titre: "2027 premiums by region", detail: "Median, quartiles, minimum and maximum" },
  },
  taux3a: {
    fr: { href: OUTILS.taux3a, titre: "Taux des comptes 3a", detail: "Taux relevés sur les pages des banques" },
    en: { href: OUTILS_EN.taux3a, titre: "Pillar 3a interest rates", detail: "Rates read on the banks’ own pages" },
  },
  historique3a: {
    fr: { href: PAGES_DONNEES.historique3a, titre: "Historique des taux 3a", detail: "Un relevé chaque lundi, CSV" },
    en: { href: PAGES_DONNEES_EN.historique3a, titre: "Pillar 3a rate history", detail: "A survey every Monday, CSV" },
  },
  impot3a: {
    fr: { href: OUTILS.impot3a, titre: "Économie d’impôt 3a", detail: "Barèmes 2026 de Suisse romande" },
    en: { href: OUTILS_EN.impot3a, titre: "Pillar 3a tax savings", detail: "2026 scales, French-speaking Switzerland" },
  },
  simulateur: {
    fr: { href: OUTILS.simulateur, titre: "Simulateur frontalier", detail: "LAMal ou assurance française" },
    en: { href: OUTILS_EN.simulateur, titre: "Cross-border calculator", detail: "LAMal or French insurance" },
  },
};

export const outilsLiesActualite = (a: Article) =>
  a.outils.map((k) => OUTILS_ACTUALITES[k]?.[a.locale]).filter((x): x is NonNullable<typeof x> => Boolean(x));


/* Paramètre factice quand une route dynamique n'a rien à construire (l'export statique refuse une liste vide). */
export const VIDE = "_";
