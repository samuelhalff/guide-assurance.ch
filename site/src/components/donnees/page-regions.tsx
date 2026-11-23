import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { AppelRappel, Faqs, N, Telechargement, chf, nombre, pct, type Faq } from "@/components/donnees/commun";
import * as R from "@/lib/engines/regions-primes";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { DATE_PRIMES, DATE_PAGE_DONNEES, LICENCE_DONNEES } from "@/lib/donnees";
import { dateLongue, type Locale } from "@/lib/i18n";
import { OUTILS, OUTILS_EN, PAGES_DONNEES, PAGES_DONNEES_EN } from "@/lib/nav";

/* Primes LAMal 2027 par région de prime (idée 9 du rapport 08). Une seule page, une section ancrée par région :
   dix régions, dont trois se confondent avec leur canton (GE, NE, JU) ; des pages séparées seraient quasi
   identiques (docs/decisions.md, §8 untricies). Aucun assureur nommé, statistiques des offres de la région. */

const CANTON_FR: Record<string, string> = { GE: "Genève", VD: "Vaud", VS: "Valais", FR: "Fribourg", NE: "Neuchâtel", JU: "Jura", BE: "Berne" };
const CANTON_EN: Record<string, string> = { GE: "Geneva", VD: "Vaud", VS: "Valais", FR: "Fribourg", NE: "Neuchâtel", JU: "Jura", BE: "Bern" };
const UNIQUE = new Set(["GE", "NE", "JU"]);

export function nomRegion(r: R.Region, locale: Locale): string {
  if (locale === "fr") {
    if (r.canton === "BE") return "Jura bernois (région bernoise 2)";
    if (UNIQUE.has(r.canton)) return `${r.canton === "GE" ? "Genève" : `Canton ${r.canton === "NE" ? "de Neuchâtel" : "du Jura"}`} (région unique)`;
    return `${CANTON_FR[r.canton]}, région ${r.region} (${r.chefLieu})`;
  }
  if (r.canton === "BE") return "Bernese Jura (Bern region 2)";
  if (UNIQUE.has(r.canton)) return `${CANTON_EN[r.canton]} (single region)`;
  return `${CANTON_EN[r.canton]}, region ${r.region} (${r.chefLieu})`;
}

const PROFIL_FR: Record<string, string> = {
  a300a: `Adulte, franchise 300${N}CHF, avec accident`,
  a300s: `Adulte, franchise 300${N}CHF, sans accident`,
  a2500s: `Adulte, franchise 2${N}500${N}CHF, sans accident`,
  j300a: `Jeune adulte (19 à 25 ans), franchise 300${N}CHF, avec accident`,
  e0a: `Enfant, franchise 0${N}CHF, avec accident`,
};
const PROFIL_EN: Record<string, string> = {
  a300a: "Adult, CHF 300 deductible, with accident cover",
  a300s: "Adult, CHF 300 deductible, without accident cover",
  a2500s: "Adult, CHF 2,500 deductible, without accident cover",
  j300a: "Young adult (19 to 25), CHF 300 deductible, with accident cover",
  e0a: "Child, CHF 0 deductible, with accident cover",
};

const adulte = (r: R.Region) => r.profils.find((p) => p.id === "a300a")!;
const parMediane = [...R.REGIONS].sort((a, b) => adulte(a).mediane - adulte(b).mediane);
const BAS = parMediane[0];
const HAUT = parMediane[parMediane.length - 1];
const ECARTS = R.REGIONS.map((r) => adulte(r).ecartPct);
const ECART_MIN = Math.min(...ECARTS);
const ECART_MAX = Math.max(...ECARTS);
const NB_OFFRES_MIN = Math.min(...R.REGIONS.map((r) => adulte(r).n));
const NB_OFFRES_MAX = Math.max(...R.REGIONS.map((r) => adulte(r).n));
const deuxRegions = (c: string) => R.regionsDuCanton(c as never);
const CANTONS_DEUX = ["VD", "VS", "FR"];

