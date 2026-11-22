/* llms.txt et llms-full.txt, générés au build (routes src/app/llms.txt et src/app/llms-full.txt) à partir des
   pages Markdown et des fichiers de données : les dates et les nombres suivent chaque relevé automatique.
   Règle (Sam, 22.11.2026) : l'éditeur n'est jamais nommé dans ces fichiers ; le build échoue s'il apparaît. */
import { abs } from "@/lib/site";
import { OUTILS, OUTILS_EN } from "@/lib/nav";
import { toutesLesPages, type PageContenu, type Rubrique } from "@/lib/content/pages";
import { DATE_IMPOTS, DATE_PRIMES, DATE_TAUX_3A } from "@/lib/donnees";
import { COMPTES_3A, dateCh } from "@/lib/taux3a";
import { dateLongue, type Locale } from "@/lib/i18n";
import IMPOTS from "@/data/impots-2026.json";
import EU from "@/data/primes-eu-fr-2027.json";

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
  ];
}

function outilsEn(): string[] {
  return [
    lienEn("Compare 2027 LAMal premiums", OUTILS_EN.comparateur, `2027 FOPH-approved premiums for a postcode, year of birth and deductible in French-speaking Switzerland, retrieved on ${dateCh(DATE_PRIMES)}, sorted from lowest to highest; calculated in the browser.`),
    lienEn("Pillar 3a interest rates", OUTILS_EN.taux3a, `pillar 3a account rates at ${NB_BANQUES} Swiss banks, read on ${dateCh(DATE_TAUX_3A)} on the banks' own pages, sorted from highest to lowest; no paid listings.`),
    lienEn("Pillar 3a tax savings in French-speaking Switzerland", OUTILS_EN.impot3a, `federal, cantonal and municipal tax saved by a 3a payment in ${cantonsImpot("en")} (every municipality), plus tax on a capital withdrawal; ${IMPOTS.annee} scales checked on ${dateCh(DATE_IMPOTS)} against the official calculators; runs in the browser.`),
    lienEn("Cross-border calculator: LAMal or French health insurance?", OUTILS_EN.simulateur, `compares the Urssaf contribution with the 2027 LAMal premiums of the ${NB_ASSUREURS_EU} insurers for a household living in France and working in Geneva or Vaud.`),
    lienEn("Health insurance cancellation letter", OUTILS_EN.lettre, "calculates the date by which the insurer must receive the letter (art. 7 LAMal, art. 35a LCA) and drafts the letter in French for basic or supplementary insurance."),
  ];
}

const SANS_EDITEUR = /west\s*bay|lemanis/i;
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
    "### Pages",
    "",
    lienEn("Home", "/en/", "2027 average basic health insurance premiums by canton in French-speaking Switzerland, cancellation deadlines, guides."),
    lienEn("All guides", "/en/guides/", "index of the English guides."),
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
    ...pages("fr").flatMap((p) => ["---", "", pageComplete(p)]),
    ...pages("en").flatMap((p) => ["---", "", pageComplete(p)]),
  ];
  return verifier(L.join("\n"), "llms-full.txt");
}
