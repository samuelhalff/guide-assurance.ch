/* llms.txt et llms-full.txt, générés au build (routes src/app/llms.txt et src/app/llms-full.txt) à partir des
   pages Markdown et des fichiers de données : les dates et les nombres suivent chaque relevé automatique.
   Règle (Sam, 22.11.2026) : l'éditeur n'est jamais nommé dans ces fichiers ; le build échoue s'il apparaît. */
import { abs } from "@/lib/site";
import { HUB_OUTILS, OUTILS, OUTILS_EN, PAGES_DONNEES, PAGES_DONNEES_EN } from "@/lib/nav";
import { META as CAISSES_META, chiffresCles } from "@/lib/caisses-lamal";
import { chiffresClesMarkdown } from "@/lib/chiffres-cles";
import { ANNEE_BAROMETRE, DATE_BAROMETRE, barometreMarkdown } from "@/lib/barometre";
import { ROUTES_IDEES, cheminBarometre } from "@/lib/pages-idees";
import { toutesLesPages, type PageContenu, type Rubrique } from "@/lib/content/pages";
import { DATE_ASSUREURS_3A, DATE_FRAIS_3A, DATE_IMPOTS, DATE_PRIMES, DATE_TAUX_3A } from "@/lib/donnees";
import { COMPTES_LP, RELEVE_LE as RELEVE_LP, TAUX_MAX as LP_MAX, TAUX_MIN as LP_MIN, tauxEn as lpEn, tauxFr as lpFr } from "@/lib/tauxlp";
import REPERES from "@/data/primes-2027-resume.json";
import { DONNEES_UE } from "@/lib/primes-ue";
import { offres as offresUe, trier as trierUe } from "@/lib/engines/primes-ue";
import { TITRES_3A } from "@/lib/frais3a";
import ASS3A from "@/data/assureurs-3a-3b.json";
import { COMPTES_3A, dateCh } from "@/lib/taux3a";
import { dateLongue, type Locale } from "@/lib/i18n";
import IMPOTS from "@/data/impots-2026.json";
import EU from "@/data/primes-eu-fr-2027.json";
import EU_TOUS from "@/data/primes-eu-2027.json";
const NB_PAYS_EU = Object.keys(EU_TOUS.pays).length;
const NB_ASSUREURS_EU_TOUS = new Set(Object.values(EU_TOUS.pays).flat().map((a) => a.no)).size;
import { lignesLlms, textesLlms, tousLesArticles } from "@/lib/actualites";
import { CONTRATS as CONTRATS_PJ, LU_LE as LU_LE_PJ, garantiesPjMarkdown } from "@/lib/garanties-pj";
import * as SM from "@/lib/engines/somme-menage";
import { ESPACE_FINE as N } from "./nombres.ts";
import { PUBLIE_LE_SNB, SNB_3A, SNB_LP, SOURCE_SNB, decimalesSnb, moisTexte, reperes as reperesSnb } from "@/lib/engines/taux-snb";
const SNB3A = reperesSnb(SNB_3A.points).dernier;
const SNBLP = reperesSnb(SNB_LP.points).dernier;
const DEBUT_SNB = SNB_3A.points[0].mois;

const NB_BANQUES = COMPTES_3A.length;
const NB_ASSUREURS_EU = EU.assureurs.length;
const chfC = (c: number, l: "fr" | "en") => (c / 100).toFixed(2).replace(".", l === "fr" ? "," : ".");
const GE_BAS = REPERES.cantons.find((c) => c.canton === "GE")!.offres.filter((o, _i, a) => o.mensuel === a[0].mensuel);
const GE_FR = GE_BAS.map((o) => `${o.assureur}, modèle ${o.produit}`).join(" et ");
const GE_EN = GE_BAS.map((o) => `${o.assureur}, ${o.produit} model`).join(" and ");
const FR_UE = trierUe(offresUe(DONNEES_UE, "FR", "adulte", true), "prix");
const FR_UE_BAS = FR_UE.filter((o) => o.mensuel === FR_UE[0].mensuel);
const FR_UE_NOMS = (et: string) => FR_UE_BAS.map((o) => o.nom).join(` ${et} `);
const LP_HAUT = (et: string) => COMPTES_LP.filter((c) => c.taux === LP_MAX).map((c) => c.banque).join(` ${et} `);

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

