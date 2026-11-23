import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { AppelRappel, Faqs, N, Telechargement, chf, nombre, pct, type Faq } from "@/components/donnees/commun";
import { TableTriable, type LigneTable } from "@/components/donnees/table-triable";
import * as I from "@/lib/engines/impot3a";
import * as C from "@/lib/engines/communes-3a";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { DATE_IMPOTS, DATE_PAGE_DONNEES, LICENCE_DONNEES } from "@/lib/donnees";
import { dateLongue, type Locale } from "@/lib/i18n";
import { OUTILS, OUTILS_EN, PAGES_DONNEES, PAGES_DONNEES_EN, SLUG_CANTON_3A } from "@/lib/nav";
import { Alert } from "@/components/ui/alert";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/* Économie d'impôt 3a commune par commune (idée 6 du rapport 08) : une page par canton couvert par le moteur
   (GE, VD, VS, FR, NE, JU, Jura bernois), plus une page d'ensemble. Profil type explicite,
   calculé au build avec le moteur du calculateur (communes-3a.ts), contrôlé sur le calculateur de l'AFC
   (tests/donnees.test.mts). */

const P = C.PROFIL_TYPE;
const CSV = "/data/economie-impot-3a-communes-2026.csv";
export const CANTONS_3A = I.CANTONS;
export const cheminCanton = (c: I.Canton, locale: Locale) =>
  `${locale === "fr" ? PAGES_DONNEES.communes3a : PAGES_DONNEES_EN.communes3a}${SLUG_CANTON_3A[locale][c]}/`;
export const cantonDuSlug = (slug: string, locale: Locale) =>
  (Object.entries(SLUG_CANTON_3A[locale]) as [I.Canton, string][]).find(([, s]) => s === slug)?.[0];

/* « à Genève », « dans le canton de Vaud », « dans le Jura bernois » */
const DANS: Record<Locale, Record<I.Canton, string>> = {
  fr: { GE: "à Genève", VD: "dans le canton de Vaud", VS: "en Valais", FR: "dans le canton de Fribourg", NE: "dans le canton de Neuchâtel", JU: "dans le canton du Jura", BE: "dans le Jura bernois" },
  en: { GE: "in Geneva", VD: "in the canton of Vaud", VS: "in Valais", FR: "in the canton of Fribourg", NE: "in the canton of Neuchâtel", JU: "in the canton of Jura", BE: "in the Bernese Jura" },
};
/* Ce que la commune applique à l'impôt de base, et l'en-tête de colonne. */
const COEF: Record<Locale, Record<I.Canton, { th: string; texte: (min: string, max: string) => string; val: (x: number) => string }>> = {
  fr: {
    GE: { th: "Centimes communaux", texte: (a, b) => `Chaque commune genevoise fixe ses centimes additionnels, de ${a} à ${b} en 2026, appliqués à l’impôt cantonal de base.`, val: (x) => nombre(x, "fr", x % 1 ? 2 : 0) },
    VD: { th: "Coefficient (%)", texte: (a, b) => `Chaque commune vaudoise fixe son coefficient, de ${a}${N}% à ${b}${N}% de l’impôt cantonal de base en 2026.`, val: (x) => nombre(x, "fr", x % 1 ? 1 : 0) },
    VS: { th: "Coefficient", texte: (a, b) => `Chaque commune valaisanne fixe son coefficient, de ${a} à ${b} en 2026, et son propre indice d’indexation du barème communal.`, val: (x) => nombre(x, "fr", 2) },
    FR: { th: "Coefficient (%)", texte: (a, b) => `Chaque commune fribourgeoise fixe son coefficient, de ${a}${N}% à ${b}${N}% de l’impôt cantonal de base en 2026.`, val: (x) => nombre(x, "fr", x % 1 ? 1 : 0) },
    NE: { th: "Coefficient (%)", texte: (a, b) => `Chaque commune neuchâteloise fixe son coefficient, de ${a}${N}% à ${b}${N}% de l’impôt de base en 2026.`, val: (x) => nombre(x, "fr", x % 1 ? 1 : 0) },
    JU: { th: "Quotité", texte: (a, b) => `Chaque commune jurassienne fixe sa quotité, de ${a} à ${b} fois l’impôt simple en 2026.`, val: (x) => nombre(x, "fr", 2) },
    BE: { th: "Quotité", texte: (a, b) => `Chaque commune du Jura bernois fixe sa quotité, de ${a} à ${b} fois l’impôt simple en 2026.`, val: (x) => nombre(x, "fr", 2) },
  },
  en: {
    GE: { th: "Municipal centimes", texte: (a, b) => `Each Geneva municipality sets its additional centimes, from ${a} to ${b} in 2026, applied to the basic cantonal tax.`, val: (x) => nombre(x, "en", x % 1 ? 2 : 0) },
    VD: { th: "Multiplier (%)", texte: (a, b) => `Each Vaud municipality sets its multiplier, from ${a}% to ${b}% of the basic cantonal tax in 2026.`, val: (x) => nombre(x, "en", x % 1 ? 1 : 0) },
    VS: { th: "Multiplier", texte: (a, b) => `Each Valais municipality sets its multiplier, from ${a} to ${b} in 2026, and its own indexation of the municipal tax scale.`, val: (x) => nombre(x, "en", 2) },
    FR: { th: "Multiplier (%)", texte: (a, b) => `Each Fribourg municipality sets its multiplier, from ${a}% to ${b}% of the basic cantonal tax in 2026.`, val: (x) => nombre(x, "en", x % 1 ? 1 : 0) },
    NE: { th: "Multiplier (%)", texte: (a, b) => `Each Neuchâtel municipality sets its multiplier, from ${a}% to ${b}% of the basic tax in 2026.`, val: (x) => nombre(x, "en", x % 1 ? 1 : 0) },
    JU: { th: "Tax factor", texte: (a, b) => `Each Jura municipality sets its tax factor, from ${a} to ${b} times the simple tax in 2026.`, val: (x) => nombre(x, "en", 2) },
    BE: { th: "Tax factor", texte: (a, b) => `Each Bernese Jura municipality sets its tax factor, from ${a} to ${b} times the simple tax in 2026.`, val: (x) => nombre(x, "en", 2) },
  },
};
/* « à Delémont », « au Locle », « aux Breuleux » */
const aCommune = (nom: string) => nom.replace(/^Le /, "au ").replace(/^Les /, "aux ").replace(/^(?!au |aux )/, "à ");
const coefDe = (c: I.Canton, commune: string) => I.trouverCommune(c, commune)!.coefficient;

