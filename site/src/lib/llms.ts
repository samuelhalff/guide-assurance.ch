/* llms.txt et llms-full.txt, générés au build (routes src/app/llms.txt et src/app/llms-full.txt) à partir des
   pages Markdown et des fichiers de données : les dates et les nombres suivent chaque relevé automatique.
   Règle (Sam, 22.11.2026) : l'éditeur n'est jamais nommé dans ces fichiers ; le build échoue s'il apparaît. */
import { abs } from "@/lib/site";
import { HUB_OUTILS, OUTILS, OUTILS_EN, PAGES_DONNEES, PAGES_DONNEES_EN } from "@/lib/nav";
import { chiffresClesMarkdown } from "@/lib/chiffres-cles";
import { ANNEE_BAROMETRE, DATE_BAROMETRE, barometreMarkdown } from "@/lib/barometre";
import { ROUTES_IDEES, cheminBarometre } from "@/lib/pages-idees";
import { toutesLesPages, type PageContenu, type Rubrique } from "@/lib/content/pages";
import { DATE_IMPOTS, DATE_PRIMES, DATE_TAUX_3A } from "@/lib/donnees";
import { COMPTES_3A, dateCh } from "@/lib/taux3a";
import { dateLongue, type Locale } from "@/lib/i18n";
import IMPOTS from "@/data/impots-2026.json";
import EU from "@/data/primes-eu-fr-2027.json";
import { lignesLlms, textesLlms, tousLesArticles } from "@/lib/actualites";
import { CONTRATS as CONTRATS_PJ, LU_LE as LU_LE_PJ, garantiesPjMarkdown } from "@/lib/garanties-pj";
import * as SM from "@/lib/engines/somme-menage";

const N = " ";
const NB_BANQUES = COMPTES_3A.length;
const NB_ASSUREURS_EU = EU.assureurs.length;

/* Cantons couverts par le calcul d'impôt 3a, d'après les barèmes présents dans data/impots-2026.json. */
const CANTONS: { cle: string; fr: string; en: string }[] = [
  { cle: "ge", fr: "Genève", en: "Geneva" },
  { cle: "vd", fr: "Vaud", en: "Vaud" },
  { cle: "vs", fr: "le Valais", en: "Valais" },
  { cle: "fr", fr: "Fribourg", en: "Fribourg" },
  { cle: "ne", fr: "Neuchâtel", en: "Neuchâtel" },
  { cle: "ju", fr: "le Jura", en: "Jura" },
  { cle: "be", fr: "le Jura bernois", en: "the Bernese Jura" },
];
const liste = (x: string[], et: string) => (x.length > 1 ? `${x.slice(0, -1).join(", ")} ${et} ${x[x.length - 1]}` : x.join(""));
const cantonsImpot = (l: Locale) => liste(CANTONS.filter((c) => c.cle in IMPOTS).map((c) => c[l]), l === "fr" ? "et" : "and");

const RESUME_FR = `> Guide Assurance (guide-assurance.ch) explique les assurances en Suisse romande à partir des données officielles (OFSP, Fedlex, Urssaf). Il compare les primes LAMal 2027 publiées par l'OFSP selon les critères du visiteur, sans recommander d'assureur${N}; aucun assureur ne paie pour figurer sur le site ni pour l'ordre des résultats. Pour les branches sans prix publics, le visiteur peut demander à être rappelé par un conseiller d'un courtier partenaire, gratuitement. Chaque page indique sa date de mise à jour et ses sources. Les outils calculent dans le navigateur${N}: aucune donnée saisie n'est envoyée.`;

const DATES_FR = `Dates des données${N}: primes LAMal 2027 relevées le ${dateCh(DATE_PRIMES)} sur priminfo.admin.ch, taux 3a relevés le ${dateCh(DATE_TAUX_3A)}, barèmes d'impôt vérifiés le ${dateCh(DATE_IMPOTS)}.`;
const DATES_EN = `Data dates: 2027 LAMal premiums retrieved on ${dateCh(DATE_PRIMES)} from priminfo.admin.ch, pillar 3a rates read on ${dateCh(DATE_TAUX_3A)}, tax scales checked on ${dateCh(DATE_IMPOTS)}.`;

const lienFr = (titre: string, path: string, texte: string) => `- [${titre}](${abs(path)})${N}: ${texte}`;
const lienEn = (titre: string, path: string, texte: string) => `- [${titre}](${abs(path)}): ${texte}`;
/* Phrase d'une page : réponse de la landing, sinon la description. Les mentions légales nomment l'éditeur dans
   leur description : phrase neutre à la place. */
