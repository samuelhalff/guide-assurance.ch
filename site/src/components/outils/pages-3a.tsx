import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { PartagerOutil } from "@/components/site/partager-outil";
import { Taux3a, Titres3a } from "@/components/outils/taux-3a";
import { CtaDemande } from "@/components/demande/cta-demande";
import { BarreDemande } from "@/components/demande/barre-demande";
import { FRAIS_COMPTES, FRAIS_VERIFIE_LE, TITRES_3A } from "@/lib/frais3a";
import { OUTILS_3A_ASSURANCE } from "@/lib/nav";
import { EconomieImpot3a } from "@/components/outils/economie-impot-3a";
import * as I from "@/lib/engines/impot3a";
import { COMPTES_3A, RELEVE_LE, TAUX_MAX, TAUX_MIN, dateCh, tauxEn, tauxFr } from "@/lib/taux3a";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { DATE_IMPOTS, DATE_PAGE } from "@/lib/donnees";
import { dateLongue } from "@/lib/i18n";
import { OUTILS, OUTILS_EN, PAGES_DONNEES, PAGES_DONNEES_EN } from "@/lib/nav";
import type { Locale } from "@/lib/i18n";

/* Pages « Taux des comptes 3a » et « Économie d'impôt 3a », en français et en anglais. Les fichiers de route
   (src/app/(fr)/3e-pilier/..., src/app/(en)/en/pillar-3a/...) ne font qu'appeler ces fonctions. */
const N = " ";
const nfFr = new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 0 });
const nfEn = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const P26 = I.PLAFONDS["2026"];
const P27 = I.PLAFONDS["2027"];
const NB = COMPTES_3A.length;
const RELEVE = dateCh(RELEVE_LE);
const NT = TITRES_3A.length;
const FRAIS_LE = dateCh(FRAIS_VERIFIE_LE);
const GRATUITS = COMPTES_3A.filter((c) => FRAIS_COMPTES[c.id]?.tenue_chf === 0).length;
const mediane = (() => {
  const t = COMPTES_3A.map((c) => c.taux).sort((a, b) => a - b);
  return t.length % 2 ? t[(t.length - 1) / 2] : (t[t.length / 2 - 1] + t[t.length / 2]) / 2;
})();

const CADENAS = (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M5 9V6a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <rect x="3" y="9" width="14" height="10" rx="1.5" fill="currentColor" />
  </svg>
);

type Faq = { q: string; a: string };

function Faqs({ faq, maj }: { faq: Faq[]; maj: string }) {
  return (
    <div className="wrap faq">
      {faq.map((f) => (
        <section key={f.q}>
          <h2>{f.q}</h2>
          <p>{f.a}</p>
        </section>
      ))}
      <p className="maj">{maj}</p>
    </div>
  );
}

/* ---------- Taux des comptes 3a ---------- */

