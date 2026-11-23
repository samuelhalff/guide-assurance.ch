/* Baromètre des primes LAMal par canton romand. Données : src/data/barometre.json, écrit par
   data/scripts/build_barometre.py (agrégats sans nom d'assureur). Ce module met les chiffres en forme et rédige les
   phrases de chaque canton à partir des comparaisons ; aucun chiffre n'est écrit à la main ici.
   Pour l'année suivante : relancer le script, le build suit (voir docs/decisions.md, baromètre). */
import B from "@/data/barometre.json";
import { ORG_ID, WEBSITE_ID } from "@/lib/jsonld";

export type Stat = { n: number; min: number; q1: number; med: number; q3: number; max: number };
export type ProfilB = {
  cle: string;
  classe: "adulte" | "jeune" | "enfant";
  franchise: number;
  accident: boolean;
  standard: Stat;
  tous: Stat;
  prec: null | { standard_med: number; tous_med: number; tous_min: number; variation_standard_pct: number | null; variation_tous_pct: number | null };
};
export type RegionB = { region: number; commune: string; assureurs: number; profils: ProfilB[] };
export type CantonB = {
  code: string;
  officiel: { adulte: number; adulte_prec: number; variation_pct: number; jeune: number | null; enfant: number | null };
  regions: RegionB[];
};
type Donnees = {
  annee: number;
  annee_precedente: number;
  genere_le: string;
  date_donnees: string;
  source: { primes: string; moyennes: { published: string; retrieved: string; urls: string[] }; precedente: string | null };
  national: { adulte: number; adulte_prec: number; variation_pct: number };
  cantons: CantonB[];
};
export const DONNEES = B as unknown as Donnees;
export const ANNEE_BAROMETRE = DONNEES.annee;
export const ANNEE_PREC = DONNEES.annee_precedente;
/* Date de la page : la plus récente entre le relevé des primes et la publication des moyennes OFSP. */
export const DATE_BAROMETRE = DONNEES.date_donnees > DONNEES.source.moyennes.published ? DONNEES.date_donnees : DONNEES.source.moyennes.published;
export const DATE_OFSP = DONNEES.source.moyennes.published;
export const VARIATION_PAR_REGION = Boolean(DONNEES.source.precedente);

type InfoCanton = { code: string; fr: string; en: string; slugFr: string; slugEn: string; aFr: string; deFr: string; en_in: string };
const INFO: InfoCanton[] = [
  { code: "GE", fr: "Genève", en: "Geneva", slugFr: "geneve", slugEn: "geneva", aFr: "à Genève", deFr: "à Genève", en_in: "Geneva" },
  { code: "VD", fr: "Vaud", en: "Vaud", slugFr: "vaud", slugEn: "vaud", aFr: "dans le canton de Vaud", deFr: "dans le canton de Vaud", en_in: "the canton of Vaud" },
  { code: "VS", fr: "Valais", en: "Valais", slugFr: "valais", slugEn: "valais", aFr: "en Valais", deFr: "en Valais", en_in: "Valais" },
  { code: "FR", fr: "Fribourg", en: "Fribourg", slugFr: "fribourg", slugEn: "fribourg", aFr: "à Fribourg", deFr: "à Fribourg", en_in: "the canton of Fribourg" },
  { code: "NE", fr: "Neuchâtel", en: "Neuchâtel", slugFr: "neuchatel", slugEn: "neuchatel", aFr: "à Neuchâtel", deFr: "à Neuchâtel", en_in: "the canton of Neuchâtel" },
  { code: "JU", fr: "Jura", en: "Jura", slugFr: "jura", slugEn: "jura", aFr: "dans le Jura", deFr: "dans le Jura", en_in: "the canton of Jura" },
];
export const CANTONS_BAROMETRE = INFO.map((i) => ({ code: i.code, fr: i.fr, en: i.en, deFr: i.deFr }));
export const infoCanton = (code: string) => INFO.find((i) => i.code === code)!;
export const slugCanton = (code: string, l: "fr" | "en") => (l === "fr" ? infoCanton(code).slugFr : infoCanton(code).slugEn);
export const cantonParSlug = (slug: string, l: "fr" | "en") => INFO.find((i) => (l === "fr" ? i.slugFr : i.slugEn) === slug);
export const donneesCanton = (code: string) => DONNEES.cantons.find((c) => c.code === code)!;