const ENSEMBLE = I.CANTONS.map((c) => C.table(c));
const MIN_GLOBAL = ENSEMBLE.reduce((a, t) => (t.min.economie < a.economie ? { ...t.min, canton: t.canton } : a), { ...ENSEMBLE[0].min, canton: ENSEMBLE[0].canton });
const MAX_GLOBAL = ENSEMBLE.reduce((a, t) => (t.max.economie > a.economie ? { ...t.max, canton: t.canton } : a), { ...ENSEMBLE[0].max, canton: ENSEMBLE[0].canton });
const NB_COMMUNES = ENSEMBLE.reduce((s, t) => s + t.lignes.length, 0);
const IFD = ENSEMBLE[0].max.economieIfd;

function profilTexte(locale: Locale) {
  return locale === "fr"
    ? `une personne seule, sans enfant ni confession, avec ${chf(P.revenu, "fr")} de revenu imposable, qui verse ${chf(P.versement, "fr")} sur son 3a en 2026 (le plafond pour une personne affiliée à une caisse de pension)`
    : `a single person with no children and no church tax, with ${chf(P.revenu, "en")} of taxable income, who pays ${chf(P.versement, "en")} into a 3a in 2026 (the cap for someone in a pension fund)`;
}

/* ---------- Questions communes ---------- */
/* Questions tirées des données : commune où l'économie est la plus forte (page canton), écart romand (page d'ensemble). */
function faqPlusForte(c: I.Canton, l: Locale): Faq {
  const tab = C.table(c);
  const p = C.PROFIL_TYPE;
  return l === "fr"
    ? {
        q: `Dans quelle commune le 3e pilier fait-il économiser le plus d’impôt ${DANS.fr[c]}${N}?`,
        a: `C’est ${aCommune(tab.max.commune)}, avec ${chf(tab.max.economie, "fr")} d’impôt 2026 en moins pour un versement de ${chf(p.versement, "fr")}, contre ${chf(tab.min.economie, "fr")} ${aCommune(tab.min.commune)}, la commune où l’économie est la plus faible. Ces montants valent pour une personne seule avec ${chf(p.revenu, "fr")} de revenu imposable, barèmes vérifiés le ${dateLongue(DATE_IMPOTS, "fr")}.`,
      }
    : {
        q: `In which municipality does pillar 3a save the most tax ${DANS.en[c]}?`,
        a: `${tab.max.commune}, with ${chf(tab.max.economie, "en")} less 2026 tax for a ${chf(p.versement, "en")} payment, against ${chf(tab.min.economie, "en")} in ${tab.min.commune}, where the saving is lowest. These amounts are for a single person with ${chf(p.revenu, "en")} of taxable income, scales checked on ${dateLongue(DATE_IMPOTS, "en")}.`,
      };
}
function faqEcart(l: Locale): Faq {
  const tabs = I.CANTONS.map((c) => C.table(c));
  const max = tabs.reduce((a, b) => (b.max.economie > a.max.economie ? b : a));
  const min = tabs.reduce((a, b) => (b.min.economie < a.min.economie ? b : a));
  const p = C.PROFIL_TYPE;
  return l === "fr"
    ? {
        q: `Combien un versement 3a fait-il économiser d’impôt en Suisse romande${N}?`,
        a: `Pour une personne seule avec ${chf(p.revenu, "fr")} de revenu imposable, un versement de ${chf(p.versement, "fr")} fait économiser de ${chf(min.min.economie, "fr")} (${min.min.commune}) à ${chf(max.max.economie, "fr")} (${max.max.commune}) d’impôt 2026, selon la commune. Barèmes vérifiés le ${dateLongue(DATE_IMPOTS, "fr")} sur les calculettes officielles.`,
      }
    : {
        q: "How much tax does a pillar 3a payment save in French-speaking Switzerland?",
        a: `For a single person with ${chf(p.revenu, "en")} of taxable income, a ${chf(p.versement, "en")} payment saves between ${chf(min.min.economie, "en")} (${min.min.commune}) and ${chf(max.max.economie, "en")} (${max.max.commune}) in 2026 tax, depending on the municipality. Scales checked on ${dateLongue(DATE_IMPOTS, "en")} against the official calculators.`,
      };
}