const CAISSES = chiffresCles();

function outilsFr(): string[] {
  return [
    lienFr("Subsides d'assurance maladie 2027 par canton romand", OUTILS.subsides, "barèmes officiels 2027 de Genève, Vaud, Fribourg, Neuchâtel et du Jura (revenu déterminant, montants mensuels, limites), estimation du subside et de la prime après subside (Vaud : RDU calculé d'après les lignes de la décision de taxation, dont le code 650, et vérifié sur l'estimateur de l'État de Vaud); le Valais n'a pas publié son barème 2027 au 24.11.2026. Sources : textes des offices cantonaux, relevés le 24.11.2026. Calcul dans le navigateur."),
    lienFr("Comparer les primes LAMal 2027", OUTILS.comparateur, `primes 2027 approuvées par l'OFSP pour un NPA, une année de naissance et une franchise en Suisse romande, relevées le ${dateCh(DATE_PRIMES)}, triées de la plus basse à la plus haute avec le rang de chaque offre${N}; pour un adulte de 26 ans et plus à Genève, avec franchise de 300${N}CHF et couverture accident, la prime la plus basse est celle de ${GE_FR}, à ${chfC(GE_BAS[0].mensuel, "fr")}${N}CHF par mois (relevé du ${dateCh(DATE_PRIMES)}); calcul dans le navigateur.`),
    lienFr("Primes LAMal 2027 pour les résidents de l'UE, de l'AELE et du Royaume-Uni", OUTILS.primesUe, `primes mensuelles 2027 de l'assurance de base de ${NB_ASSUREURS_EU_TOUS} assureurs dans ${NB_PAYS_EU} pays, par classe d'âge et avec ou sans couverture accident, triées de la plus basse à la plus haute et numérotées, d'après l'OFSP (fichier Prämien_EU) lu le 24.11.2026${N}; pour un adulte résidant en France avec couverture accident, la prime la plus basse est celle de ${FR_UE_NOMS("et")}, à ${chfC(FR_UE[0].mensuel * 100, "fr")}${N}CHF par mois`),
    lienFr("Taux des comptes 3a", OUTILS.taux3a, `taux d'intérêt des comptes 3a de ${NB_BANQUES} banques suisses, relevés le ${dateCh(DATE_TAUX_3A)} sur leurs propres pages, triés du plus élevé au plus bas, avec les frais de chaque compte${N}; puis frais annuels publiés et part en actions de ${TITRES_3A.length} solutions 3a en titres, lus le ${dateCh(DATE_FRAIS_3A)} sur les grilles tarifaires, triés par coût publié, sans rendement${N}; aucun fournisseur ne paie.`),
    lienFr("Taux des comptes de libre passage", OUTILS.tauxLibrePassage, `taux d'intérêt des comptes de libre passage de ${COMPTES_LP.length} institutions suisses (banques et institution supplétive LPP), entre ${lpFr(LP_MIN)} et ${lpFr(LP_MAX)} par an, relevés le ${dateCh(RELEVE_LP)} sur leurs propres pages, triés du plus élevé au plus bas et numérotés, ou par nom${N}; le taux le plus élevé, ${lpFr(LP_MAX)}, est proposé par ${LP_HAUT("et")} au ${dateCh(RELEVE_LP)}, avec l'intérêt d'une année sur l'avoir saisi${N}; règles de la LFLP et de l'OLP (deux institutions au plus, départ de Suisse, privilège en cas de faillite, retrait)${N}; aucune institution ne paie${N}; série mensuelle de la Banque nationale suisse depuis ${moisTexte(DEBUT_SNB, "fr")} (moyenne non pondérée ${decimalesSnb(SNBLP.moyenne).replace(".", ",")}${N}% en ${moisTexte(SNBLP.mois, "fr")}, quartiles), source${N}: ${SOURCE_SNB.page_fr}.`),
    lienFr("3a et 3b auprès d'un assureur", OUTILS.assurance3a, `${ASS3A.assureurs.length} assureurs vie et leurs contrats 3a et 3b (risque pur, épargne garantie, liés à des fonds, hybrides), primes, libération du paiement des primes et rachat d'après leurs documents publics lus le ${dateCh(DATE_ASSUREURS_3A)}${N}; différences factuelles avec un 3a bancaire (OPP 3, LCA, circulaire FINMA 2024/2). Ordre alphabétique, sans classement.`),
    lienFr("Économie d'impôt 3a en Suisse romande", OUTILS.impot3a, `impôt fédéral, cantonal et communal économisé par un versement 3a pour ${cantonsImpot("fr")} (toutes les communes), et impôt sur un retrait en capital, barèmes ${IMPOTS.annee} vérifiés le ${dateCh(DATE_IMPOTS)} sur les calculettes officielles, calcul dans le navigateur.`),
    lienFr(`Simulateur frontalier${N}: LAMal ou assurance maladie française${N}?`, OUTILS.simulateur, `compare la cotisation Urssaf et les primes LAMal 2027 des ${NB_ASSUREURS_EU} assureurs pour un foyer qui vit en France et travaille à Genève ou dans le canton de Vaud.`),
    lienFr("Lettre de résiliation d'assurance maladie", OUTILS.lettre, "calcule la date limite de réception (art. 7 LAMal, art. 35a LCA) et rédige la lettre de résiliation de l'assurance de base ou d'une complémentaire."),
    lienFr("Calculateur de la somme d'assurance ménage", OUTILS.sommeMenage, `valeur à neuf du mobilier selon les pièces, les personnes et le standard d'équipement, avec la grille Baloise (formulaire 140.1173, 2023) et la formule de la feuille d'inventaire Zurich (05.2024), réserve de 10${N}%${N}; pour un 3,5 pièces à deux, standard moyen${N}: ${SM.estimer({ pieces: 3.5, personnes: 2, standard: "moyen" }).somme} CHF. Règle proportionnelle de l'art. 51a LCA. Calcul dans le navigateur.`),
    lienFr(`Protection juridique${N}: ce que couvrent les contrats`, OUTILS.garantiesPj, `${CONTRATS_PJ.length} contrats de protection juridique privée et circulation, lus dans leurs CGA le ${dateCh(LU_LE_PJ)}${N}: domaines couverts, plafond par cas, délai de carence, franchise, libre choix de l'avocat (art. 167 OS). Ordre alphabétique, sans prime ni classement.`),
    lienFr("Les caisses maladie en chiffres", OUTILS.caissesChiffres, `${CAISSES.nb} assureurs LAMal avec leurs assurés par canton, leurs frais administratifs par assuré, leurs réserves et leur taux de solvabilité, d'après la Statistique de l'assurance-maladie obligatoire ${CAISSES_META.edition} de l'OFSP, relevée le 24.11.2026 (ordre alphabétique par défaut, aucun classement)`),
    lienFr("Rappels d'échéance dans l'agenda", ROUTES_IDEES.rappels.fr, `fichier d'agenda .ics créé dans le navigateur, sans e-mail${N}: 30 novembre (résiliation LAMal, art. 7 LAMal), 31 décembre (versement 3a), 31 mars (franchise 300) et échéances des contrats saisis, avec une alerte avant chacune.`),
    lienFr(`Baromètre des primes maladie ${ANNEE_BAROMETRE}`, ROUTES_IDEES.barometre.fr, `prime moyenne ${ANNEE_BAROMETRE} et hausse par canton romand (OFSP), écart entre offres par région de prime et profil type, sans assureur nommé${N}; une page par canton, mise à jour le ${dateCh(DATE_BAROMETRE)}.`),
    lienFr("Widgets à intégrer", ROUTES_IDEES.integrer.fr, `encadrés sans cookie pour d'autres sites${N}: compte à rebours de résiliation LAMal, prime médiane d'une région, taux 3a.`),
    lienFr("Kit RH frontaliers et nouveaux arrivants", ROUTES_IDEES.kitRh.fr, `fiche PDF d'une page (FR, EN)${N}: délai de 3 mois du droit d'option (art. 3 LAMal), délai d'affiliation de 3 mois (art. 3 et 5 LAMal), couverture accidents (art. 13 OLAA).`),
  ];
}