const NEUTRE: Record<string, string> = {
  "/mentions-legales/": "qui publie guide-assurance.ch, son numéro IDE, ses coordonnées et la portée des informations du site.",
  "/en/legal-notice/": "Who publishes guide-assurance.ch, its UID, contact details and the scope of the information on the site.",
};
const resumePage = (p: PageContenu) => NEUTRE[p.slug] ?? p.landing?.reponse ?? p.description;

function outilsFr(): string[] {
  return [
    lienFr("Comparer les primes LAMal 2027", OUTILS.comparateur, `primes 2027 approuvées par l'OFSP pour un NPA, une année de naissance et une franchise en Suisse romande, relevées le ${dateCh(DATE_PRIMES)}, triées de la plus basse à la plus haute${N}; calcul dans le navigateur.`),
    lienFr("Taux des comptes 3a", OUTILS.taux3a, `taux d'intérêt des comptes 3a de ${NB_BANQUES} banques suisses, relevés le ${dateCh(DATE_TAUX_3A)} sur leurs propres pages, triés du plus élevé au plus bas${N}; aucune banque ne paie.`),
    lienFr("Économie d'impôt 3a en Suisse romande", OUTILS.impot3a, `impôt fédéral, cantonal et communal économisé par un versement 3a pour ${cantonsImpot("fr")} (toutes les communes), et impôt sur un retrait en capital, barèmes ${IMPOTS.annee} vérifiés le ${dateCh(DATE_IMPOTS)} sur les calculettes officielles, calcul dans le navigateur.`),
    lienFr(`Simulateur frontalier${N}: LAMal ou assurance maladie française${N}?`, OUTILS.simulateur, `compare la cotisation Urssaf et les primes LAMal 2027 des ${NB_ASSUREURS_EU} assureurs pour un foyer qui vit en France et travaille à Genève ou dans le canton de Vaud.`),
    lienFr("Lettre de résiliation d'assurance maladie", OUTILS.lettre, "calcule la date limite de réception (art. 7 LAMal, art. 35a LCA) et rédige la lettre de résiliation de l'assurance de base ou d'une complémentaire."),
    lienFr("Calculateur de la somme d'assurance ménage", OUTILS.sommeMenage, `valeur à neuf du mobilier selon les pièces, les personnes et le standard d'équipement, avec la grille Baloise (formulaire 140.1173, 2023) et la formule de la feuille d'inventaire Zurich (05.2024), réserve de 10${N}%${N}; pour un 3,5 pièces à deux, standard moyen${N}: ${SM.estimer({ pieces: 3.5, personnes: 2, standard: "moyen" }).somme} CHF. Règle proportionnelle de l'art. 51a LCA. Calcul dans le navigateur.`),
    lienFr(`Protection juridique${N}: ce que couvrent les contrats`, OUTILS.garantiesPj, `${CONTRATS_PJ.length} contrats de protection juridique privée et circulation, lus dans leurs CGA le ${dateCh(LU_LE_PJ)}${N}: domaines couverts, plafond par cas, délai de carence, franchise, libre choix de l'avocat (art. 167 OS). Ordre alphabétique, sans prime ni classement.`),
    lienFr("Rappels d'échéance dans l'agenda", ROUTES_IDEES.rappels.fr, `fichier d'agenda .ics créé dans le navigateur, sans e-mail${N}: 30 novembre (résiliation LAMal, art. 7 LAMal), 31 décembre (versement 3a), 31 mars (franchise 300) et échéances des contrats saisis, avec une alerte avant chacune.`),
    lienFr(`Baromètre des primes maladie ${ANNEE_BAROMETRE}`, ROUTES_IDEES.barometre.fr, `prime moyenne ${ANNEE_BAROMETRE} et hausse par canton romand (OFSP), écart entre offres par région de prime et profil type, sans assureur nommé${N}; une page par canton, mise à jour le ${dateCh(DATE_BAROMETRE)}.`),
    lienFr("Widgets à intégrer", ROUTES_IDEES.integrer.fr, `encadrés sans cookie pour d'autres sites${N}: compte à rebours de résiliation LAMal, prime médiane d'une région, taux 3a.`),
    lienFr("Kit RH frontaliers et nouveaux arrivants", ROUTES_IDEES.kitRh.fr, `fiche PDF d'une page (FR, EN)${N}: délai de 3 mois du droit d'option (art. 3 LAMal), délai d'affiliation de 3 mois (art. 3 et 5 LAMal), couverture accidents (art. 13 OLAA).`),
  ];
}