function faqCommune(locale: Locale, canton?: I.Canton): Faq[] {
  return [...(canton ? [faqPlusForte(canton, locale)] : [faqEcart(locale)]), ...(locale === "fr"
    ? [
        {
          q: `Pourquoi ce profil et pas le mien${N}?`,
          a: `Un profil fixe permet de comparer les communes entre elles. Avec un autre revenu, en couple ou avec des enfants, les montants changent. Le calculateur d’économie d’impôt donne votre propre estimation pour n’importe quelle commune des cantons couverts, sans rien envoyer.`,
        },
        {
          q: `Le revenu de 80${N}000${N}CHF est-il le salaire${N}?`,
          a: `Non, c’est le revenu imposable, après les déductions (cotisations sociales, frais professionnels, assurances, etc.). Le versement 3a se déduit ensuite de ce revenu, à l’impôt fédéral comme à l’impôt cantonal et communal.`,
        },
        {
          q: `Qu’est-ce qui n’est pas compté${N}?`,
          a: `L’impôt sur la fortune, l’impôt ecclésiastique et les taxes personnelles ne sont pas pris en compte, car un versement 3a ne les change pas ou très peu. Les chiffres portent sur l’impôt sur le revenu de l’année fiscale 2026 : impôt fédéral direct, impôt cantonal et impôt communal.`,
        },
        {
          q: `Ces montants ont-ils été vérifiés${N}?`,
          a: `Le moteur de calcul est le même que celui du calculateur du site. Il a été contrôlé le ${dateLongue(DATE_IMPOTS, "fr")} sur les calculettes officielles des cantons et sur le calculateur fiscal de l’AFC. Pour ces pages, quatre communes par canton (l’économie la plus forte, la plus faible, la médiane et le chef-lieu) ont aussi été recalculées sur le calculateur de l’AFC, à quelques francs près.`,
        },
      ]
    : [
        {
          q: "Why this profile and not mine?",
          a: "A fixed profile makes municipalities comparable with each other. With another income, as a couple or with children, the amounts change. The tax savings calculator gives your own estimate for any municipality in the cantons covered, without sending anything.",
        },
        {
          q: "Is the CHF 80,000 income the salary?",
          a: "No, it is taxable income, after deductions (social contributions, work expenses, insurance and so on). The 3a payment is then deducted from that income, for federal as well as cantonal and municipal tax.",
        },
        {
          q: "What is not included?",
          a: "Wealth tax, church tax and personal taxes are not included, because a 3a payment changes them little or not at all. The figures cover income tax for the 2026 tax year: direct federal tax, cantonal tax and municipal tax.",
        },
        {
          q: "Have these amounts been checked?",
          a: `The calculation engine is the same as the site’s calculator. It was checked on ${dateLongue(DATE_IMPOTS, "en")} against the official cantonal calculators and the Federal Tax Administration’s calculator. For these pages, four municipalities per canton (highest saving, lowest saving, median and main town) were also recalculated on the Federal Tax Administration’s calculator, to within a few francs.`,
        },
      ])];
}

