import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { PartagerOutil } from "@/components/site/partager-outil";
import { FaqSections, faqOutilLd, type FaqOutil } from "@/components/site/faq-sections";
import { GarantiesPj } from "@/components/outils/garanties-pj";
import { CtaOffres } from "@/components/outils/cta-offres";
import { BandeConfiance } from "@/components/site/bande-confiance";
import { DEMANDE_PORTE } from "@/lib/demande-porte";
import { CONTRATS, LU_LE, NB_ASSUREURS, NB_CONTRATS, NB_PORTEURS } from "@/lib/garanties-pj";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { DATE_PAGE } from "@/lib/donnees";
import { dateLongue, type Locale } from "@/lib/i18n";
import { OUTILS, OUTILS_EN } from "@/lib/nav";
import { FAQ_PJ, OS_167, OS_URL } from "@/components/outils/faq-garanties-pj";

/* « Protection juridique : ce que couvrent les contrats » (/protection-juridique/comparatif-garanties/ et version
   anglaise). Tableau statique tiré des CGA publiques, ordre alphabétique, sans prime ni classement. Les fichiers de
   route ne font qu'appeler ces fonctions. */
const N = " ";

const T = {
  fr: {
    path: OUTILS.garantiesPj,
    alt: OUTILS_EN.garantiesPj,
    titre: `Protection juridique${N}: ce que couvrent les contrats`,
    description: `Garanties de ${NB_CONTRATS} contrats de protection juridique privée et circulation vendus en Suisse, lues dans leurs conditions générales : domaines, plafonds, carence, avocat.`,
    h1: `Protection juridique${N}: ce que couvrent les contrats`,
    intro: `Ce tableau reprend ${NB_CONTRATS} contrats vendus sous ${NB_ASSUREURS} marques et assurés par ${NB_PORTEURS} compagnies, tels que leurs conditions générales (CGA) les décrivent : domaines couverts, plafond par cas, délai de carence, franchise et choix de l’avocat. Les marques sont classées par ordre alphabétique et les primes ne sont pas affichées.`,
    prive: "Cette page n’a pas de formulaire et n’enregistre rien de ce que vous lisez.",
    miettes: [{ name: "Accueil", href: "/" }, { name: "Protection juridique", href: "/protection-juridique/" }, { name: "Ce que couvrent les contrats" }] as Miette[],
    appli: "Garanties des contrats de protection juridique",
    partage: "Les garanties des contrats de protection juridique suisses, lues dans leurs conditions générales.",
    enBref: "Avant de signer, vérifiez cinq points dans les CGA :",
    enBrefListe: [
      "le délai de carence, surtout pour le droit du travail et le bail ;",
      "les domaines dont vous pourriez avoir besoin, et ceux qui ne sont qu’en option ;",
      "le plafond par cas en Suisse et à l’étranger ;",
      "la valeur litigieuse minimale et la franchise ;",
      "le moment où vous pouvez choisir votre avocat.",
    ],
    ctaHaut: "Recevoir des offres de protection juridique",
    ctaBas: "Comparer les offres avec un conseiller ? Indiquez ce que vous voulez couvrir, un conseiller d’un courtier partenaire vous recontacte.",
    tableauTitre: "Garanties contrat par contrat",
    tableauTexte: `CGA lues le ${dateLongue(LU_LE, "fr")}. Les contrats changent : la version et la date de chaque document sont indiquées, et seules les conditions remises avec votre offre font foi.`,
    sourcesTitre: "Documents lus",
    sourcesLegales: "Textes de loi",
    maj: `Mis à jour le ${dateLongue(DATE_PAGE.garantiesPj, "fr")}. Sources : conditions générales publiées par chaque assureur (liste ci-dessus) et Fedlex (OS).`,
    footer: "Ce tableau résume des conditions générales ; le contrat et ses CGA font foi.",
  },
  en: {
    path: OUTILS_EN.garantiesPj,
    alt: OUTILS.garantiesPj,
    titre: "Legal protection insurance: what Swiss policies cover",
    description: `Cover of ${NB_CONTRATS} private and traffic legal protection policies sold in Switzerland, read in their general terms: areas, limits, waiting periods, lawyer.`,
    h1: "Legal protection insurance: what the policies cover",
    intro: `This table sets out ${NB_CONTRATS} policies sold under ${NB_ASSUREURS} brands and underwritten by ${NB_PORTEURS} companies, as their general terms and conditions describe them: areas of law covered, limit per case, waiting period, excess and choice of lawyer. Brands are listed in alphabetical order and premiums are not shown.`,
    prive: "This page has no form and records nothing of what you read.",
    miettes: [{ name: "Home", href: "/en/" }, { name: "Legal protection", href: "/en/legal-protection-insurance/" }, { name: "What the policies cover" }] as Miette[],
    appli: "Legal protection insurance cover compared",
    partage: "What Swiss legal protection insurance policies cover, read in their general terms.",
    enBref: "Before you sign, check five points in the general terms:",
    enBrefListe: [
      "the waiting period, especially for employment and tenancy disputes;",
      "the areas of law you might need, and which ones are only optional;",
      "the limit per case in Switzerland and abroad;",
      "the minimum amount in dispute and the excess;",
      "when you are allowed to choose your own lawyer.",
    ],
    ctaHaut: "Get legal protection quotes",
    ctaBas: "Want to compare offers with an adviser? Say what you want covered and an adviser from a partner broker gets back to you.",
    tableauTitre: "Cover, policy by policy",
    tableauTexte: `General terms read on ${dateLongue(LU_LE, "en")}. Policies change: the version and date of each document are shown, and only the terms supplied with your offer are binding.`,
    sourcesTitre: "Documents read",
    sourcesLegales: "Legislation",
    maj: `Updated on ${dateLongue(DATE_PAGE.garantiesPj, "en")}. Sources: general terms published by each insurer (listed above) and Fedlex (Insurance Supervision Ordinance).`,
    footer: "This table summarises general terms and conditions; the policy and its terms are binding.",
  },
};