function outilsEn(): string[] {
  return [
    lienEn("Compare 2027 LAMal premiums", OUTILS_EN.comparateur, `2027 FOPH-approved premiums for a postcode, year of birth and deductible in French-speaking Switzerland, retrieved on ${dateCh(DATE_PRIMES)}, sorted from lowest to highest; calculated in the browser.`),
    lienEn("Pillar 3a interest rates", OUTILS_EN.taux3a, `pillar 3a account rates at ${NB_BANQUES} Swiss banks, read on ${dateCh(DATE_TAUX_3A)} on the banks' own pages, sorted from highest to lowest; no paid listings.`),
    lienEn("Pillar 3a tax savings in French-speaking Switzerland", OUTILS_EN.impot3a, `federal, cantonal and municipal tax saved by a 3a payment in ${cantonsImpot("en")} (every municipality), plus tax on a capital withdrawal; ${IMPOTS.annee} scales checked on ${dateCh(DATE_IMPOTS)} against the official calculators; runs in the browser.`),
    lienEn("Cross-border calculator: LAMal or French health insurance?", OUTILS_EN.simulateur, `compares the Urssaf contribution with the 2027 LAMal premiums of the ${NB_ASSUREURS_EU} insurers for a household living in France and working in Geneva or Vaud.`),
    lienEn("Health insurance cancellation letter", OUTILS_EN.lettre, "calculates the date by which the insurer must receive the letter (art. 7 LAMal, art. 35a LCA) and drafts the letter in French for basic or supplementary insurance."),
    lienEn("Household contents sum insured calculator", OUTILS_EN.sommeMenage, `replacement value of household contents from rooms, people and furnishing standard, using the Baloise grid (form 140.1173, 2023) and the Zurich inventory-sheet formula (05.2024), plus a 10% reserve; for a 3.5-room flat shared by two, medium standard: CHF ${SM.estimer({ pieces: 3.5, personnes: 2, standard: "moyen" }).somme}. Proportional rule of art. 51a LCA. Runs in the browser.`),
    lienEn("Legal protection insurance: what the policies cover", OUTILS_EN.garantiesPj, `${CONTRATS_PJ.length} private and traffic legal protection policies, read in their general terms on ${dateCh(LU_LE_PJ)}: areas covered, limit per case, waiting period, excess, free choice of lawyer (art. 167 OS). Alphabetical order, no premiums or ranking.`),
    lienEn("Renewal reminders in your calendar", ROUTES_IDEES.rappels.en, "an .ics calendar file created in the browser, no e-mail: 30 November (LAMal cancellation, art. 7 LAMal), 31 December (pillar 3a payment), 31 March (CHF 300 deductible) and the renewal dates of contracts entered, with alerts before each."),
    lienEn(`${ANNEE_BAROMETRE} health premium barometer`, ROUTES_IDEES.barometre.en, `${ANNEE_BAROMETRE} average premium and increase by French-speaking canton (FOPH), gap between offers by premium region and standard profile, no insurer named; one page per canton, updated on ${dateCh(DATE_BAROMETRE)}.`),
    lienEn("Embeddable widgets", ROUTES_IDEES.integrer.en, "cookie-free boxes for other sites: LAMal cancellation countdown, median premium of a region, pillar 3a rates."),
    lienEn("HR kit for cross-border workers and newcomers", ROUTES_IDEES.kitRh.en, "one-page PDF (FR, EN): 3-month right of option (art. 3 LAMal), 3-month enrolment deadline (art. 3 and 5 LAMal), accident cover (art. 13 OLAA)."),
  ];
}