const CITATIONS = [
  "https://swisstaxcalculator.estv.admin.ch/",
  "https://www.fedlex.admin.ch/eli/cc/1985/1778_1778_1778/fr#art_7",
];

function ldPage(locale: Locale, url: string, titre: string, description: string, miettes: Miette[], faq: Faq[], nomDataset: string) {
  const fr = locale === "fr";
  return graph(
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: titre,
      description,
      inLanguage: fr ? "fr-CH" : "en",
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORG_ID },
      datePublished: "2026-11-23",
      dateModified: DATE_PAGE_DONNEES.communes3a,
      breadcrumb: { "@id": `${url}#breadcrumb` },
      mainEntity: { "@id": `${url}#donnees` },
      citation: CITATIONS,
    },
    {
      "@type": "Dataset",
      "@id": `${url}#donnees`,
      name: nomDataset,
      description,
      inLanguage: fr ? "fr-CH" : "en",
      temporalCoverage: "2026",
      dateModified: DATE_IMPOTS,
      isAccessibleForFree: true,
      license: LICENCE_DONNEES,
      creator: { "@id": ORG_ID },
      creditText: fr
        ? "Barèmes 2026 de l’AFC et des administrations fiscales cantonales, coefficients communaux officiels ; calculs Guide Assurance"
        : "2026 tax scales from the Federal Tax Administration and cantonal tax administrations, official municipal multipliers; calculations by Guide Assurance",
      variableMeasured: fr ? "Économie d’impôt sur le revenu due à un versement 3a (CHF)" : "Income tax saved by a pillar 3a payment (CHF)",
      distribution: [{ "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: abs(CSV) }],
    },
    breadcrumbLd(miettes, `${url}#breadcrumb`),
    { ...faqLd(faq), "@id": `${url}#faq` },
  );
}

/* ---------- Page d'un canton ---------- */