const TAUX = {
  fr: {
    path: OUTILS.taux3a,
    alt: OUTILS_EN.taux3a,
    titre: `Taux et frais 3a en 2026${N}: ${NB} comptes et ${NT} offres en titres`,
    description: `Taux et frais des comptes 3a de ${NB} banques, puis frais et part en actions de ${NT} solutions 3a en titres, relevés sur les pages des fournisseurs. Aucun ne paie sa place.`,
    h1: "Taux et frais du 3e pilier",
    intro: `Au ${RELEVE}, les comptes 3a des ${NB} banques relevées rapportent entre ${tauxFr(TAUX_MIN)} et ${tauxFr(TAUX_MAX)} par an, et ${GRATUITS} d’entre eux n’ont pas de frais de tenue. Les solutions 3a en titres, qui ne versent pas d’intérêt, sont présentées à part avec leurs frais. Chaque chiffre a été lu sur la page du fournisseur, avec sa date.`,
    hComptes: "Comptes 3a : taux d’intérêt et frais",
    hTitres: `3a en titres${N}: frais et part en actions`,
    titresIntro: `Avec une solution 3a en titres, l’argent est placé en fonds, souvent en grande partie en actions. Il n’y a donc ni taux ni garantie, et ce qui distingue les offres se mesure surtout aux frais. Les ${NT} solutions ci-dessous ont été relevées le ${FRAIS_LE} sur la grille tarifaire de chaque fournisseur.`,
    lienAssurance: "3a et 3b auprès d’un assureur",
    lienAssuranceTexte: "Les assureurs qui proposent une prévoyance liée ou libre, et ce qui la distingue d’un 3a bancaire.",
    prive: "Cette page n’a pas de formulaire et n’enregistre rien de ce que vous lisez.",
    miettes: [{ name: "Accueil", href: "/" }, { name: "3e pilier", href: "/3e-pilier/" }, { name: "Taux et frais 3a" }] as Miette[],
    appli: "Taux des comptes 3a",
    partage: `Les taux des comptes 3a de ${NB} banques suisses, relevés sur leurs pages et triés par taux.`,
    lienImpot: "Quelle économie d’impôt représente votre versement 3a ?",
    lienImpotTexte: "Le calculateur l’estime avec les barèmes 2026 pour Genève, Vaud, le Valais, Fribourg, Neuchâtel, le Jura et le Jura bernois.",
    faq: [
      {
        q: `Combien rapporte un compte 3a en 2026${N}?`,
        a: `Entre ${tauxFr(TAUX_MIN)} et ${tauxFr(TAUX_MAX)} par an selon nos relevés du ${RELEVE} ; la moitié des ${NB} comptes rapporte ${tauxFr(mediane)} ou moins. Sur un avoir de 10 000 CHF, l’écart entre le taux le plus bas et le plus élevé représente ${nfFr.format((10000 * (TAUX_MAX - TAUX_MIN)) / 100)} CHF d’intérêts par an. L’économie d’impôt du versement pèse en général bien plus que les intérêts.`,
      },
      {
        q: `Les taux des comptes 3a sont-ils fixes${N}?`,
        a: "Non. Ils sont variables : la fondation de prévoyance de la banque peut les changer à tout moment, à la hausse comme à la baisse, souvent après une décision de la Banque nationale. La date « en vigueur depuis » indique le dernier changement publié par la banque.",
      },
      {
        q: `Peut-on avoir plusieurs comptes 3a${N}?`,
        a: "Oui. Il est possible d’ouvrir plusieurs comptes ou solutions 3a, dans une ou plusieurs banques, mais le plafond annuel vaut pour l’ensemble de vos versements. Avec plusieurs comptes, l’avoir peut être retiré par étapes, sur des années différentes, ce qui réduit souvent l’impôt au retrait.",
      },
      {
        q: `Peut-on changer de banque pour son 3a${N}?`,
        a: "Oui, en demandant le transfert direct de l’avoir à la nouvelle fondation 3a. Le retrait en espèces n’est possible que dans les cas prévus par l’art. 3 OPP 3 (retraite, achat du logement, départ définitif, début d’une activité à son compte, invalidité). Certaines banques facturent le transfert, ce qu’indique la colonne des conditions.",
      },
      {
        q: `Pourquoi les solutions 3a en titres sont-elles présentées à part${N}?`,
        a: "Parce qu’elles ne versent pas d’intérêt : leur valeur dépend des marchés et peut baisser sur quelques années. Les mettre dans la même liste qu’un taux d’intérêt serait trompeur. Nous montrons donc leurs frais annuels publiés, ce que ces frais couvrent et la part en actions possible, sans aucun rendement passé.",
      },
      {
        q: `Que coûte un compte 3a ou une solution en titres${N}?`,
        a: `Au ${FRAIS_LE}, ${GRATUITS} des ${NB} comptes 3a relevés n’ont pas de frais de tenue publiés ; certains facturent en revanche le transfert vers un autre prestataire ou la clôture, de 50 à 120 CHF. Pour les solutions en titres, le coût annuel publié va de 0 à près de 1 % de l’avoir, selon que les frais des fonds sont compris ou s’ajoutent. Ce qu’un chiffre couvre change d’un fournisseur à l’autre, d’où la colonne qui le précise.`,
      },
      {
        q: `D’où viennent ces taux${N}?`,
        a: `Les taux proviennent des pages officielles des banques et de leurs fiches de taux, consultées le ${RELEVE} et relevées chaque lundi. Les frais viennent des grilles tarifaires des fournisseurs, lues le ${FRAIS_LE} et contrôlées chaque mois. Nous ne reprenons aucun chiffre d’un autre site. Aucun fournisseur ne paie pour figurer ici, et l’ordre suit le critère indiqué au-dessus de chaque liste.`,
      },
    ] as Faq[],
    maj: `Taux relevés le ${RELEVE} sur les pages des banques, frais le ${FRAIS_LE} sur les grilles tarifaires des fournisseurs. Ces chiffres peuvent changer et seul le site du fournisseur fait foi.`,
    footer: "Ces taux sont donnés à titre d’information. Les conditions de la banque font foi.",
  },
  en: {
    path: OUTILS_EN.taux3a,
    alt: OUTILS.taux3a,
    titre: `Pillar 3a rates and fees 2026: ${NB} accounts, ${NT} securities offers`,
    description: `Rates and fees of ${NB} pillar 3a bank accounts, then fees and equity share of ${NT} 3a securities solutions, read on the providers’ own pages. No provider pays to be listed.`,
    h1: "Pillar 3a rates and fees",
    intro: `On ${RELEVE}, the pillar 3a accounts of the ${NB} banks surveyed pay between ${tauxEn(TAUX_MIN)} and ${tauxEn(TAUX_MAX)} a year, and ${GRATUITS} of them have no account fee. Pillar 3a securities solutions, which pay no interest, are shown separately with their fees. Each figure was read on the provider’s own page, with its date.`,
    hComptes: "Pillar 3a accounts: interest rates and fees",
    hTitres: "Pillar 3a in securities: fees and equity share",
    titresIntro: `With a 3a securities solution, the money is invested in funds, often largely in equities. There is no rate and no guarantee, so the offers differ mainly in their fees. The ${NT} solutions below were read on ${FRAIS_LE} on each provider’s price list.`,
    lienAssurance: "Pillar 3a and 3b with an insurer",
    lienAssuranceTexte: "The insurers that offer tied or free pension policies, and how they differ from a bank 3a.",
    prive: "This page has no form and records nothing of what you read.",
    miettes: [{ name: "Home", href: "/en/" }, { name: "Pillar 3a", href: "/en/pillar-3a/" }, { name: "3a rates and fees" }] as Miette[],
    appli: "Pillar 3a interest rates",
    partage: `Pillar 3a account rates at ${NB} Swiss banks, read on their own pages and sorted by rate.`,
    lienImpot: "How much tax does your 3a payment save?",
    lienImpotTexte: "The calculator estimates it with the 2026 tax scales for Geneva, Vaud, Valais, Fribourg, Neuchâtel, Jura and the Bernese Jura.",
    faq: [
      {
        q: "How much does a pillar 3a account pay in 2026?",
        a: `Between ${tauxEn(TAUX_MIN)} and ${tauxEn(TAUX_MAX)} a year in our survey of ${RELEVE}; half of the ${NB} accounts pay ${tauxEn(mediane)} or less. On a CHF 10,000 balance, the gap between the lowest and the highest rate is CHF ${nfEn.format((10000 * (TAUX_MAX - TAUX_MIN)) / 100)} of interest a year. The tax saving on the payment usually weighs far more than the interest.`,
      },
      {
        q: "Are pillar 3a rates fixed?",
        a: "No. They are variable: the bank’s pension foundation can change them at any time, up or down, often after a Swiss National Bank decision. The “in force since” date shows the last change published by the bank.",
      },
      {
        q: "Can you have several 3a accounts?",
        a: "Yes. You can open several 3a accounts or solutions, at one or several banks, but the annual cap applies to all your payments together. With several accounts, the money can be withdrawn in stages, in different years, which often lowers the tax on withdrawal.",
      },
      {
        q: "Can you move your 3a to another bank?",
        a: "Yes, by asking for a direct transfer of the balance to the new 3a foundation. A cash withdrawal is only possible in the cases listed in art. 3 OPP 3 (retirement, buying your home, leaving Switzerland for good, becoming self-employed, disability). Some banks charge for the transfer, as the conditions column shows.",
      },
      {
        q: "Why are 3a securities solutions shown separately?",
        a: "Because they pay no interest: their value depends on the markets and can fall over a few years. Putting them in the same list as an interest rate would be misleading. We therefore show their published annual fees, what those fees cover and the possible equity share, with no past returns.",
      },
      {
        q: "What does a 3a account or a securities solution cost?",
        a: `On ${FRAIS_LE}, ${GRATUITS} of the ${NB} 3a accounts surveyed had no published account fee; some charge CHF 50 to 120 for a transfer to another provider or a closure. For securities solutions, the published annual cost ranges from 0% to nearly 1% of the balance, depending on whether fund costs are included or added. What a figure covers differs between providers, hence the column that spells it out.`,
      },
      {
        q: "Where do these rates come from?",
        a: `Rates come from the banks’ official pages and rate sheets, read on ${RELEVE} and every Monday. Fees come from the providers’ price lists, read on ${FRAIS_LE} and checked every month. We do not take any figure from another website. No provider pays to be listed here, and the order follows the criterion stated above each list.`,
      },
    ] as Faq[],
    maj: `Rates read on ${RELEVE} on the banks’ pages, fees on ${FRAIS_LE} on the providers’ price lists. These figures can change, and the provider’s website is authoritative.`,
    footer: "These rates are for information only. The bank’s conditions are authoritative.",
  },
};