const CSV = "/data/primes-2027-regions.csv";

const TXT = {
  fr: {
    path: PAGES_DONNEES.regions,
    alt: PAGES_DONNEES_EN.regions,
    titre: `Primes LAMal 2027 par région${N}: médiane et quartiles`,
    description: `Médiane, quartiles et écart des primes LAMal 2027 dans les dix régions de prime de Suisse romande, d’après les primes approuvées par l’OFSP.`,
    h1: "Primes LAMal 2027 par région de prime",
    intro: `En 2027, la prime mensuelle médiane d’un adulte (franchise 300${N}CHF, accident compris) va de ${chf(adulte(BAS).mediane, "fr", 2)} ${dans(BAS, "fr")} à ${chf(adulte(HAUT).mediane, "fr", 2)} ${dans(HAUT, "fr")}, d’après les primes approuvées par l’OFSP. Vaud, le Valais et Fribourg comptent deux régions chacun : votre prime dépend de la région de votre commune de domicile.`,
    miettes: [{ name: "Accueil", href: "/" }, { name: "Assurance maladie", href: "/assurance-maladie/" }, { name: "Primes 2027", href: "/assurance-maladie/primes/" }, { name: "Par région" }] as Miette[],
    resumeTitre: `Quelle région paie le plus, laquelle le moins${N}?`,
    resumeTexte: `La médiane est la plus haute ${dans(HAUT, "fr")} et la plus basse ${dans(BAS, "fr")}. Le tableau donne, pour un adulte avec une franchise de 300${N}CHF et la couverture accident, la prime médiane des offres de chaque région, la prime moyenne estimée par l’OFSP et l’écart entre l’offre la plus basse et la plus haute.`,
    resumeCaption: `Primes mensuelles 2027 d’un adulte, franchise 300${N}CHF, avec accident, en CHF`,
    thRegion: "Région",
    thMediane: "Médiane des offres",
    thOfsp: "Moyenne OFSP",
    thEcart: "Écart entre offres",
    lireTitre: `Comment ces chiffres sont-ils calculés${N}?`,
    lire: `Chaque offre compte pour une observation : un produit d’un assureur, modèle standard ou alternatif, proposé dans la région pour le profil indiqué. La médiane partage ces offres en deux moitiés, et les quartiles en quatre parts égales (interpolation linéaire, comme la fonction QUARTILE.INCLUS d’un tableur). Ces statistiques ne sont pas pondérées par le nombre d’assurés. La « moyenne OFSP » est l’estimation de la prime moyenne réellement payée dans la région, toutes franchises et tous modèles confondus, publiée par l’OFSP avec la liste des régions ; elle est donc plus basse que la médiane des offres à franchise 300${N}CHF.`,
    regionQ: (r: R.Region) => `Combien coûte l’assurance de base ${dans(r, "fr")}${N}?`,
    regionR: (r: R.Region) => {
      const a = adulte(r);
      return `Pour un adulte avec une franchise de 300${N}CHF et la couverture accident, la moitié des ${a.n} offres de la région coûte moins de ${chf(a.mediane, "fr", 2)} par mois. Un quart des offres coûte moins de ${chf(a.q1, "fr", 2)} et un quart plus de ${chf(a.q3, "fr", 2)} ; entre l’offre la plus basse et la plus haute, l’écart atteint ${pct(a.ecartPct, "fr")}, soit ${chf(a.ecartAnnuel, "fr")} par an. L’OFSP estime à ${chf(r.primeMoyenneOfsp.adulte, "fr", 2)} la prime moyenne payée par un adulte de la région.`;
    },
    voisine: (r: R.Region, autre: R.Region) => {
      const d = adulte(r).mediane - adulte(autre).mediane;
      return `Par rapport à la région ${autre.region} du même canton (${autre.chefLieu}), la médiane adulte est ${d < 0 ? "plus basse" : "plus haute"} de ${chf(Math.abs(d), "fr", 2)} par mois.`;
    },
    tableCaption: (r: R.Region) => `Primes mensuelles 2027 ${dans(r, "fr")}, en CHF`,
    thProfil: "Profil",
    thQ1: "1er quartile",
    thQ3: "3e quartile",
    thPlage: "De la plus basse à la plus haute",
    plage: (a: number, b: number) => `${nombre(a, "fr", 2)} à ${nombre(b, "fr", 2)}`,
    communes: (r: R.Region) =>
      r.canton === "BE"
        ? `Les ${r.communes.length} communes du Jura bernois (la région bernoise 2 en compte ${r.communesRegionEntiere} ; la moyenne OFSP porte sur toute la région)`
        : `Les ${r.communes.length} communes de la région`,
    population: (r: R.Region) => `${nombre(r.population, "fr")} habitants au 31 décembre 2024 (OFS, repris par l’OFSP).`,
    lienComparateur: (r: R.Region) => `Voir les ${adulte(r).n} offres de la région dans le comparateur`,
    lienComparateurTexte: `Le lien ouvre le comparateur pour un adulte né en 1990, avec une franchise de 300${N}CHF et la couverture accident. Rien n’est enregistré.`,
    subsidesTitre: `Qui peut recevoir un subside pour payer sa prime${N}?`,
    subsides: `Chaque canton réduit les primes des personnes de condition économique modeste (art. 65 LAMal), selon ses propres limites de revenu et de fortune. Pour les bas et moyens revenus, la loi impose une réduction d’au moins 80${N}% pour les enfants et de 50${N}% pour les jeunes adultes en formation. La demande se fait auprès du service cantonal compétent, et dans certains cantons le droit est examiné d’office d’après la taxation fiscale. L’OFSP explique le système et renvoie vers chaque canton sur Priminfo.`,
    subsidesLien: "Réduction de primes (Priminfo, OFSP)",
    csv: "Télécharger les chiffres (CSV)",
    csvDetail: `Toutes les régions et les cinq profils, avec le nombre d’offres, les quartiles, les extrêmes et la moyenne OFSP. Licence CC${N}BY${N}4.0, source OFSP.`,
    rappelQ: `Vous changez d’assureur ou de région${N}?`,
    faq: [
      {
        q: `Qu’est-ce qu’une région de prime${N}?`,
        a: `C’est un groupe de communes où les assureurs appliquent les mêmes primes. Un canton peut en avoir jusqu’à trois (art. 61 LAMal et ordonnance du DFI sur les régions de primes) ; en Suisse romande, Genève, Neuchâtel et le Jura en ont une seule, Vaud, le Valais et Fribourg deux. Le Jura bernois fait partie de la région bernoise 2. C’est la commune de domicile qui compte, et pas le numéro postal.`,
      },
      {
        q: `Pourquoi la médiane est-elle plus haute que la moyenne de l’OFSP${N}?`,
        a: `La médiane porte sur les offres disponibles pour un adulte qui choisit la franchise la plus basse avec la couverture accident. La moyenne de l’OFSP porte sur ce que les assurés de la région paient réellement, et beaucoup ont une franchise plus haute, un modèle alternatif ou une couverture accident par leur employeur.`,
      },
      {
        q: `Combien d’offres compte chaque région${N}?`,
        a: `Entre ${NB_OFFRES_MIN} et ${NB_OFFRES_MAX} offres pour un adulte en 2027, selon la région. Un même assureur propose souvent plusieurs produits (modèle standard, médecin de famille, télémédecine, réseau de soins), et chacun compte pour une offre.`,
      },
      {
        q: `L’écart entre la première et la dernière offre est-il le même partout${N}?`,
        a: `Non. Pour un adulte avec une franchise de 300${N}CHF et l’accident, l’offre la plus haute coûte de ${pct(ECART_MIN, "fr")} à ${pct(ECART_MAX, "fr")} de plus que la plus basse selon la région. Dans chaque région, l’écart est plus grand avec la franchise de 2${N}500${N}CHF et pour les enfants, parce que les montants de départ sont plus bas.`,
      },
      {
        q: `D’où viennent ces chiffres${N}?`,
        a: `Les primes sont celles que l’OFSP a approuvées pour 2027, relevées sur priminfo.admin.ch le ${dateLongue(DATE_PRIMES, "fr")} pour chaque région et chaque assureur. La liste des communes, la population et la prime moyenne viennent du fichier officiel des régions de primes 2027 de l’OFSP. Les calculs sont faits par Guide Assurance.`,
      },
    ] as Faq[],
    maj: `Primes 2027 approuvées par l’OFSP, relevées le ${dateLongue(DATE_PRIMES, "fr")} ; régions de primes 2027 de l’OFSP (version du 22 octobre 2026). Seule la prime indiquée par votre assureur fait foi.`,
    footer: "Primes 2027 approuvées par l’OFSP. Seule l’offre de l’assureur fait foi.",
  },
  en: {
    path: PAGES_DONNEES_EN.regions,
    alt: PAGES_DONNEES.regions,
    titre: "2027 health insurance premiums by Swiss premium region",
    description: "Median, quartiles and spread of 2027 LAMal premiums in the ten premium regions of French-speaking Switzerland, based on FOPH-approved premiums.",
    h1: "2027 LAMal premiums by premium region",
    intro: `In 2027 the median monthly premium for an adult (CHF 300 deductible, accident cover included) ranges from ${chf(adulte(BAS).mediane, "en", 2)} ${dans(BAS, "en")} to ${chf(adulte(HAUT).mediane, "en", 2)} ${dans(HAUT, "en")}, based on FOPH-approved premiums. Vaud, Valais and Fribourg each have two regions, so your premium depends on the region of the municipality you live in.`,
    miettes: [{ name: "Home", href: "/en/" }, { name: "Health insurance", href: "/en/health-insurance/" }, { name: "2027 premiums", href: "/en/health-insurance/premiums/" }, { name: "By region" }] as Miette[],
    resumeTitre: "Which region pays the most, and which the least?",
    resumeTexte: `The median is highest ${dans(HAUT, "en")} and lowest ${dans(BAS, "en")}. For an adult with a CHF 300 deductible and accident cover, the table gives the median of the offers in each region, the FOPH estimate of the average premium and the gap between the lowest and the highest offer.`,
    resumeCaption: "2027 monthly premiums for an adult, CHF 300 deductible, with accident cover, in CHF",
    thRegion: "Region",
    thMediane: "Median offer",
    thOfsp: "FOPH average",
    thEcart: "Gap between offers",
    lireTitre: "How are these figures calculated?",
    lire: "Each offer counts once: one insurer’s product, standard or alternative model, available in the region for the profile shown. The median splits these offers into two halves and the quartiles into four equal parts (linear interpolation, like a spreadsheet’s QUARTILE.INC). The figures are not weighted by the number of insured people. The “FOPH average” is the FOPH estimate of the average premium actually paid in the region, across all deductibles and models, published with the list of regions; it is therefore lower than the median offer at a CHF 300 deductible.",
    regionQ: (r: R.Region) => `How much does basic insurance cost ${dans(r, "en")}?`,
    regionR: (r: R.Region) => {
      const a = adulte(r);
      return `For an adult with a CHF 300 deductible and accident cover, half of the region’s ${a.n} offers cost less than ${chf(a.mediane, "en", 2)} a month. A quarter cost less than ${chf(a.q1, "en", 2)} and a quarter more than ${chf(a.q3, "en", 2)}; the highest offer is ${pct(a.ecartPct, "en")} above the lowest, or ${chf(a.ecartAnnuel, "en")} a year. The FOPH puts the average premium paid by an adult in the region at ${chf(r.primeMoyenneOfsp.adulte, "en", 2)}.`;
    },
    voisine: (r: R.Region, autre: R.Region) => {
      const d = adulte(r).mediane - adulte(autre).mediane;
      return `Compared with region ${autre.region} of the same canton (${autre.chefLieu}), the adult median is ${chf(Math.abs(d), "en", 2)} a month ${d < 0 ? "lower" : "higher"}.`;
    },
    tableCaption: (r: R.Region) => `2027 monthly premiums ${dans(r, "en")}, in CHF`,
    thProfil: "Profile",
    thQ1: "1st quartile",
    thQ3: "3rd quartile",
    thPlage: "Lowest to highest",
    plage: (a: number, b: number) => `${nombre(a, "en", 2)} to ${nombre(b, "en", 2)}`,
    communes: (r: R.Region) =>
      r.canton === "BE"
        ? `The ${r.communes.length} municipalities of the Bernese Jura (Bern region 2 has ${r.communesRegionEntiere}; the FOPH average covers the whole region)`
        : `The region’s ${r.communes.length} municipalities`,
    population: (r: R.Region) => `${nombre(r.population, "en")} residents on 31 December 2024 (FSO, as published by the FOPH).`,
    lienComparateur: (r: R.Region) => `See the region’s ${adulte(r).n} offers in the comparison tool`,
    lienComparateurTexte: "The link opens the tool for an adult born in 1990, CHF 300 deductible, with accident cover. Nothing is recorded.",
    subsidesTitre: "Who can get a subsidy towards the premium?",
    subsides: "Each canton reduces premiums for people on modest incomes (art. 65 LAMal), with its own income and wealth limits. For low and middle incomes, the law requires a reduction of at least 80% for children and 50% for young adults in education. The application goes to the cantonal office in charge, and some cantons check entitlement automatically from the tax assessment. The FOPH explains the system and links to each canton on Priminfo.",
    subsidesLien: "Premium reductions (Priminfo, FOPH)",
    csv: "Download the figures (CSV)",
    csvDetail: "All regions and the five profiles, with the number of offers, quartiles, extremes and the FOPH average. Licence CC BY 4.0, source FOPH.",
    rappelQ: "Switching insurer or moving region?",
    faq: [
      {
        q: "What is a premium region?",
        a: "It is a group of municipalities where insurers charge the same premiums. A canton can have up to three (art. 61 LAMal and the FDHA ordinance on premium regions); in French-speaking Switzerland, Geneva, Neuchâtel and Jura have one, Vaud, Valais and Fribourg two. The Bernese Jura belongs to Bern region 2. What counts is the municipality you live in, not the postcode.",
      },
      {
        q: "Why is the median higher than the FOPH average?",
        a: "The median covers the offers available to an adult who picks the lowest deductible with accident cover. The FOPH average covers what people in the region actually pay, and many have a higher deductible, an alternative model or accident cover through their employer.",
      },
      {
        q: "How many offers does each region have?",
        a: `Between ${NB_OFFRES_MIN} and ${NB_OFFRES_MAX} offers for an adult in 2027, depending on the region. One insurer often sells several products (standard model, family doctor, telemedicine, care network), and each counts as one offer.`,
      },
      {
        q: "Is the gap between the lowest and highest offer the same everywhere?",
        a: `No. For an adult with a CHF 300 deductible and accident cover, the highest offer costs ${pct(ECART_MIN, "en")} to ${pct(ECART_MAX, "en")} more than the lowest, depending on the region. In every region the gap is wider with a CHF 2,500 deductible and for children, because the amounts start lower.`,
      },
      {
        q: "Where do these figures come from?",
        a: `The premiums are those approved by the FOPH for 2027, retrieved from priminfo.admin.ch on ${dateLongue(DATE_PRIMES, "en")} for each region and insurer. The list of municipalities, the population and the average premium come from the FOPH’s official 2027 premium region file. Guide Assurance does the calculations.`,
      },
    ] as Faq[],
    maj: `2027 premiums approved by the FOPH, retrieved on ${dateLongue(DATE_PRIMES, "en")}; FOPH 2027 premium regions (version of 22 October 2026). Only the premium quoted by your insurer is authoritative.`,
    footer: "2027 premiums approved by the FOPH. Only the insurer’s offer is authoritative.",
  },
};