function txtCanton(c: I.Canton, locale: Locale) {
  const t = C.table(c);
  const fr = locale === "fr";
  const nom = I.NOM_CANTON[locale][c];
  const dans = DANS[locale][c];
  const coefs = I.COMMUNES[c].map((x) => x.coefficient);
  const k = COEF[locale][c];
  const chefLieu = t.lignes.find((l) => l.commune === I.COMMUNE_DEFAUT[c])!;
  if (fr)
    return {
      titre: `Économie d’impôt 3a 2026 par commune${N}: ${nom}`,
      description: `Pour 80${N}000${N}CHF imposables et ${nombre(P.versement, "fr")}${N}CHF versés sur le 3a, l’économie d’impôt 2026 va de ${chf(Math.floor(t.min.economie), "fr")} à ${chf(Math.floor(t.max.economie), "fr")} selon la commune ${dans}.`,
      h1: `Économie d’impôt 3a commune par commune ${dans}`,
      intro: `En 2026, ${profilTexte("fr")} économise entre ${chf(t.min.economie, "fr")} ${aCommune(t.min.commune)} et ${chf(t.max.economie, "fr")} ${aCommune(t.max.commune)}. Dans la moitié des ${t.lignes.length} communes, l’économie dépasse ${chf(t.mediane, "fr")} ; ${aCommune(chefLieu.commune)}, elle atteint ${chf(chefLieu.economie, "fr")}.`,
      miettes: [{ name: "Accueil", href: "/" }, { name: "3e pilier", href: "/3e-pilier/" }, { name: "Économie d’impôt 3a", href: OUTILS.impot3a }, { name: "Par commune", href: PAGES_DONNEES.communes3a }, { name: nom }] as Miette[],
      tableTitre: `Combien économise-t-on dans chaque commune ${dans}${N}?`,
      tableTexte: `Le tableau est trié de l’économie la plus forte à la plus faible ; chaque en-tête permet de trier autrement. L’économie comprend l’impôt fédéral direct (${chf(IFD, "fr", 2)}, le même partout), l’impôt cantonal et l’impôt communal.`,
      caption: `Économie d’impôt 2026 pour un versement 3a de ${chf(P.versement, "fr")}, personne seule, ${chf(P.revenu, "fr")} imposables, en CHF`,
      thCommune: "Commune",
      thEco: "Économie",
      thPart: "Part du versement",
      thAvant: "Impôt sans 3a",
      pourquoiTitre: `Pourquoi l’économie change-t-elle d’une commune à l’autre ${dans}${N}?`,
      pourquoi: `L’impôt fédéral et l’impôt cantonal sont les mêmes dans tout le canton ; seul l’impôt communal varie. ${k.texte(k.val(Math.min(...coefs)), k.val(Math.max(...coefs)))} Plus ce chiffre est élevé, plus l’impôt communal est lourd, et plus un franc déduit grâce au 3a fait baisser la facture. L’écart entre la commune où l’économie est la plus forte et celle où elle est la plus faible est de ${chf(t.ecart, "fr")} par an.`,
      lienCalc: `Et pour votre situation${N}?`,
      lienCalcTexte: `Le calculateur estime l’économie pour votre revenu, votre famille et votre commune, avec les mêmes barèmes 2026.`,
      autres: "Les autres cantons couverts",
      rappelQ: `Une question sur votre 3e pilier${N}?`,
      csv: "Télécharger toutes les communes (CSV)",
      csvDetail: `Les ${NB_COMMUNES} communes des sept cantons couverts, avec l’impôt avant et après le versement. Licence CC${N}BY${N}4.0.`,
      maj: `Calcul fait avec les barèmes 2026 de l’AFC et de l’administration fiscale du canton, vérifiés le ${dateLongue(DATE_IMPOTS, "fr")}, et les coefficients communaux officiels 2026. Seule la taxation de l’administration fiscale fait foi.`,
      footer: "Ces montants sont une estimation. Seule la taxation de l’administration fiscale fait foi.",
      nomDataset: `Économie d’impôt 3a par commune, ${nom}, 2026`,
    };
  return {
    titre: `Pillar 3a tax savings by municipality: ${nom} 2026`,
    description: `With CHF 80,000 of taxable income and CHF ${nombre(P.versement, "en")} paid into a 3a, the 2026 tax saving ranges from ${chf(Math.floor(t.min.economie), "en")} to ${chf(Math.floor(t.max.economie), "en")} by municipality ${dans}.`,
    h1: `Pillar 3a tax savings by municipality ${dans}`,
    intro: `In 2026, ${profilTexte("en")} saves between ${chf(t.min.economie, "en")} in ${t.min.commune} and ${chf(t.max.economie, "en")} in ${t.max.commune}. In half of the ${t.lignes.length} municipalities the saving is above ${chf(t.mediane, "en")}; in ${chefLieu.commune} it is ${chf(chefLieu.economie, "en")}.`,
    miettes: [{ name: "Home", href: "/en/" }, { name: "Pillar 3a", href: "/en/pillar-3a/" }, { name: "3a tax savings", href: OUTILS_EN.impot3a }, { name: "By municipality", href: PAGES_DONNEES_EN.communes3a }, { name: nom }] as Miette[],
    tableTitre: `How much is saved in each municipality ${dans}?`,
    tableTexte: `The table is sorted from the highest saving to the lowest; each column header sorts it another way. The saving includes direct federal tax (${chf(IFD, "en", 2)}, the same everywhere), cantonal tax and municipal tax.`,
    caption: `2026 tax saving for a ${chf(P.versement, "en")} pillar 3a payment, single person, ${chf(P.revenu, "en")} taxable income, in CHF`,
    thCommune: "Municipality",
    thEco: "Saving",
    thPart: "Share of payment",
    thAvant: "Tax without 3a",
    pourquoiTitre: `Why does the saving differ between municipalities ${dans}?`,
    pourquoi: `Federal and cantonal tax are the same across the canton; only municipal tax varies. ${k.texte(k.val(Math.min(...coefs)), k.val(Math.max(...coefs)))} The higher that figure, the heavier the municipal tax, and the more each franc deducted through the 3a lowers the bill. The gap between the municipality with the highest saving and the one with the lowest is ${chf(t.ecart, "en")} a year.`,
    lienCalc: "What about your situation?",
    lienCalcTexte: "The calculator estimates the saving for your income, family and municipality, with the same 2026 tax scales.",
    autres: "The other cantons covered",
    rappelQ: "A question about your pillar 3a?",
    csv: "Download every municipality (CSV)",
    csvDetail: `All ${NB_COMMUNES} municipalities of the seven cantons covered, with tax before and after the payment. Licence CC BY 4.0.`,
    maj: `Calculated with the 2026 tax scales of the Federal Tax Administration and the cantonal tax administration, checked on ${dateLongue(DATE_IMPOTS, "en")}, and the official 2026 municipal multipliers. Only the tax administration’s assessment is authoritative.`,
    footer: "These amounts are an estimate. Only the tax administration’s assessment is authoritative.",
    nomDataset: `Pillar 3a tax savings by municipality, ${nom}, 2026`,
  };
}