/* ---- Formats ---- */
const T = " ";
const NB = " ";
const nf2 = { fr: new Intl.NumberFormat("fr-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), en: new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) };
const nf0 = { fr: new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 0 }), en: new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }) };
const esp = (s: string) => s.replace(/[\s\u2019']/g, T);
export const chf = (x: number, l: "fr" | "en") => (l === "fr" ? `${esp(nf2.fr.format(x))}${NB}CHF` : `CHF${NB}${nf2.en.format(x)}`);
export const chf0 = (x: number, l: "fr" | "en") => (l === "fr" ? `${esp(nf0.fr.format(Math.round(x)))}${NB}CHF` : `CHF${NB}${nf0.en.format(Math.round(x))}`);
export const num2 = (x: number, l: "fr" | "en") => (l === "fr" ? esp(nf2.fr.format(x)) : nf2.en.format(x));
export const pct = (x: number, l: "fr" | "en", signe = true) => {
  const s = l === "fr" ? x.toFixed(1).replace(".", ",") : x.toFixed(1);
  return `${signe && x > 0 ? "+" : ""}${s}${l === "fr" ? `${NB}%` : "%"}`;
};

export const LIBELLE_PROFIL: Record<string, { fr: string; en: string }> = {
  adulte_300: { fr: "Adulte (26 ans et plus), franchise 300", en: "Adult (26+), CHF 300 deductible" },
  adulte_2500: { fr: "Adulte, franchise 2500", en: "Adult, CHF 2,500 deductible" },
  jeune_300: { fr: "Jeune adulte (19 à 25 ans), franchise 300", en: "Young adult (19 to 25), CHF 300 deductible" },
  enfant_0: { fr: "Enfant (0 à 18 ans), franchise 0", en: "Child (0 to 18), no deductible" },
};

/* ---- Comparaisons entre cantons ---- */
const parMoyenne = [...DONNEES.cantons].sort((a, b) => b.officiel.adulte - a.officiel.adulte);
const parHausse = [...DONNEES.cantons].sort((a, b) => b.officiel.variation_pct - a.officiel.variation_pct);
export const rangMoyenne = (code: string) => parMoyenne.findIndex((c) => c.code === code) + 1;
export const rangHausse = (code: string) => parHausse.findIndex((c) => c.code === code) + 1;
export const cantonsParMoyenne = () => parMoyenne;

const profil = (r: RegionB, cle: string) => r.profils.find((p) => p.cle === cle)!;
/* Région principale : la première (région 0 ou 1, la plus peuplée). */
export const regionPrincipale = (c: CantonB) => c.regions[0];
export const ecartMensuel = (s: Stat) => s.max - s.min;
export const ecartPct = (s: Stat) => (s.max / s.min - 1) * 100;

const ORD_FR = ["", "premier", "deuxième", "troisième", "quatrième", "cinquième", "sixième"];
const ORD_EN = ["", "first", "second", "third", "fourth", "fifth", "sixth"];

/* Phrases du canton, tirées des comparaisons (paragraphe « angle » de la page). */
export function phrasesCanton(code: string, l: "fr" | "en"): string[] {
  const c = donneesCanton(code);
  const i = infoCanton(code);
  const o = c.officiel;
  const n = DONNEES.national;
  const r0 = regionPrincipale(c);
  const p0 = profil(r0, "adulte_300");
  const rm = rangMoyenne(code);
  const rh = rangHausse(code);
  const A = ANNEE_BAROMETRE, P = ANNEE_PREC;
  const multi = c.regions.length > 1;
  const out: string[] = [];
  if (l === "fr") {
    const lieu = i.aFr.charAt(0).toUpperCase() + i.aFr.slice(1);
    out.push(
      rm === 1
        ? `${lieu}, l’assurance de base reste la plus chère de Suisse romande${T}: un adulte paie en moyenne ${chf(o.adulte, l)} par mois en ${A}, contre ${chf(o.adulte_prec, l)} en ${P}, selon l’OFSP.`
        : rm === DONNEES.cantons.length
          ? `${lieu}, la prime moyenne reste la plus basse des six cantons romands${T}: ${chf(o.adulte, l)} par mois pour un adulte en ${A}, contre ${chf(o.adulte_prec, l)} en ${P}, selon l’OFSP.`
          : `Avec une prime moyenne de ${chf(o.adulte, l)} par mois pour un adulte en ${A} (${chf(o.adulte_prec, l)} en ${P}, selon l’OFSP), le canton se place au ${ORD_FR[rm]} rang des six cantons romands, du plus cher au moins cher.`,
    );
    const cmp = o.variation_pct > n.variation_pct ? "plus forte que la" : o.variation_pct < n.variation_pct ? "plus faible que la" : "égale à la";
    out.push(
      `La hausse de ${pct(o.variation_pct, l, false)} est ${cmp} moyenne suisse (${pct(n.variation_pct, l, false)})${rh === 1 ? ` et c’est la plus forte de Suisse romande` : rh === DONNEES.cantons.length ? ` et c’est la plus faible de Suisse romande` : ""}.`,
    );
    out.push(
      `Pour un adulte avec la franchise de 300 francs, la couverture accident et le libre choix du médecin${multi ? ` (région de ${r0.commune})` : ""}, l’offre la plus chère coûte ${chf(ecartMensuel(p0.standard), l)} de plus par mois que la moins chère, soit ${chf0(ecartMensuel(p0.standard) * 12, l)} par an pour les mêmes prestations.`,
    );
    if (multi) {
      const meds = c.regions.map((r) => ({ r, m: profil(r, "adulte_300").standard.med })).sort((a, b) => b.m - a.m);
      const hi = meds[0], lo = meds[meds.length - 1];
      out.push(`D’une région de prime à l’autre, la médiane de ce même profil passe de ${chf(hi.m, l)} (région de ${hi.r.commune}) à ${chf(lo.m, l)} (région de ${lo.r.commune}).`);
    }
    out.push(`Avec un modèle alternatif (médecin de famille, télémédecine, pharmacie), la prime la plus basse pour ce profil descend à ${chf(p0.tous.min, l)} par mois.`);
  } else {
    const where = i.en_in;
    out.push(
      rm === 1
        ? `Basic health insurance in ${where} remains the most expensive in French-speaking Switzerland: an adult pays ${chf(o.adulte, l)} a month on average in ${A}, against ${chf(o.adulte_prec, l)} in ${P}, according to the FOPH.`
        : rm === DONNEES.cantons.length
          ? `${where.charAt(0).toUpperCase() + where.slice(1)} keeps the lowest average premium of the six French-speaking cantons: ${chf(o.adulte, l)} a month for an adult in ${A}, against ${chf(o.adulte_prec, l)} in ${P}, according to the FOPH.`
          : `With an average premium of ${chf(o.adulte, l)} a month for an adult in ${A} (${chf(o.adulte_prec, l)} in ${P}, according to the FOPH), ${where} ranks ${ORD_EN[rm]} of the six French-speaking cantons, from most to least expensive.`,
    );
    const cmp = o.variation_pct > n.variation_pct ? "higher than" : o.variation_pct < n.variation_pct ? "lower than" : "the same as";
    out.push(
      `The ${pct(o.variation_pct, l, false)} increase is ${cmp} the Swiss average (${pct(n.variation_pct, l, false)})${rh === 1 ? ", and the highest in French-speaking Switzerland" : rh === DONNEES.cantons.length ? ", and the lowest in French-speaking Switzerland" : ""}.`,
    );
    out.push(
      `For an adult with the CHF 300 deductible, accident cover and free choice of doctor${multi ? ` (${r0.commune} premium region)` : ""}, the most expensive offer costs ${chf(ecartMensuel(p0.standard), l)} a month more than the cheapest, or ${chf0(ecartMensuel(p0.standard) * 12, l)} a year for the same benefits.`,
    );
    if (multi) {
      const meds = c.regions.map((r) => ({ r, m: profil(r, "adulte_300").standard.med })).sort((a, b) => b.m - a.m);
      const hi = meds[0], lo = meds[meds.length - 1];
      out.push(`From one premium region to another, the median for the same profile goes from ${chf(hi.m, l)} (${hi.r.commune} region) to ${chf(lo.m, l)} (${lo.r.commune} region).`);
    }
    out.push(`With an alternative model (family doctor, telemedicine, pharmacy), the lowest premium for this profile falls to ${chf(p0.tous.min, l)} a month.`);
  }
  return out;
}

/* Jeu de données du baromètre (JSON-LD) : agrégats calculés par Guide Assurance à partir des données de l'OFSP. */
export function datasetBarometreLd(l: "fr" | "en", id: string, code?: string) {
  const fr = l === "fr";
  const i = code ? infoCanton(code) : null;
  const lieu = i ? (fr ? i.fr : i.en) : fr ? "Suisse romande" : "French-speaking Switzerland";
  const ofsp = fr
    ? { "@type": "GovernmentOrganization", name: "Office fédéral de la santé publique (OFSP)", url: "https://www.bag.admin.ch/fr" }
    : { "@type": "GovernmentOrganization", name: "Federal Office of Public Health (FOPH)", url: "https://www.bag.admin.ch/en" };
  return {
    "@type": "Dataset",
    "@id": id,
    name: fr ? `Baromètre des primes LAMal ${ANNEE_BAROMETRE}, ${lieu}` : `${ANNEE_BAROMETRE} LAMal premium barometer, ${lieu}`,
    description: fr
      ? `Prime moyenne cantonale ${ANNEE_BAROMETRE} et ${ANNEE_PREC} publiée par l’OFSP, puis, par région de prime et profil type, offre la plus basse, quartiles, médiane et offre la plus haute des primes ${ANNEE_BAROMETRE} approuvées. Aucun assureur n’est nommé.`
      : `FOPH cantonal average premium for ${ANNEE_BAROMETRE} and ${ANNEE_PREC}, then, by premium region and standard profile, the lowest offer, quartiles, median and highest offer of the approved ${ANNEE_BAROMETRE} premiums. No insurer is named.`,
    inLanguage: fr ? "fr-CH" : "en",
    temporalCoverage: String(ANNEE_BAROMETRE),
    spatialCoverage: { "@type": "Place", name: lieu },
    dateModified: DATE_BAROMETRE,
    isAccessibleForFree: true,
    creator: { "@id": ORG_ID },
    includedInDataCatalog: { "@id": WEBSITE_ID },
    creditText: fr ? `Source : OFSP, primes ${ANNEE_BAROMETRE} approuvées et primes moyennes cantonales` : `Source: FOPH, approved ${ANNEE_BAROMETRE} premiums and cantonal average premiums`,
    isBasedOn: [
      { "@type": "WebSite", name: "Priminfo", url: "https://www.priminfo.admin.ch/", publisher: ofsp },
      { "@type": "CreativeWork", name: fr ? "Primes moyennes cantonales mensuelles (OFSP)" : "Cantonal average monthly premiums (FOPH)", url: DONNEES.source.moyennes.urls[0], publisher: ofsp },
    ],
    variableMeasured: fr ? "Prime mensuelle de l’assurance obligatoire des soins (CHF)" : "Monthly compulsory health insurance premium (CHF)",
  };
}

/* Texte du baromètre pour llms-full.txt : une phrase d'ouverture et les phrases de chaque canton. */
export function barometreMarkdown(l: "fr" | "en", chemin: (code: string) => string): string {
  const fr = l === "fr";
  const out = [fr ? `# Baromètre des primes maladie ${ANNEE_BAROMETRE} en Suisse romande` : `# ${ANNEE_BAROMETRE} health insurance premium barometer, French-speaking Switzerland`, ""];
  out.push(fr ? `Sources : OFSP, primes moyennes cantonales (${DATE_OFSP}) et primes ${ANNEE_BAROMETRE} approuvées relevées le ${DONNEES.date_donnees}. Aucun assureur n’est nommé.` : `Sources: FOPH, cantonal average premiums (${DATE_OFSP}) and approved ${ANNEE_BAROMETRE} premiums retrieved on ${DONNEES.date_donnees}. No insurer is named.`, "");
  for (const c of INFO) {
    out.push(`## ${fr ? c.fr : c.en}`, "", `${fr ? "Adresse" : "URL"}${fr ? T : ""}: ${chemin(c.code)}`, "", phrasesCanton(c.code, l).join(" "), "");
  }
  return out.join("\n");
}