export const metaTaux3a = (locale: Locale) => {
  const t = TAUX[locale];
  return pageMetadata({ title: t.titre, description: t.description, path: t.path, locale, ...(locale === "fr" ? { enPath: t.alt } : { frPath: t.alt }) });
};

export function PageTaux3a({ locale }: { locale: Locale }) {
  const t = TAUX[locale];
  const url = abs(t.path);
  const ld = graph(
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: t.titre,
      description: t.description,
      inLanguage: locale === "fr" ? "fr-CH" : "en",
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORG_ID },
      datePublished: "2026-11-22",
      dateModified: DATE_PAGE.taux3a,
      breadcrumb: { "@id": `${url}#breadcrumb` },
      mainEntity: { "@id": `${url}#taux` },
      citation: [...new Set([...COMPTES_3A.map((c) => c.url), ...Object.values(FRAIS_COMPTES).map((f) => f.url), ...TITRES_3A.map((x) => x.url)])],
    },
    {
      "@type": "Dataset",
      "@id": `${url}#taux`,
      name: t.appli,
      description: t.description,
      inLanguage: locale === "fr" ? "fr-CH" : "en",
      dateModified: RELEVE_LE,
      temporalCoverage: RELEVE_LE,
      isAccessibleForFree: true,
      creator: { "@id": ORG_ID },
      variableMeasured:
        locale === "fr"
          ? ["Taux d’intérêt annuel du compte 3a (%)", "Frais du compte 3a (CHF)", "Coût annuel publié des solutions 3a en titres (%)", "Part en actions (%)"]
          : ["Annual pillar 3a account interest rate (%)", "Pillar 3a account fees (CHF)", "Published annual cost of 3a securities solutions (%)", "Equity share (%)"],
    },
    breadcrumbLd(t.miettes, `${url}#breadcrumb`),
    { ...faqLd(t.faq), "@id": `${url}#faq` },
  );
  return (
    <div className="page-outil">
      <JsonLd data={ld} />
      <SiteHeader current="prevoyance" locale={locale} altPath={t.alt} />
      <main>
        <div className="wrap">
          <Breadcrumbs items={t.miettes} locale={locale} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>
          <div className="cta-haut-3a">
            <CtaDemande locale={locale} porte="prevoyance" emplacement="outil3a" />
          </div>
          <PartagerOutil path={t.path} title={t.appli} text={t.partage} locale={locale} />
          <h2 className="titre-section-3a" id="comptes">{t.hComptes}</h2>
          <div className="outil-taux">
            <Taux3a locale={locale} />
          </div>
          <h2 className="titre-section-3a" id="titres">{t.hTitres}</h2>
          <p className="intro-section-3a">{t.titresIntro}</p>
          <div className="outil-taux">
            <Titres3a locale={locale} />
          </div>
          <div className="cta-bas-3a">
            <CtaDemande locale={locale} porte="prevoyance" emplacement="outil3a" />
          </div>
          <p className="lien-outil-3a">
            <a href={locale === "fr" ? OUTILS_3A_ASSURANCE.fr : OUTILS_3A_ASSURANCE.en}>{t.lienAssurance}</a> {t.lienAssuranceTexte}
          </p>
          <p className="lien-outil-3a">
            <a href={locale === "fr" ? OUTILS.impot3a : OUTILS_EN.impot3a}>{t.lienImpot}</a> {t.lienImpotTexte}
          </p>
          <p className="lien-outil-3a">
            <a href={locale === "fr" ? PAGES_DONNEES.historique3a : PAGES_DONNEES_EN.historique3a}>{locale === "fr" ? "Historique des taux 3a" : "Pillar 3a rate history"}</a>{" "}
            {locale === "fr" ? "Chaque relevé hebdomadaire depuis le 22.11.2026, avec la moyenne, la médiane et le fichier CSV." : "Every weekly survey since 22.11.2026, with the mean, the median and the CSV file."}
          </p>
        </div>
        <Faqs faq={t.faq} maj={t.maj} />
      </main>
      <BarreDemande locale={locale} porte="prevoyance" />
      <SiteFooter note={t.footer} locale={locale} altPath={t.alt} />
    </div>
  );
}