export const metaCanton3a = (c: I.Canton, locale: Locale) => {
  const t = txtCanton(c, locale);
  return pageMetadata({ title: t.titre, description: t.description, path: cheminCanton(c, locale), locale, ...(locale === "fr" ? { enPath: cheminCanton(c, "en") } : { frPath: cheminCanton(c, "fr") }) });
};

export function PageCanton3a({ canton, locale }: { canton: I.Canton; locale: Locale }) {
  const t = txtCanton(canton, locale);
  const tab = C.table(canton);
  const path = cheminCanton(canton, locale);
  const alt = cheminCanton(canton, locale === "fr" ? "en" : "fr");
  const url = abs(path);
  const faq = faqCommune(locale, canton);
  const k = COEF[locale][canton];
  const lignes: LigneTable[] = tab.lignes.map((l) => ({
    id: String(l.bfs),
    cellules: {
      commune: { texte: l.commune, v: l.commune },
      economie: { texte: nombre(l.economie, locale, 2), v: l.economie, gras: true },
      part: { texte: pct(l.part, locale, 1), v: l.part },
      coef: { texte: k.val(coefDe(canton, l.commune)), v: coefDe(canton, l.commune) },
      avant: { texte: nombre(l.avant, locale, 2), v: l.avant },
    },
  }));
  return (
    <div className="page-outil page-donnees">
      <JsonLd data={ldPage(locale, url, t.titre, t.description, t.miettes, faq, t.nomDataset)} />
      <SiteHeader current="prevoyance" locale={locale} altPath={alt} />
      <main>
        <div className="wrap">
          <Breadcrumbs items={t.miettes} locale={locale} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>

          <section className="reperes-statiques">
            <h2>{t.tableTitre}</h2>
            <p>{t.tableTexte}</p>
            <TableTriable
              locale={locale}
              caption={t.caption}
              triInitial={{ cle: "economie", sens: "desc" }}
              colonnes={[
                { cle: "commune", titre: t.thCommune },
                { cle: "economie", titre: t.thEco, num: true },
                { cle: "part", titre: t.thPart, num: true },
                { cle: "coef", titre: k.th, num: true },
                { cle: "avant", titre: t.thAvant, num: true },
              ]}
              lignes={lignes}
            />
            <Telechargement href={CSV} libelle={t.csv} detail={t.csvDetail} />
          </section>

          <section className="reperes-statiques">
            <h2>{t.pourquoiTitre}</h2>
            <p>{t.pourquoi}</p>
          </section>

          <Alert variant="info" className="lien-outil-3a">
            <p>
              <a href={locale === "fr" ? OUTILS.impot3a : OUTILS_EN.impot3a}>{t.lienCalc}</a> {t.lienCalcTexte}
            </p>
          </Alert>

          <nav className="autres-cantons" aria-label={t.autres}>
            <h2>{t.autres}</h2>
            <ul>
              {I.CANTONS.filter((c) => c !== canton).map((c) => (
                <li key={c}>
                  <a href={cheminCanton(c, locale)}>{I.NOM_CANTON[locale][c]}</a>
                </li>
              ))}
            </ul>
          </nav>

          <AppelRappel locale={locale} sujet="prevoyance" question={t.rappelQ} />
        </div>
        <Faqs faq={faq} maj={t.maj} />
      </main>
      <SiteFooter note={t.footer} locale={locale} altPath={alt} />
    </div>
  );
}

/* ---------- Page d'ensemble ---------- */

