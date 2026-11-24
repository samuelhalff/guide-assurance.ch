import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { PartagerOutil } from "@/components/site/partager-outil";
import { Taux3a, Titres3a } from "@/components/outils/taux-3a";
import { CtaDemande } from "@/components/demande/cta-demande";
import { BarreDemande } from "@/components/demande/barre-demande";
import { FRAIS_COMPTES, TITRES_3A } from "@/lib/frais3a";
import { OUTILS_3A_ASSURANCE } from "@/lib/nav";
import { COMPTES_3A, RELEVE_LE, TAUX_MAX, TAUX_MIN, tauxEn, tauxFr } from "@/lib/taux3a";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { DATE_PAGE } from "@/lib/donnees";
import { OUTILS, OUTILS_EN, PAGES_DONNEES, PAGES_DONNEES_EN } from "@/lib/nav";
import type { Locale } from "@/lib/i18n";
import { Alert } from "@/components/ui/alert";
import { ESPACE_FINE as N } from "@/lib/nombres";

import { FRAIS_LE, Faqs, GRATUITS, NB, NT, RELEVE, mediane, nfEn, nfFr, type Faq } from "@/components/outils/pages-3a-commun";

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
      <main id="contenu">
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
          <Alert variant="info" className="lien-outil-3a">
            <p>
              <a href={locale === "fr" ? OUTILS_3A_ASSURANCE.fr : OUTILS_3A_ASSURANCE.en}>{t.lienAssurance}</a> {t.lienAssuranceTexte}
            </p>
          </Alert>
          <Alert variant="info" className="lien-outil-3a">
            <p>
              <a href={locale === "fr" ? OUTILS.impot3a : OUTILS_EN.impot3a}>{t.lienImpot}</a> {t.lienImpotTexte}
            </p>
          </Alert>
          <Alert variant="info" className="lien-outil-3a">
            <p>
              <a href={locale === "fr" ? PAGES_DONNEES.historique3a : PAGES_DONNEES_EN.historique3a}>{locale === "fr" ? "Historique des taux 3a" : "Pillar 3a rate history"}</a>{" "}
              {locale === "fr" ? "Chaque relevé hebdomadaire depuis le 22.11.2026, avec la moyenne, la médiane et le fichier CSV." : "Every weekly survey since 22.11.2026, with the mean, the median and the CSV file."}
            </p>
          </Alert>
        </div>
        <Faqs faq={t.faq} maj={t.maj} />
      </main>
      <BarreDemande locale={locale} porte="prevoyance" />
      <SiteFooter note={t.footer} locale={locale} altPath={t.alt} />
    </div>
  );
}