export const metaGarantiesPj = (locale: Locale) => {
  const t = T[locale];
  return pageMetadata({ title: t.titre, description: t.description, path: t.path, locale, ...(locale === "fr" ? { enPath: t.alt } : { frPath: t.alt }) });
};

export function PageGarantiesPj({ locale }: { locale: Locale }) {
  const t = T[locale];
  const url = abs(t.path);
  const faq: FaqOutil[] = FAQ_PJ[locale];
  const demande = DEMANDE_PORTE[locale]("protection-juridique");
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
      datePublished: "2026-11-23",
      dateModified: DATE_PAGE.garantiesPj,
      breadcrumb: { "@id": `${url}#breadcrumb` },
      mainEntity: { "@id": `${url}#garanties` },
      citation: [...new Set([...CONTRATS.map((c) => c.doc.url), OS_URL])],
    },
    {
      "@type": "Dataset",
      "@id": `${url}#garanties`,
      name: t.appli,
      description: t.description,
      inLanguage: locale === "fr" ? "fr-CH" : "en",
      dateModified: LU_LE,
      temporalCoverage: LU_LE,
      isAccessibleForFree: true,
      creator: { "@id": ORG_ID },
      variableMeasured:
        locale === "fr"
          ? ["Domaines du droit couverts", "Plafond par cas", "Délai de carence", "Franchise", "Libre choix de l’avocat"]
          : ["Areas of law covered", "Limit per case", "Waiting period", "Excess", "Free choice of lawyer"],
    },
    breadcrumbLd(t.miettes, `${url}#breadcrumb`),
    { ...faqLd(faqOutilLd(faq)), "@id": `${url}#faq` },
  );
  return (
    <div className="page-outil page-garanties-pj">
      <JsonLd data={ld} />
      <SiteHeader current="outils" locale={locale} altPath={t.alt} />
      <main>
        <div className="wrap">
          <Breadcrumbs items={t.miettes} locale={locale} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>
          <CtaOffres locale={locale} href={demande} libelle={t.ctaHaut} />
          <BandeConfiance locale={locale} signaux={["pj"]} compacte />
          <div className="en-bref">
            <b>{t.enBref}</b>
            <ul>
              {t.enBrefListe.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <PartagerOutil path={t.path} title={t.appli} text={t.partage} locale={locale} />

          <section className="reperes-statiques">
            <h2>{t.tableauTitre}</h2>
            <p>{t.tableauTexte}</p>
            <GarantiesPj locale={locale} />
          </section>

          <CtaOffres locale={locale} href={demande} libelle={t.ctaHaut} note={t.ctaBas} className="apres-tableau" />

          <section className="sources-pj">
            <h2>{t.sourcesTitre}</h2>
            <ol>
              {CONTRATS.map((c) => (
                <li key={c.id}>
                  {c.assureur}, {c.produit} : <a href={c.doc.url}>{c.doc.titre}</a>, {c.doc.version} ({locale === "fr" ? "lu le" : "read on"} {dateLongue(LU_LE, locale)})
                </li>
              ))}
              <li>
                {t.sourcesLegales} : <a href={OS_URL}>{OS_167[locale]}</a>
              </li>
            </ol>
          </section>
        </div>

        <div className="wrap faq">
          <p className="maj">{t.maj}</p>
          <FaqSections faq={faq} />
        </div>
      </main>
      <SiteFooter note={t.footer} locale={locale} altPath={t.alt} />
    </div>
  );
}