/* Pages de données (rapport 08, idées 2, 3, 6, 9), avec leurs fichiers CSV (licence CC BY 4.0). */
function donneesFr(): string[] {
  return [
    lienFr("Chiffres clés 2027", PAGES_DONNEES.chiffres, `primes moyennes 2027 par canton romand (OFSP), écart entre l'offre la plus basse et la plus haute par région, plafonds et taux 3a, délais${N}; une phrase datée et sourcée par chiffre, avec une ancre.`),
    lienFr("Primes LAMal 2027 par région de prime", PAGES_DONNEES.regions, `médiane, quartiles, minimum et maximum des offres 2027 pour des profils types dans chaque région de prime romande${N}; CSV${N}: ${abs("/data/primes-2027-regions.csv")}`),
    lienFr("Économie d'impôt 3a par commune", PAGES_DONNEES.communes3a, `économie d'impôt 2026 d'un versement 3a pour une personne seule avec 80${N}000 francs de revenu imposable, dans chaque commune de ${cantonsImpot("fr")}${N}; CSV${N}: ${abs("/data/economie-impot-3a-communes-2026.csv")}`),
    lienFr("Historique des taux 3a", PAGES_DONNEES.historique3a, `taux des comptes 3a relevés chaque lundi depuis le 22.11.2026, moyenne et médiane par relevé${N}; CSV${N}: ${abs("/data/taux-3a-historique.csv")}`),
  ];
}
function donneesEn(): string[] {
  return [
    lienEn("2027 key figures", PAGES_DONNEES_EN.chiffres, "2027 average premiums by French-speaking canton (FOPH), gap between the lowest and highest offer by region, pillar 3a caps and rates, deadlines; one dated, sourced sentence per figure, with an anchor."),
    lienEn("2027 health insurance premiums by premium region", PAGES_DONNEES_EN.regions, `median, quartiles, minimum and maximum of 2027 offers for standard profiles in each premium region of French-speaking Switzerland; CSV: ${abs("/data/primes-2027-regions.csv")}`),
    lienEn("Pillar 3a tax savings by municipality", PAGES_DONNEES_EN.communes3a, `2026 tax saved by a 3a payment for a single person with CHF 80,000 taxable income, in every municipality of ${cantonsImpot("en")}; CSV: ${abs("/data/economie-impot-3a-communes-2026.csv")}`),
    lienEn("Pillar 3a rate history", PAGES_DONNEES_EN.historique3a, `pillar 3a account rates read every Monday since 22.11.2026, mean and median per survey; CSV: ${abs("/data/taux-3a-historique.csv")}`),
  ];
}

const SANS_EDITEUR = new RegExp("west\\s*bay|" + ["lem", "anis"].join(""), "i");
function verifier(txt: string, nom: string) {
  if (SANS_EDITEUR.test(txt)) throw new Error(`${nom} : l'éditeur ou le courtier est nommé, build arrêté`);
  return txt;
}

export function llmsTxt(): string {
  const fr = toutesLesPages("fr");
  const en = toutesLesPages("en");
  const groupeEn = (r: Rubrique) => en.filter((p) => p.rubrique === r).map((p) => lienEn(p.h1, p.slug, resumePage(p)));
  const L = [
    "# Guide Assurance",
    "",
    RESUME_FR,
    "",
    "Site en français (Suisse), version anglaise sous /en/ (English section below).",
    "",
    DATES_FR,
    "",
    "## Outils",
    "",
    ...outilsFr(),
    "",
    "## Données",
    "",
    ...donneesFr(),
    "",
    /* Actualités publiées seulement (jamais les brouillons). */
    ...(lignesLlms(tousLesArticles("fr"), abs).length ? ["## Actualités", "", ...lignesLlms(tousLesArticles("fr"), abs), ""] : []),
    "## Assurances",
    "",
    "Chaque page donne la règle en une phrase, ce qui fait varier la prime et, pour les branches sans prix publics, la possibilité d'être rappelé par un conseiller d'un courtier partenaire.",
    "",
    ...fr.filter((p) => p.rubrique !== "legal").map((p) => lienFr(p.h1, p.slug, resumePage(p))),
    "",
    "## Pages",
    "",
    lienFr("Accueil", "/", "primes moyennes 2027 de l'assurance de base par canton romand, échéances de résiliation, guides."),
    lienFr("Tous les guides", "/guides/", "index des guides en français."),
    lienFr("Outils et chiffres", HUB_OUTILS.fr, `tous les outils (comparateur LAMal, lettre de résiliation, simulateur frontalier, rappels d'échéance, taux et économie d'impôt 3a) et toutes les pages de données (chiffres clés 2027, baromètre des primes, primes par région, historique des taux 3a, économie d'impôt par commune), avec le chiffre clé daté de chacun.`),
    lienFr("Méthodologie", "/methodologie/", "sources, mise à jour et corrections."),
    lienFr("Texte intégral des guides", "/llms-full.txt", "tous les guides en français et en anglais, en Markdown, dans un seul fichier."),
    "",
    "## English",
    "",
    "English version under /en/: the same guides and tools, translated from French. The French version prevails for legal pages. The site compares FOPH-published 2027 LAMal premiums by the visitor's own criteria and recommends no insurer; no insurer pays to appear or for the order of results. For lines without public prices, visitors can ask to be called back by an adviser at a partner broker.",
    "",
    DATES_EN,
    "",
    "### Tools",
    "",
    ...outilsEn(),
    "",
    "### Data",
    "",
    ...donneesEn(),
    "",
    ...(lignesLlms(tousLesArticles("en"), abs).length ? ["### News", "", ...lignesLlms(tousLesArticles("en"), abs), ""] : []),
    "### Pages",
    "",
    lienEn("Home", "/en/", "2027 average basic health insurance premiums by canton in French-speaking Switzerland, cancellation deadlines, guides."),
    lienEn("All guides", "/en/guides/", "index of the English guides."),
    lienEn("Tools and figures", HUB_OUTILS.en, "every tool (LAMal premium comparison, cancellation letter, cross-border calculator, renewal reminders, pillar 3a rates and tax savings) and every data page (2027 key figures, premium barometer, premiums by region, pillar 3a rate history, tax savings by municipality), each with its dated key figure."),
    lienEn("Full text of the guides", "/llms-full.txt", "every guide in French and English, in Markdown, in a single file."),
    "",
    "### Personal insurance",
    "",
    ...groupeEn("particuliers"),
    "",
    "### Situations",
    "",
    ...groupeEn("situations"),
    "",
    "### Business",
    "",
    ...groupeEn("entreprises"),
    "",
    "### About the site",
    "",
    ...groupeEn("legal"),
    "",
  ];
  return verifier(L.join("\n"), "llms.txt");
}