const ENS = {
  fr: {
    path: PAGES_DONNEES.communes3a,
    alt: PAGES_DONNEES_EN.communes3a,
    titre: `Économie d’impôt 3a par commune en Suisse romande (2026)`,
    description: `Pour 80${N}000${N}CHF imposables et ${nombre(P.versement, "fr")}${N}CHF versés sur le 3a, l’économie d’impôt 2026 va de ${chf(Math.floor(MIN_GLOBAL.economie), "fr")} à ${chf(Math.floor(MAX_GLOBAL.economie), "fr")} selon la commune romande.`,
    h1: "Économie d’impôt 3a commune par commune",
    intro: `En 2026, ${profilTexte("fr")} économise de ${chf(MIN_GLOBAL.economie, "fr")} (${MIN_GLOBAL.commune}, ${I.NOM_CANTON.fr[MIN_GLOBAL.canton]}) à ${chf(MAX_GLOBAL.economie, "fr")} (${MAX_GLOBAL.commune}, ${I.NOM_CANTON.fr[MAX_GLOBAL.canton]}), selon sa commune. Le calcul couvre ${NB_COMMUNES} communes de sept cantons ou régions, avec les barèmes 2026 vérifiés sur les calculettes officielles.`,
    miettes: [{ name: "Accueil", href: "/" }, { name: "3e pilier", href: "/3e-pilier/" }, { name: "Économie d’impôt 3a", href: OUTILS.impot3a }, { name: "Par commune" }] as Miette[],
    tableTitre: `Dans quel canton l’économie varie-t-elle le plus${N}?`,
    tableTexte: `Le tableau donne, pour chaque canton couvert, l’économie la plus faible, la médiane et la plus forte parmi ses communes. Chaque canton a sa page avec la liste complète, triable.`,
    caption: `Économie d’impôt 2026 pour un versement 3a de ${chf(P.versement, "fr")}, personne seule, ${chf(P.revenu, "fr")} imposables, en CHF`,
    thCanton: "Canton",
    thNb: "Communes",
    thMin: "La plus faible",
    thMed: "Médiane",
    thMax: "La plus forte",
    juraTitre: `Pourquoi le canton de Berne n’est-il couvert qu’en partie${N}?`,
    jura: `Pour le canton de Berne, seules les 39 communes de l’arrondissement du Jura bernois sont comprises. Moutier fait partie du canton du Jura depuis le 1er janvier 2026${N}: vous la trouverez dans la page du Jura.`,
    lienCalc: `Et pour votre situation${N}?`,
    lienCalcTexte: `Le calculateur estime l’économie pour votre revenu, votre famille et votre commune, avec les mêmes barèmes 2026.`,
    rappelQ: `Une question sur votre 3e pilier${N}?`,
    csv: "Télécharger toutes les communes (CSV)",
    csvDetail: `Une ligne par commune, avec l’impôt avant et après le versement. Licence CC${N}BY${N}4.0.`,
    maj: `Calcul fait avec les barèmes 2026 de l’AFC et des administrations fiscales cantonales, vérifiés le ${dateLongue(DATE_IMPOTS, "fr")}, et les coefficients communaux officiels 2026. Seule la taxation de l’administration fiscale fait foi.`,
    footer: "Ces montants sont une estimation. Seule la taxation de l’administration fiscale fait foi.",
    nomDataset: "Économie d’impôt 3a par commune en Suisse romande, 2026",
  },
  en: {
    path: PAGES_DONNEES_EN.communes3a,
    alt: PAGES_DONNEES.communes3a,
    titre: "Pillar 3a tax savings by municipality, Romandy 2026",
    description: `With CHF 80,000 of taxable income and CHF ${nombre(P.versement, "en")} paid into a 3a, the 2026 tax saving ranges from ${chf(Math.floor(MIN_GLOBAL.economie), "en")} to ${chf(Math.floor(MAX_GLOBAL.economie), "en")} by municipality in Romandy.`,
    h1: "Pillar 3a tax savings, municipality by municipality",
    intro: `In 2026, ${profilTexte("en")} saves from ${chf(MIN_GLOBAL.economie, "en")} (${MIN_GLOBAL.commune}, ${I.NOM_CANTON.en[MIN_GLOBAL.canton]}) to ${chf(MAX_GLOBAL.economie, "en")} (${MAX_GLOBAL.commune}, ${I.NOM_CANTON.en[MAX_GLOBAL.canton]}), depending on the municipality. The calculation covers ${NB_COMMUNES} municipalities in seven cantons or regions, with 2026 tax scales checked against the official calculators.`,
    miettes: [{ name: "Home", href: "/en/" }, { name: "Pillar 3a", href: "/en/pillar-3a/" }, { name: "3a tax savings", href: OUTILS_EN.impot3a }, { name: "By municipality" }] as Miette[],
    tableTitre: "In which canton does the saving vary most?",
    tableTexte: "For each canton covered, the table gives the lowest saving, the median and the highest among its municipalities. Each canton has its own page with the full list, which can be sorted.",
    caption: `2026 tax saving for a ${chf(P.versement, "en")} pillar 3a payment, single person, ${chf(P.revenu, "en")} taxable income, in CHF`,
    thCanton: "Canton",
    thNb: "Municipalities",
    thMin: "Lowest",
    thMed: "Median",
    thMax: "Highest",
    juraTitre: "Why is the canton of Bern only partly covered?",
    jura: "For the canton of Bern, only the 39 municipalities of the Bernese Jura district are included. Moutier has been part of the canton of Jura since 1 January 2026, so you will find it on the Jura page.",
    lienCalc: "What about your situation?",
    lienCalcTexte: "The calculator estimates the saving for your income, family and municipality, with the same 2026 tax scales.",
    rappelQ: "A question about your pillar 3a?",
    csv: "Download every municipality (CSV)",
    csvDetail: "One row per municipality, with tax before and after the payment. Licence CC BY 4.0.",
    maj: `Calculated with the 2026 tax scales of the Federal Tax Administration and the cantonal tax administrations, checked on ${dateLongue(DATE_IMPOTS, "en")}, and the official 2026 municipal multipliers. Only the tax administration’s assessment is authoritative.`,
    footer: "These amounts are an estimate. Only the tax administration’s assessment is authoritative.",
    nomDataset: "Pillar 3a tax savings by municipality in French-speaking Switzerland, 2026",
  },
};