/* ---------- Économie d'impôt 3a ---------- */

/* Exemples calculés au build avec le même moteur que le calculateur (lisibles sans JavaScript). */
const EXEMPLES: { etat: I.EtatCivil; enfants: number; revenu: number; versement: number }[] = [
  { etat: "seul", enfants: 0, revenu: 60000, versement: P26.avecLPP },
  { etat: "seul", enfants: 0, revenu: 90000, versement: P26.avecLPP },
  { etat: "seul", enfants: 0, revenu: 150000, versement: P26.avecLPP },
  { etat: "marie", enfants: 2, revenu: 140000, versement: 2 * P26.avecLPP },
];
const COMMUNE_EX: Record<I.Canton, string> = { GE: "Genève", VD: "Lausanne", VS: "Sion", FR: "Fribourg", NE: "Neuchâtel", JU: "Delémont", BE: "Saint-Imier" };
const ex = (c: I.Canton, e: (typeof EXEMPLES)[number]) =>
  I.economie3a({ canton: c, commune: COMMUNE_EX[c], etat: e.etat, enfants: e.enfants, revenu: e.revenu }, e.versement);
const EX_GE = EXEMPLES.map((e) => ex("GE", e));
const EX_VD = EXEMPLES.map((e) => ex("VD", e));
const CAP_GE = I.impotCapital("GE", "Genève", "seul", 0, 100000);
const CAP_VD = I.impotCapital("VD", "Lausanne", "seul", 0, 100000);
/* Un exemple par canton ajouté : personne seule, 90 000 CHF, versement maximal ; retrait de 100 000 CHF. */
const AUTRES: I.Canton[] = ["VS", "FR", "NE", "JU", "BE"];
const EX_AUTRES = AUTRES.map((c) => ({
  canton: c,
  commune: COMMUNE_EX[c],
  economie: ex(c, EXEMPLES[1]).economie.total,
  retrait: I.impotCapital(c, COMMUNE_EX[c], "seul", 0, 100000).total,
}));