/* Liens internes du Markdown en adresses complètes : le fichier se lit hors du site. */
const absolus = (md: string) => md.replace(/\]\(\//g, `](${abs("/")}`);

function pageComplete(p: PageContenu): string {
  const fr = p.locale === "fr";
  const out = [`# ${p.h1}`, "", `${fr ? "Adresse" : "URL"}${fr ? N : ""}: ${abs(p.slug)}`, `${fr ? "Mis à jour le" : "Updated on"} ${dateLongue(p.updated, p.locale)}`, ""];
  if (p.landing?.reponse) out.push(p.landing.reponse, "");
  out.push(absolus(p.markdown), "");
  if (p.faq.length) {
    out.push(`## ${fr ? "Questions fréquentes" : "Frequently asked questions"}`, "");
    for (const f of p.faq) out.push(`### ${f.q}`, "", f.a, "");
  }
  if (p.sources.length) {
    out.push(`## Sources`, "");
    for (const s of p.sources) out.push(`- [${s.label}](${s.url})`);
    out.push("");
  }
  return out.join("\n");
}

export function llmsFullTxt(): string {
  /* Pages légales nommant l'éditeur (mentions légales, confidentialité) : exclues. */
  const pages = (l: Locale) => toutesLesPages(l).filter((p) => !SANS_EDITEUR.test(p.markdown) && !SANS_EDITEUR.test(p.title + p.description));
  const L = [
    "# Guide Assurance : texte intégral des guides / full text of the guides",
    "",
    RESUME_FR,
    "",
    DATES_FR,
    "",
    DATES_EN,
    "",
    `Index${N}: ${abs("/llms.txt")}`,
    "",
    "---",
    "",
    chiffresClesMarkdown("fr"),
    "---",
    "",
    barometreMarkdown("fr", (c) => abs(cheminBarometre(c, "fr"))),
    "---",
    "",
    garantiesPjMarkdown("fr", abs(OUTILS.garantiesPj)),
    ...pages("fr").flatMap((p) => ["---", "", pageComplete(p)]),
    ...textesLlms(tousLesArticles("fr"), abs).flatMap((t) => ["---", "", t]),
    "---",
    "",
    chiffresClesMarkdown("en"),
    "---",
    "",
    barometreMarkdown("en", (c) => abs(cheminBarometre(c, "en"))),
    "---",
    "",
    garantiesPjMarkdown("en", abs(OUTILS_EN.garantiesPj)),
    ...pages("en").flatMap((p) => ["---", "", pageComplete(p)]),
    ...textesLlms(tousLesArticles("en"), abs).flatMap((t) => ["---", "", t]),
  ];
  return verifier(L.join("\n"), "llms-full.txt");
}