/* « à Genève », « dans la région VD 1 (Lausanne) » ; "in Geneva", "in region VD 1 (Lausanne)". */
export function dans(r: R.Region, locale: Locale): string {
  if (locale === "fr") {
    if (r.canton === "BE") return "dans le Jura bernois";
    if (r.canton === "GE") return "à Genève";
    if (UNIQUE.has(r.canton)) return r.canton === "NE" ? "dans le canton de Neuchâtel" : "dans le canton du Jura";
    return `dans la région ${r.canton}${N}${r.region} (${r.chefLieu})`;
  }
  if (r.canton === "BE") return "in the Bernese Jura";
  if (r.canton === "GE") return "in Geneva";
  if (UNIQUE.has(r.canton)) return `in the canton of ${CANTON_EN[r.canton]}`;
  return `in region ${r.canton} ${r.region} (${r.chefLieu})`;
}

export const metaRegions = (locale: Locale) => {
  const t = TXT[locale];
  return pageMetadata({ title: t.titre, description: t.description, path: t.path, locale, ...(locale === "fr" ? { enPath: t.alt } : { frPath: t.alt }) });
};

export function PageRegions({ locale }: { locale: Locale }) {
  const t = TXT[locale];
  const fr = locale === "fr";
  const url = abs(t.path);
  const comparateur = fr ? OUTILS.comparateur : OUTILS_EN.comparateur;
  const profils = fr ? PROFIL_FR : PROFIL_EN;
  const ld = graph(
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: t.titre,
      description: t.description,
      inLanguage: fr ? "fr-CH" : "en",
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORG_ID },
      datePublished: "2026-11-23",
      dateModified: DATE_PAGE_DONNEES.regions,
      breadcrumb: { "@id": `${url}#breadcrumb` },
      mainEntity: { "@id": `${url}#donnees` },
      citation: [R.SOURCE_REGIONS.url, "https://www.priminfo.admin.ch/", "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_65"],
    },
    {
      "@type": "Dataset",
      "@id": `${url}#donnees`,
      name: fr ? "Primes LAMal 2027 par région de prime, Suisse romande" : "2027 LAMal premiums by premium region, French-speaking Switzerland",
      description: t.description,
      inLanguage: fr ? "fr-CH" : "en",
      temporalCoverage: "2027",
      dateModified: DATE_PRIMES,
      isAccessibleForFree: true,
      license: LICENCE_DONNEES,
      creator: { "@id": ORG_ID },
      creditText: fr ? "Source : OFSP, primes 2027 approuvées et régions de primes 2027 ; calculs Guide Assurance" : "Source: FOPH, approved 2027 premiums and 2027 premium regions; calculations by Guide Assurance",
      isBasedOn: [
        { "@type": "WebSite", name: "Priminfo", url: "https://www.priminfo.admin.ch/" },
        { "@type": "CreativeWork", name: fr ? "Régions de primes 2027" : "2027 premium regions", url: R.SOURCE_REGIONS.url },
      ],
      variableMeasured: fr ? "Prime mensuelle de l’assurance obligatoire des soins (CHF) : médiane, quartiles, extrêmes" : "Monthly compulsory health insurance premium (CHF): median, quartiles, extremes",
      distribution: [{ "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: abs(CSV) }],
    },
    breadcrumbLd(t.miettes, `${url}#breadcrumb`),
    { ...faqLd(t.faq), "@id": `${url}#faq` },
  );
  return (
    <div className="page-outil page-donnees">
      <JsonLd data={ld} />
      <SiteHeader current="sante" locale={locale} altPath={t.alt} />
      <main>
        <div className="wrap">
          <Breadcrumbs items={t.miettes} locale={locale} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>

          <section className="reperes-statiques" aria-labelledby="resume">
            <h2 id="resume">{t.resumeTitre}</h2>
            <p>{t.resumeTexte}</p>
            <div className="defile-table">
              <table className="assureurs table-donnees">
                <caption>{t.resumeCaption}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t.thRegion}</th>
                    <th scope="col" className="num">{t.thMediane}</th>
                    <th scope="col" className="num">{t.thOfsp}</th>
                    <th scope="col" className="num">{t.thEcart}</th>
                  </tr>
                </thead>
                <tbody>
                  {R.REGIONS.map((r) => (
                    <tr key={r.cle}>
                      <th scope="row"><a href={`#${r.cle}`}>{nomRegion(r, locale)}</a></th>
                      <td className="num"><b>{nombre(adulte(r).mediane, locale, 2)}</b></td>
                      <td className="num">{nombre(r.primeMoyenneOfsp.adulte, locale, 2)}</td>
                      <td className="num">{pct(adulte(r).ecartPct, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Telechargement href={CSV} libelle={t.csv} detail={t.csvDetail} />
          </section>

          <section className="reperes-statiques">
            <h2>{t.lireTitre}</h2>
            <p>{t.lire}</p>
          </section>

          {R.REGIONS.map((r) => {
            const autre = CANTONS_DEUX.includes(r.canton) ? deuxRegions(r.canton).find((x) => x.region !== r.region) : undefined;
            return (
              <section key={r.cle} id={r.cle} className="reperes-statiques region-prime">
                <h2>{t.regionQ(r)}</h2>
                <p>
                  {t.regionR(r)}
                  {autre ? ` ${t.voisine(r, autre)}` : ""}
                </p>
                <div className="defile-table">
                  <table className="assureurs table-donnees">
                    <caption>{t.tableCaption(r)}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t.thProfil}</th>
                        <th scope="col" className="num">{t.thQ1}</th>
                        <th scope="col" className="num">{t.thMediane}</th>
                        <th scope="col" className="num">{t.thQ3}</th>
                        <th scope="col" className="num">{t.thPlage}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.profils.map((p) => (
                        <tr key={p.id}>
                          <th scope="row">{profils[p.id]}</th>
                          <td className="num">{nombre(p.q1, locale, 2)}</td>
                          <td className="num"><b>{nombre(p.mediane, locale, 2)}</b></td>
                          <td className="num">{nombre(p.q3, locale, 2)}</td>
                          <td className="num">{t.plage(p.min, p.max)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="lien-region">
                  <a href={`${comparateur}${R.hashComparateur(r, R.PROFILS[0])}`}>{t.lienComparateur(r)}</a>{" "}
                  <span>{t.lienComparateurTexte}</span>
                </p>
                <details className="communes-region">
                  <summary>{t.communes(r)}</summary>
                  <p>{r.communes.map((c) => c[0]).join(", ")}.</p>
                  <p className="source-outil">{t.population(r)}</p>
                </details>
              </section>
            );
          })}

          <section className="reperes-statiques">
            <h2>{t.subsidesTitre}</h2>
            <p>{t.subsides}</p>
            <p>
              <a href="https://www.priminfo.admin.ch/fr/versicherungen/verbilligung">{t.subsidesLien}</a>
            </p>
          </section>

          <AppelRappel locale={locale} sujet="sante" question={t.rappelQ} />
        </div>
        <Faqs faq={t.faq} maj={t.maj} />
      </main>
      <SiteFooter note={t.footer} locale={locale} altPath={t.alt} />
    </div>
  );
}