const IMPOT = {
  fr: {
    path: OUTILS.impot3a,
    alt: OUTILS_EN.impot3a,
    titre: `Économie d’impôt 3a en Suisse romande${N}: calcul 2026`,
    description:
      "Ce qu’un versement 3a vous fait économiser d’impôt à Genève, dans les cantons de Vaud, du Valais, de Fribourg, de Neuchâtel, du Jura ou dans le Jura bernois en 2026.",
    h1: "Économie d’impôt grâce au 3e pilier",
    intro: `À Genève, une personne seule avec 90 000 CHF de revenu imposable économise environ ${nfFr.format(EX_GE[1].economie.total)} CHF d’impôt en versant ${nfFr.format(P26.avecLPP)} CHF sur son 3a en 2026 ; à Lausanne, environ ${nfFr.format(EX_VD[1].economie.total)} CHF. Indiquez votre situation pour votre propre estimation, impôt fédéral, cantonal et communal compris.`,
    prive: "Le calcul se fait dans votre navigateur. Nous ne recevons ni votre revenu ni votre commune.",
    miettes: [{ name: "Accueil", href: "/" }, { name: "3e pilier", href: "/3e-pilier/" }, { name: "Économie d’impôt 3a" }] as Miette[],
    appli: "Calculateur d’économie d’impôt 3a",
    partage: "Combien d’impôt votre versement 3a vous fait économiser en Suisse romande, barèmes 2026.",
    exTitre: "Exemples avec les barèmes 2026",
    exTexte: `Le revenu indiqué est le revenu imposable avant le versement, pour une personne sans fortune domiciliée en ville de Genève ou à Lausanne. Le tableau donne l’économie totale en CHF, impôt fédéral, cantonal et communal compris.`,
    exCaption: "Économie d’impôt 2026 pour un versement 3a, en CHF",
    autresTitre: "Dans les autres cantons couverts",
    autresTexte: `Pour une personne seule avec 90${N}000 CHF de revenu imposable qui verse ${nfFr.format(P26.avecLPP)} CHF, et pour un retrait de 100${N}000 CHF, dans le chef-lieu de chaque canton (à Saint-Imier pour le Jura bernois).`,
    autresCaption: "Économie d’impôt 3a et impôt sur un retrait, 2026, en CHF",
    thLieu: "Commune",
    thEco: "Économie",
    thRetrait: "Impôt sur un retrait de 100 000",
    thProfil: "Profil",
    thVersement: "Versement",
    profil: (e: (typeof EXEMPLES)[number]) =>
      e.etat === "seul" ? `Personne seule, ${nfFr.format(e.revenu)} CHF` : `Couple marié, ${e.enfants} enfants, ${nfFr.format(e.revenu)} CHF, deux versements`,
    plafondsTitre: "Plafonds 3a 2026 et 2027",
    plafondsCaption: "Versement 3a maximal déductible par personne (OFAS)",
    thSituation: "Situation",
    avec: "Avec caisse de pension (LPP)",
    sans: "Sans caisse de pension",
    sansMontant: (m: number) => `20${N}% du revenu, max. ${nfFr.format(m)}`,
    plafondsSource: "Source : Office fédéral des assurances sociales (OFAS), montants 2026 et 2027 ; art. 7 OPP 3.",
    lienTaux: "Où placer votre 3a ?",
    lienTauxTexte: `Les taux des comptes 3a de ${NB} banques, relevés le ${RELEVE}.`,
    faq: [
      {
        q: `Combien d’impôt économise-t-on avec un versement 3a${N}?`,
        a: `Souvent entre un quart et deux cinquièmes du versement, selon le revenu, la commune et la famille. Avec les barèmes 2026, un versement de ${nfFr.format(P26.avecLPP)} CHF fait économiser ${nfFr.format(EX_GE[0].economie.total)} CHF à une personne seule de Genève avec 60 000 CHF de revenu imposable, et ${nfFr.format(EX_GE[2].economie.total)} CHF avec 150 000 CHF. À Lausanne, l’économie est de ${nfFr.format(EX_VD[0].economie.total)} et de ${nfFr.format(EX_VD[2].economie.total)} CHF.`,
      },
      {
        q: `Combien peut-on déduire en 2026 et en 2027${N}?`,
        a: `Avec une caisse de pension, ${nfFr.format(P26.avecLPP)} CHF en 2026 et ${nfFr.format(P27.avecLPP)} CHF en 2027, par personne qui travaille. Sans caisse de pension, 20 % du revenu de l’activité, au plus ${nfFr.format(P26.sansLPP)} CHF en 2026 et ${nfFr.format(P27.sansLPP)} CHF en 2027 (art. 7 OPP 3, montants de l’OFAS). Le versement se déduit en entier du revenu imposable, à l’impôt fédéral comme à l’impôt cantonal et communal.`,
      },
      {
        q: `Pourquoi l’économie augmente-t-elle avec le revenu${N}?`,
        a: "Le versement est retiré de la tranche la plus haute de votre revenu, celle qui est imposée au taux le plus élevé (le taux marginal). Plus le revenu imposable est haut, plus chaque franc déduit fait baisser l’impôt, jusqu’au taux maximal du barème.",
      },
      {
        q: `Le retrait du 3a est-il imposé${N}?`,
        a: `Oui, une seule fois, à part du reste du revenu et à taux réduit : un cinquième du barème pour l’impôt fédéral et à Genève, un cinquième du taux pour Vaud. Pour un retrait de 100 000 CHF en 2026, une personne seule paie environ ${nfFr.format(CAP_GE.total)} CHF à Genève et ${nfFr.format(CAP_VD.total)} CHF à Lausanne. Les capitaux retirés la même année s’additionnent, si bien qu’échelonner les retraits sur plusieurs années réduit souvent l’impôt.`,
      },
      {
        q: `Quand verser pour déduire sur l’année 2026${N}?`,
        a: "Le versement doit être crédité sur le compte 3a au plus tard le 31 décembre 2026. Pour les virements, les banques fixent souvent une date limite quelques jours plus tôt, qu’il vaut la peine de vérifier auprès de la vôtre. Un versement fait en janvier 2027 compte pour 2027.",
      },
      {
        q: `D’où viennent les barèmes du calculateur${N}?`,
        a: "Le calculateur reprend les barèmes 2026 de l’Administration fédérale des contributions pour l’impôt fédéral direct, et pour chaque canton les lois, barèmes et listes de coefficients communaux publiés par son administration fiscale. Les résultats ont été vérifiés sur les calculettes officielles de Genève, de Vaud, du Valais, de Fribourg et de Neuchâtel le 22.11.2026, et du Jura le 23.11.2026, à quelques centimes près. Pour le Jura bernois, ils ont été vérifiés sur le calculateur de l’AFC, vers lequel le canton de Berne renvoie.",
      },
    ] as Faq[],
    maj: `Mis à jour le ${dateLongue(DATE_IMPOTS, "fr")}, avec les barèmes 2026 de l’AFC et des administrations fiscales de Genève, Vaud, du Valais, de Fribourg, de Neuchâtel, du Jura et de Berne, et les plafonds 3a de l’OFAS.`,
    footer: "Cette estimation est donnée à titre d’information. Seule la taxation de l’administration fiscale fait foi.",
  },
  en: {
    path: OUTILS_EN.impot3a,
    alt: OUTILS.impot3a,
    titre: "Pillar 3a tax savings in French-speaking Switzerland 2026",
    description:
      "How much tax a pillar 3a payment saves you in Geneva, Vaud, Valais, Fribourg, Neuchâtel, Jura or the Bernese Jura, with 2026 tax scales checked canton by canton.",
    h1: "Tax savings from pillar 3a",
    intro: `In Geneva, a single person with CHF 90,000 of taxable income saves about CHF ${nfEn.format(EX_GE[1].economie.total)} in tax by paying CHF ${nfEn.format(P26.avecLPP)} into a 3a in 2026; in Lausanne, about CHF ${nfEn.format(EX_VD[1].economie.total)}. Enter your situation for your own estimate, including federal, cantonal and municipal tax.`,
    prive: "The calculation runs in your browser. We receive neither your income nor your municipality.",
    miettes: [{ name: "Home", href: "/en/" }, { name: "Pillar 3a", href: "/en/pillar-3a/" }, { name: "3a tax savings" }] as Miette[],
    appli: "Pillar 3a tax savings calculator",
    partage: "How much tax your pillar 3a payment saves you in French-speaking Switzerland, 2026 tax scales.",
    exTitre: "Examples with the 2026 tax scales",
    exTexte: "The income shown is taxable income before the payment, for a person with no wealth living in the city of Geneva or in Lausanne. The table gives the total saving in CHF, including federal, cantonal and municipal tax.",
    exCaption: "2026 tax saving for a pillar 3a payment, in CHF",
    autresTitre: "In the other cantons covered",
    autresTexte: `For a single person with CHF 90,000 of taxable income who pays in CHF ${nfEn.format(P26.avecLPP)}, and for a CHF 100,000 withdrawal, in each canton’s main town (Saint-Imier for the Bernese Jura).`,
    autresCaption: "Pillar 3a tax saving and tax on a withdrawal, 2026, in CHF",
    thLieu: "Municipality",
    thEco: "Saving",
    thRetrait: "Tax on a 100,000 withdrawal",
    thProfil: "Profile",
    thVersement: "Payment",
    profil: (e: (typeof EXEMPLES)[number]) =>
      e.etat === "seul" ? `Single, CHF ${nfEn.format(e.revenu)}` : `Married couple, ${e.enfants} children, CHF ${nfEn.format(e.revenu)}, two payments`,
    plafondsTitre: "Pillar 3a caps for 2026 and 2027",
    plafondsCaption: "Maximum deductible 3a payment per person (FSIO)",
    thSituation: "Situation",
    avec: "With a pension fund (BVG/LPP)",
    sans: "Without a pension fund",
    sansMontant: (m: number) => `20% of income, max. ${nfEn.format(m)}`,
    plafondsSource: "Source: Federal Social Insurance Office (FSIO/OFAS), 2026 and 2027 amounts; art. 7 OPP 3.",
    lienTaux: "Where to keep your 3a?",
    lienTauxTexte: `Pillar 3a account rates at ${NB} banks, read on ${RELEVE}.`,
    faq: [
      {
        q: "How much tax does a pillar 3a payment save?",
        a: `Often between a quarter and two fifths of the payment, depending on income, municipality and family. With the 2026 tax scales, a CHF ${nfEn.format(P26.avecLPP)} payment saves a single person in Geneva CHF ${nfEn.format(EX_GE[0].economie.total)} with CHF 60,000 of taxable income, and CHF ${nfEn.format(EX_GE[2].economie.total)} with CHF 150,000. In Lausanne, the saving is CHF ${nfEn.format(EX_VD[0].economie.total)} and CHF ${nfEn.format(EX_VD[2].economie.total)}.`,
      },
      {
        q: "How much can you deduct in 2026 and 2027?",
        a: `With a pension fund, CHF ${nfEn.format(P26.avecLPP)} in 2026 and CHF ${nfEn.format(P27.avecLPP)} in 2027, per working person. Without a pension fund, 20% of earned income, up to CHF ${nfEn.format(P26.sansLPP)} in 2026 and CHF ${nfEn.format(P27.sansLPP)} in 2027 (art. 7 OPP 3, FSIO amounts). The payment is deducted in full from taxable income, for federal as well as cantonal and municipal tax.`,
      },
      {
        q: "Why does the saving grow with income?",
        a: "The payment comes off the top slice of your income, which is taxed at your highest rate (the marginal rate). The higher your taxable income, the more each deducted franc lowers the tax, up to the top rate of the scale.",
      },
      {
        q: "Is a 3a withdrawal taxed?",
        a: `Yes, once, separately from your other income and at a reduced rate: one fifth of the scale for federal tax and in Geneva, one fifth of the rate in Vaud. For a CHF 100,000 withdrawal in 2026, a single person pays about CHF ${nfEn.format(CAP_GE.total)} in Geneva and CHF ${nfEn.format(CAP_VD.total)} in Lausanne. Capital withdrawn in the same year is added together, so spreading withdrawals over several years often lowers the tax.`,
      },
      {
        q: "When must you pay in to deduct for 2026?",
        a: "The payment must be credited to the 3a account by 31 December 2026 at the latest. For transfers, banks often set a cut-off a few days earlier, so it is worth checking with yours. A payment made in January 2027 counts for 2027.",
      },
      {
        q: "Where do the calculator’s tax scales come from?",
        a: "The calculator uses the Federal Tax Administration’s 2026 scales for direct federal tax and, for each canton, the laws, scales and lists of municipal multipliers published by its tax administration. The results were checked against the official calculators of Geneva, Vaud, Valais, Fribourg and Neuchâtel on 22.11.2026, and of Jura on 23.11.2026, to within a few centimes. For the Bernese Jura, they were checked against the Federal Tax Administration’s calculator, which the canton of Bern links to.",
      },
    ] as Faq[],
    maj: `Updated on ${dateLongue(DATE_IMPOTS, "en")}, with 2026 tax scales from the Federal Tax Administration and the tax administrations of Geneva, Vaud, Valais, Fribourg, Neuchâtel, Jura and Bern, and 3a caps from the FSIO.`,
    footer: "This estimate is for information only. The tax administration’s assessment alone is authoritative.",
  },
};