function outilsEn(): string[] {
  return [
    lienEn("Health insurance subsidies 2027 by canton", OUTILS_EN.subsides, "official 2027 scales for Geneva, Vaud, Fribourg, Neuchâtel and Jura (determining income, monthly amounts, limits), estimate of the subsidy and of the premium after subsidy (Vaud: RDU computed from the tax-assessment lines, including code 650, and checked against the canton of Vaud’s estimator); Valais had not published its 2027 scale on 24.11.2026. Sources: texts of the cantonal offices, read on 24.11.2026. Runs in the browser."),
    lienEn("Compare 2027 LAMal premiums", OUTILS_EN.comparateur, `2027 FOPH-approved premiums for a postcode, year of birth and deductible in French-speaking Switzerland, retrieved on ${dateCh(DATE_PRIMES)}, sorted from lowest to highest with each offer's rank; for an adult aged 26 or over in Geneva, with a CHF 300 deductible and accident cover, the lowest premium is offered by ${GE_EN}, at CHF ${chfC(GE_BAS[0].mensuel, "en")} a month (retrieved ${dateCh(DATE_PRIMES)}); calculated in the browser.`),
    lienEn("Pillar 3a interest rates", OUTILS_EN.taux3a, `pillar 3a account rates at ${NB_BANQUES} Swiss banks, read on ${dateCh(DATE_TAUX_3A)} on the banks' own pages, sorted from highest to lowest, with each account's fees; then published annual costs and equity share of ${TITRES_3A.length} pillar 3a securities solutions, read on ${dateCh(DATE_FRAIS_3A)} on their price lists, sorted by published cost, no returns; no paid listings.`),
    lienEn("2027 premiums for residents of the EU, EFTA and the UK", OUTILS_EN.primesUe, `2027 monthly basic insurance premiums of ${NB_ASSUREURS_EU_TOUS} insurers in ${NB_PAYS_EU} countries, by age group and with or without accident cover, sorted lowest to highest and numbered, from the FOPH (Prämien_EU file) read on 24.11.2026; for an adult living in France with accident cover, the lowest premium is offered by ${FR_UE_NOMS("and")}, at CHF ${chfC(FR_UE[0].mensuel * 100, "en")} a month`),
    lienEn("Vested benefits account rates", OUTILS_EN.tauxLibrePassage, `interest rates on vested benefits accounts at ${COMPTES_LP.length} Swiss institutions (banks and the Substitute Occupational Benefit Institution), between ${lpEn(LP_MIN)} and ${lpEn(LP_MAX)} a year, read on ${dateCh(RELEVE_LP)} on their own pages, sorted from highest to lowest and numbered, or by name; the highest rate, ${lpEn(LP_MAX)}, is offered by ${LP_HAUT("and")} on ${dateCh(RELEVE_LP)}, with one year of interest on the balance entered; rules of the LFLP and OLP (two institutions at most, leaving Switzerland, bank-failure privilege, withdrawal); no paid listings; Swiss National Bank monthly series since ${moisTexte(DEBUT_SNB, "en")} (unweighted average ${decimalesSnb(SNBLP.moyenne)}% in ${moisTexte(SNBLP.mois, "en")}, quartiles), source: ${SOURCE_SNB.page_en}.`),
    lienEn("Pillar 3a and 3b with an insurer", OUTILS_EN.assurance3a, `${ASS3A.assureurs.length} life insurers and their 3a and 3b policies (pure risk, guaranteed savings, unit-linked, hybrid), premiums, premium waiver and surrender terms from their public documents read on ${dateCh(DATE_ASSUREURS_3A)}; factual differences from a bank 3a (OPP 3, LCA, FINMA circular 2024/2). Alphabetical order, no ranking.`),
    lienEn("Pillar 3a tax savings in French-speaking Switzerland", OUTILS_EN.impot3a, `federal, cantonal and municipal tax saved by a 3a payment in ${cantonsImpot("en")} (every municipality), plus tax on a capital withdrawal; ${IMPOTS.annee} scales checked on ${dateCh(DATE_IMPOTS)} against the official calculators; runs in the browser.`),
    lienEn("Cross-border calculator: LAMal or French health insurance?", OUTILS_EN.simulateur, `compares the Urssaf contribution with the 2027 LAMal premiums of the ${NB_ASSUREURS_EU} insurers for a household living in France and working in Geneva or Vaud.`),
    lienEn("Health insurance cancellation letter", OUTILS_EN.lettre, "calculates the date by which the insurer must receive the letter (art. 7 LAMal, art. 35a LCA) and drafts the letter in French for basic or supplementary insurance."),
    lienEn("Household contents sum insured calculator", OUTILS_EN.sommeMenage, `replacement value of household contents from rooms, people and furnishing standard, using the Baloise grid (form 140.1173, 2023) and the Zurich inventory-sheet formula (05.2024), plus a 10% reserve; for a 3.5-room flat shared by two, medium standard: CHF ${SM.estimer({ pieces: 3.5, personnes: 2, standard: "moyen" }).somme}. Proportional rule of art. 51a LCA. Runs in the browser.`),
    lienEn("Legal protection insurance: what the policies cover", OUTILS_EN.garantiesPj, `${CONTRATS_PJ.length} private and traffic legal protection policies, read in their general terms on ${dateCh(LU_LE_PJ)}: areas covered, limit per case, waiting period, excess, free choice of lawyer (art. 167 OS). Alphabetical order, no premiums or ranking.`),
    lienEn("Swiss health insurers in figures", OUTILS_EN.caissesChiffres, `${CAISSES.nb} LAMal insurers with their insured by canton, administrative costs per insured, reserves and solvency ratio, from the FOPH compulsory health insurance statistics ${CAISSES_META.edition}, read on 24.11.2026 (alphabetical by default, no ranking)`),
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
    lienFr("Historique des taux 3a", PAGES_DONNEES.historique3a, `taux moyen des comptes 3a chaque mois depuis ${moisTexte(DEBUT_SNB, "fr")} selon la Banque nationale suisse (statistique des taux d'intérêt publiés pour nouvelles opérations, cube zikrepro${N}: moyenne non pondérée, quartiles, médiane${N}; ${decimalesSnb(SNB3A.moyenne).replace(".", ",")}${N}% en ${moisTexte(SNB3A.mois, "fr")}, publication du ${dateCh(PUBLIE_LE_SNB)}, source${N}: ${SOURCE_SNB.page_fr})${N}; taux de chaque banque reconstitués à partir des copies archivées (Internet Archive) de leurs pages officielles, chaque point lié à sa copie, CSV${N}: ${abs("/data/taux-3a-archives.csv")}${N}; et taux des comptes 3a relevés chaque lundi depuis le 22.11.2026 sur les pages des banques, moyenne et médiane par relevé${N}; CSV${N}: ${abs("/data/taux-3a-historique.csv")}`),
  ];
}
function donneesEn(): string[] {
  return [
    lienEn("2027 key figures", PAGES_DONNEES_EN.chiffres, "2027 average premiums by French-speaking canton (FOPH), gap between the lowest and highest offer by region, pillar 3a caps and rates, deadlines; one dated, sourced sentence per figure, with an anchor."),
    lienEn("2027 health insurance premiums by premium region", PAGES_DONNEES_EN.regions, `median, quartiles, minimum and maximum of 2027 offers for standard profiles in each premium region of French-speaking Switzerland; CSV: ${abs("/data/primes-2027-regions.csv")}`),
    lienEn("Pillar 3a tax savings by municipality", PAGES_DONNEES_EN.communes3a, `2026 tax saved by a 3a payment for a single person with CHF 80,000 taxable income, in every municipality of ${cantonsImpot("en")}; CSV: ${abs("/data/economie-impot-3a-communes-2026.csv")}`),
    lienEn("Pillar 3a rate history", PAGES_DONNEES_EN.historique3a, `mean pillar 3a account rate every month since ${moisTexte(DEBUT_SNB, "en")} according to the Swiss National Bank (published interest rates for new transactions, cube zikrepro: unweighted average, quartiles, median; ${decimalesSnb(SNB3A.moyenne)}% in ${moisTexte(SNB3A.mois, "en")}, released ${dateCh(PUBLIE_LE_SNB)}, source: ${SOURCE_SNB.page_en}); each bank's rate reconstructed from archived copies (Internet Archive) of its official pages, every point linked to its copy, CSV: ${abs("/data/taux-3a-archives.csv")}; and pillar 3a account rates read every Monday since 22.11.2026 on the banks' pages, mean and median per survey; CSV: ${abs("/data/taux-3a-historique.csv")}`),
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