export const metaCommunes3a = (locale: Locale) => {
  const t = ENS[locale];
  return pageMetadata({ title: t.titre, description: t.description, path: t.path, locale, ...(locale === "fr" ? { enPath: t.alt } : { frPath: t.alt }) });
};

export function PageCommunes3a({ locale }: { locale: Locale }) {
  const t = ENS[locale];
  const url = abs(t.path);
  const faq = faqCommune(locale);
  return (
    <div className="page-outil page-donnees">
      <JsonLd data={ldPage(locale, url, t.titre, t.description, t.miettes, faq, t.nomDataset)} />
      <SiteHeader current="prevoyance" locale={locale} altPath={t.alt} />
      <main>
        <div className="wrap">
          <Breadcrumbs items={t.miettes} locale={locale} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>

          <section className="reperes-statiques">
            <h2>{t.tableTitre}</h2>
            <p>{t.tableTexte}</p>
            <Table variant="chiffres" className="table-donnees">
              <TableCaption>{t.caption}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t.thCanton}</TableHead>
                  <TableHead scope="col">{t.thMin}</TableHead>
                  <TableHead scope="col">{t.thMed}</TableHead>
                  <TableHead scope="col">{t.thMax}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ENSEMBLE.map((tab) => (
                  <TableRow key={tab.canton}>
                    <TableHead scope="row">
                      <a href={cheminCanton(tab.canton, locale)}>{I.NOM_CANTON[locale][tab.canton]}</a>
                      <small>{`${tab.lignes.length} ${locale === "fr" ? "communes" : "municipalities"}`}</small>
                    </TableHead>
                    <TableCell>{nombre(tab.min.economie, locale)}<small>{tab.min.commune}</small></TableCell>
                    <TableCell><b>{nombre(tab.mediane, locale)}</b></TableCell>
                    <TableCell>{nombre(tab.max.economie, locale)}<small>{tab.max.commune}</small></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Telechargement href={CSV} libelle={t.csv} detail={t.csvDetail} />
          </section>

          <section className="reperes-statiques">
            <h2>{t.juraTitre}</h2>
            <p>{t.jura}</p>
          </section>

          <Alert variant="info" className="lien-outil-3a">
            <p>
              <a href={locale === "fr" ? OUTILS.impot3a : OUTILS_EN.impot3a}>{t.lienCalc}</a> {t.lienCalcTexte}
            </p>
          </Alert>
          <AppelRappel locale={locale} sujet="prevoyance" question={t.rappelQ} />
        </div>
        <Faqs faq={faq} maj={t.maj} />
      </main>
      <SiteFooter note={t.footer} locale={locale} altPath={t.alt} />
    </div>
  );
}