export const metaImpot3a = (locale: Locale) => {
  const t = IMPOT[locale];
  return pageMetadata({ title: t.titre, description: t.description, path: t.path, locale, ...(locale === "fr" ? { enPath: t.alt } : { frPath: t.alt }) });
};

export function PageImpot3a({ locale }: { locale: Locale }) {
  const t = IMPOT[locale];
  const nf = locale === "fr" ? nfFr : nfEn;
  const url = abs(t.path);
  const ld = graph(
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: t.titre,
      description: t.description,
      inLanguage: locale === "fr" ? "fr-CH" : "en",
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORG_ID },
      datePublished: "2026-11-22",
      dateModified: DATE_PAGE.impot3a,
      breadcrumb: { "@id": `${url}#breadcrumb` },
      mainEntity: { "@id": `${url}#outil` },
      citation: [
        "https://swisstaxcalculator.estv.admin.ch/",
        "https://www.ge.ch/afcaelp1dmapublic/2026",
        "https://www.vd.ch/etat-droit-finances/impots/impots-pour-les-individus/calculer-mes-impots",
        "https://taxcalculator.apps.vs.ch/",
        "https://www.fr.ch/document/583511",
        "https://sccoonlinecalculatorpp.ne.ch/",
        "https://www.sv.fin.be.ch/fr/start/e-services/steuerrechner.html",
        "https://www.fedlex.admin.ch/eli/cc/1985/1778_1778_1778/fr#art_7",
        "https://cms.news.admin.ch/fileservice/sdweb-docs-prod-nsbcch-files/files/2026/10/02/541161b3-a24c-412e-aa24-7f5955a910fc.pdf",
      ],
    },
    {
      "@type": "WebApplication",
      "@id": `${url}#outil`,
      name: t.appli,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      inLanguage: locale === "fr" ? "fr-CH" : "en",
      isAccessibleForFree: true,
      provider: { "@id": ORG_ID },
    },
    breadcrumbLd(t.miettes, `${url}#breadcrumb`),
    { ...faqLd(t.faq), "@id": `${url}#faq` },
  );
  return (
    <div className="page-outil">
      <JsonLd data={ld} />
      <SiteHeader current="prevoyance" locale={locale} altPath={t.alt} />
      <main>
        <div className="wrap">
          <Breadcrumbs items={t.miettes} locale={locale} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>
          <p className="prive">
            {CADENAS}
            {t.prive}
          </p>
          <PartagerOutil path={t.path} title={t.appli} text={t.partage} locale={locale} />
          <EconomieImpot3a locale={locale} />

          <section className="reperes-statiques exemples-3a">
            <h2>{t.exTitre}</h2>
            <p>{t.exTexte}</p>
            <table className="assureurs">
              <caption className="visually-hidden">{t.exCaption}</caption>
              <thead>
                <tr>
                  <th scope="col">{t.thProfil}</th>
                  <th scope="col">{t.thVersement}</th>
                  <th scope="col">{locale === "fr" ? "Genève" : "Geneva"}</th>
                  <th scope="col">Lausanne</th>
                </tr>
              </thead>
              <tbody>
                {EXEMPLES.map((e, i) => (
                  <tr key={i}>
                    <td>{t.profil(e)}</td>
                    <td>{nf.format(e.versement)}</td>
                    <td><b>{nf.format(EX_GE[i].economie.total)}</b></td>
                    <td><b>{nf.format(EX_VD[i].economie.total)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2>{t.autresTitre}</h2>
            <p>{t.autresTexte}</p>
            <table className="assureurs">
              <caption className="visually-hidden">{t.autresCaption}</caption>
              <thead>
                <tr>
                  <th scope="col">{t.thLieu}</th>
                  <th scope="col">{t.thEco}</th>
                  <th scope="col">{t.thRetrait}</th>
                </tr>
              </thead>
              <tbody>
                {EX_AUTRES.map((e) => (
                  <tr key={e.canton}>
                    <td>{e.commune} ({I.NOM_CANTON[locale][e.canton]})</td>
                    <td><b>{nf.format(e.economie)}</b></td>
                    <td>{nf.format(e.retrait)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2>{t.plafondsTitre}</h2>
            <table className="assureurs">
              <caption>{t.plafondsCaption}</caption>
              <thead>
                <tr>
                  <th scope="col">{t.thSituation}</th>
                  <th scope="col">2026</th>
                  <th scope="col">2027</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t.avec}</td>
                  <td>{nf.format(P26.avecLPP)}</td>
                  <td><b>{nf.format(P27.avecLPP)}</b></td>
                </tr>
                <tr>
                  <td>{t.sans}</td>
                  <td>{t.sansMontant(P26.sansLPP)}</td>
                  <td><b>{t.sansMontant(P27.sansLPP)}</b></td>
                </tr>
              </tbody>
            </table>
            <p className="source-outil">{t.plafondsSource}</p>
          </section>

          <p className="lien-outil-3a">
            <a href={locale === "fr" ? OUTILS.taux3a : OUTILS_EN.taux3a}>{t.lienTaux}</a> {t.lienTauxTexte}
          </p>
          <p className="lien-outil-3a">
            <a href={locale === "fr" ? PAGES_DONNEES.communes3a : PAGES_DONNEES_EN.communes3a}>{locale === "fr" ? "L’économie commune par commune" : "Savings municipality by municipality"}</a>{" "}
            {locale === "fr" ? "Le même calcul pour un profil type, dans toutes les communes des cantons couverts, avec un tableau à trier." : "The same calculation for a standard profile, in every municipality of the cantons covered, in a sortable table."}
          </p>
        </div>
        <Faqs faq={t.faq} maj={t.maj} />
      </main>
      <SiteFooter note={t.footer} locale={locale} altPath={t.alt} />
    </div>
  );
}
