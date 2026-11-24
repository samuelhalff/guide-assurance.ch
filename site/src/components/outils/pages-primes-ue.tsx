import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { BandeConfiance } from "@/components/site/bande-confiance";
import { PartagerOutil } from "@/components/site/partager-outil";
import { PrimesUe } from "@/components/outils/primes-ue";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DONNEES_UE, PAYS_UE, VOISINS } from "@/lib/primes-ue";
import { offres, stats, trier } from "@/lib/engines/primes-ue";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { DATE_PAGE } from "@/lib/donnees";
import { dateLongue, type Locale } from "@/lib/i18n";
import { OUTILS, OUTILS_EN } from "@/lib/nav";
import { ESPACE_FINE as N, nombre } from "@/lib/nombres";

/* Page « Primes LAMal 2027 pour les assurés qui résident dans l'UE, l'AELE ou au Royaume-Uni », FR et EN.
   Les fichiers de route (src/app/(fr)/assurance-maladie/primes-ue-aele, (en)/en/health-insurance/eu-efta-premiums)
   appellent ces deux fonctions. Chiffres lus dans primes-eu-2027.json : aucun montant n'est écrit à la main. */

const D = DONNEES_UE;
const NB_ASSUREURS = new Set(Object.values(D.pays).flat().map((a) => a.no)).size;
const NB_PAYS = Object.keys(D.pays).length;
const adulteAvec = (c: string) => stats(offres(D, c, "adulte", true))!;
const adulteSans = (c: string) => stats(offres(D, c, "adulte", false))!;
const fr2 = (x: number) => nombre(x, 2, "fr");
const en2 = (x: number) => nombre(x, 2, "en");
const FR = adulteAvec("FR"), DE = adulteAvec("DE"), IT = adulteAvec("IT"), AT = adulteAvec("AT");
const FRs = adulteSans("FR");

const T = {
  fr: {
    path: OUTILS.primesUe,
    alt: OUTILS_EN.primesUe,
    titre: "Primes LAMal 2027 pour résidents UE, AELE et UK",
    description: `Primes LAMal 2027 par pays et par assureur pour les frontaliers et retraités qui vivent dans l’UE, l’AELE ou au Royaume-Uni. Données OFSP.`,
    appli: "Primes LAMal 2027 pour les résidents de l’UE, de l’AELE et du Royaume-Uni",
    h1: "Primes LAMal 2027 pour les assurés qui résident dans l’UE, l’AELE ou au Royaume-Uni",
    intro: `Choisissez votre pays de résidence, votre classe d’âge et la couverture accident : la liste montre la prime mensuelle 2027 de chaque assureur qui propose l’assurance de base dans ce pays, de la prime la plus basse à la plus haute. Les primes sont fixées pour chaque pays, quel que soit le canton.`,
    prive: "Le calcul se fait dans votre navigateur. Nous ne recevons aucun de vos choix.",
    partage: "Les primes LAMal 2027 des assurés qui vivent dans l’UE, l’AELE ou au Royaume-Uni, par pays et par assureur.",
    miettes: [{ name: "Accueil", href: "/" }, { name: "Assurance maladie", href: "/assurance-maladie/" }, { name: "Primes UE, AELE et Royaume-Uni" }] as Miette[],
    repères: "Ce qu’il faut retenir",
    reperes: [
      `${NB_ASSUREURS} assureurs suisses proposent l’assurance de base 2027 à des personnes qui vivent dans l’UE, en Islande, en Norvège ou au Royaume-Uni, dans ${NB_PAYS} pays au total. Tous ne la proposent pas dans chaque pays.`,
      `Pour un adulte avec couverture accident, la prime mensuelle va de ${fr2(FR.min)}${N}CHF à ${fr2(FR.max)}${N}CHF en France, de ${fr2(DE.min)}${N}CHF à ${fr2(DE.max)}${N}CHF en Allemagne, de ${fr2(IT.min)}${N}CHF à ${fr2(IT.max)}${N}CHF en Italie et de ${fr2(AT.min)}${N}CHF à ${fr2(AT.max)}${N}CHF en Autriche.`,
      "La franchise est unique : 300 francs pour les adultes et les jeunes adultes, aucune pour les enfants. Les modèles avec médecin de famille ou télémédecine ne sont pas ouverts à ces assurés.",
      "La prime dépend du pays de résidence. Le canton de travail ou un ancien domicile en Suisse n’y change rien.",
    ],
    hTableauVoisins: "Les quatre pays voisins en un coup d’œil",
    captionVoisins: "Prime mensuelle 2027 d’un adulte (26 ans et plus) avec couverture accident, en francs, pour la France, l’Allemagne, l’Italie et l’Autriche",
    ordreVoisins: "Les pays sont dans l’ordre France, Allemagne, Italie, Autriche.",
    thPays: "Pays",
    thNb: "Assureurs",
    thMin: "Prime la plus basse",
    thMax: "Prime la plus haute",
    thMed: "Prime médiane",
    hTableauFrance: "France : tous les assureurs, adulte de 26 ans et plus",
    captionFrance: "Primes mensuelles 2027 d’un adulte (26 ans et plus) résidant en France, en francs, avec et sans couverture accident",
    ordreFrance: "Les assureurs sont triés de la prime la plus basse à la plus haute (avec couverture accident).",
    thAssureur: "Assureur",
    thNo: "N° OFSP",
    thAvec: "Avec accident",
    thSans: "Sans accident",
    hQui: "Qui doit s’assurer en Suisse quand il vit dans l’UE",
    qui: [
      "Selon l’OFSP, doivent en principe s’assurer en Suisse les frontaliers, ainsi que les personnes qui vivent dans un État de l’UE, en Islande, en Norvège ou au Royaume-Uni et touchent une rente suisse, avec dans les deux cas leurs proches sans activité lucrative. Les proches sans activité lucrative qui vivent dans l’UE, en Islande ou en Norvège avec une personne qui habite et travaille en Suisse y sont aussi soumis. Ceux qui vivent au Royaume-Uni doivent s’assurer dans leur pays de résidence.",
      "Une personne qui réside dans l’UE peut demander à être exemptée de l’assurance suisse si l’accord sur la libre circulation le permet et si elle prouve qu’elle est couverte en cas de maladie dans son pays de résidence, pendant un séjour dans un autre État de l’UE et en Suisse (art. 2, al. 6, OAMal). Cette possibilité s’appelle le droit d’option. Ses conditions se vérifient auprès de l’Institution commune LAMal, qui renseigne sur votre situation.",
    ],
    hFranchise: "Une seule franchise, une prime par pays",
    franchise: [
      "Les assurés qui vivent dans l’UE, en Islande, en Norvège ou au Royaume-Uni ne peuvent pas choisir une forme particulière d’assurance comme le modèle du médecin de famille (art. 101a OAMal). La franchise est de 300 francs par année civile pour les adultes (art. 103, al. 1 et 7, OAMal) ; elle est de zéro franc pour les enfants dans les listes de l’OFSP.",
      "Chaque assureur calcule une prime propre à chaque pays, sur la base des coûts de santé de ce pays. C’est pourquoi un même assureur facture un montant différent en France, en Allemagne ou au Portugal.",
    ],
    hAccident: "Avec ou sans couverture accident",
    accident: "La couverture accident de l’assurance-maladie peut être suspendue tant que vous êtes entièrement couvert contre les accidents par la LAA ; l’assureur réduit alors la prime (art. 8 LAMal). Les travailleurs à temps partiel occupés au moins huit heures par semaine chez un employeur sont assurés aussi contre les accidents non professionnels (art. 13 OLAA). Pour un retraité ou un proche sans activité en Suisse, la couverture accident reste utile.",
    hReduction: "Réduction de primes pour les assurés qui vivent à l’étranger",
    reduction: "La Suisse accorde une réduction de primes aux assurés de condition économique modeste qui résident dans l’UE, en Islande, en Norvège ou au Royaume-Uni. Pour les rentiers et leurs proches, c’est la Confédération, par l’Institution commune LAMal (kvg.org). Pour les personnes qui travaillent en Suisse et leurs proches, c’est le canton de domicile ou, pour les frontaliers, le canton du lieu de travail.",
    simu: "Vous vivez en France et travaillez en Suisse ?",
    simuLien: "Le simulateur frontalier",
    simuSuite: "met ces primes en regard de la cotisation de l’assurance maladie française, avec votre situation.",
    autres: "Pour les assurés qui vivent en Suisse, voyez le",
    autresLien: "comparateur de primes LAMal",
    autresSuite: "par NPA.",
    source: `Source : OFSP, aperçu des primes 2027 de l’assurance de base pour les assurés résidant dans l’UE, l’AELE ou au Royaume-Uni (fichier Prämien_EU, jeu de données « Prämien der obligatorischen Krankenpflegeversicherung » sur opendata.swiss, conditions d’utilisation « mention de la source obligatoire »), publié sur priminfo.admin.ch et lu le 24 novembre 2026. Les montants sont repris tels quels.`,
    faq: [
      {
        q: `Qui doit s’assurer en Suisse tout en vivant dans l’UE${N}?`,
        a: "Les frontaliers, les personnes qui vivent dans l’UE, en Islande, en Norvège ou au Royaume-Uni et touchent une rente suisse, et leurs proches sans activité lucrative doivent en principe s’assurer en Suisse. Les proches qui vivent au Royaume-Uni s’assurent dans leur pays de résidence. Une exemption est possible sur demande pour certaines personnes qui résident dans l’UE (art. 2, al. 6, OAMal).",
      },
      {
        q: `Combien coûte la LAMal pour un frontalier qui vit en France ou en Allemagne en 2027${N}?`,
        a: `Pour un adulte de 26 ans et plus avec couverture accident, la prime mensuelle va de ${fr2(FR.min)}${N}CHF à ${fr2(FR.max)}${N}CHF en France (médiane ${fr2(FR.mediane)}${N}CHF) et de ${fr2(DE.min)}${N}CHF à ${fr2(DE.max)}${N}CHF en Allemagne (médiane ${fr2(DE.mediane)}${N}CHF), selon l’assureur. Sans couverture accident, la fourchette française est de ${fr2(FRs.min)}${N}CHF à ${fr2(FRs.max)}${N}CHF.`,
      },
      {
        q: `Peut-on choisir sa franchise quand on réside à l’étranger${N}?`,
        a: "Non. Les assurés qui vivent dans l’UE, en Islande, en Norvège ou au Royaume-Uni n’ont que la franchise de 300 francs par an pour les adultes (art. 103 OAMal) et ne peuvent pas adhérer aux modèles particuliers comme celui du médecin de famille (art. 101a OAMal).",
      },
      {
        q: `Un retraité suisse au Portugal ou en Espagne reste-t-il à la LAMal${N}?`,
        a: "L’OFSP indique que les personnes qui vivent dans un État de l’UE, en Islande, en Norvège ou au Royaume-Uni et touchent une rente suisse doivent en principe s’assurer en Suisse, avec leurs proches sans activité lucrative. Une personne sans rente suisse mais avec une rente d’un État de l’UE est dispensée de l’obligation (art. 2, al. 1, let. e, OAMal). Si vous touchez des rentes de plusieurs pays, demandez confirmation à l’Institution commune LAMal.",
      },
      {
        q: `Tous les assureurs proposent-ils l’assurance aux résidents de l’UE${N}?`,
        a: `Non. L’OFSP relève qu’environ un tiers des assureurs suisses la proposent. Pour 2027, ${NB_ASSUREURS} assureurs figurent dans ses listes. Douze d’entre eux la proposent dans tous les pays ; Aquilana la propose dans huit pays (Allemagne, Autriche, Espagne, France, Italie, Pays-Bas, Portugal et Royaume-Uni) et Sodalis en Italie seulement.`,
      },
      {
        q: `D’où viennent ces primes${N}?`,
        a: "Elles viennent de l’aperçu des primes UE/AELE/UK 2027 de l’OFSP, publié sur priminfo.admin.ch, qui reprend le fichier Prämien_EU du jeu de données « Prämien der obligatorischen Krankenpflegeversicherung » sur opendata.swiss. Nous l’avons lu le 24 novembre 2026 et repris les montants tels quels, sans les modifier. Votre prime effective est celle que l’assureur vous confirme.",
      },
    ],
    maj: `Mis à jour le ${dateLongue(DATE_PAGE.primesUe, "fr")}. Données : OFSP, primes 2027 UE/AELE/UK.`,
    footer: "Primes données à titre d’information. La prime confirmée par l’assureur fait foi.",
    nav: "sante" as const,
  },
  en: {
    path: OUTILS_EN.primesUe,
    alt: OUTILS.primesUe,
    titre: "2027 Swiss health premiums for EU/EFTA/UK residents",
    description: `2027 Swiss basic health insurance premiums by country and insurer for cross-border workers and pensioners living in the EU, EFTA or the UK. FOPH data.`,
    appli: "2027 Swiss health insurance premiums for residents of the EU, EFTA and the UK",
    h1: "2027 Swiss health insurance premiums for people living in the EU, EFTA or the UK",
    intro: `Choose your country of residence, your age group and accident cover: the list shows each insurer’s 2027 monthly premium for basic insurance in that country, from the lowest premium to the highest. Premiums are set for each country, whatever the canton.`,
    prive: "The calculation runs in your browser. We receive none of your choices.",
    partage: "2027 Swiss health insurance premiums for people living in the EU, EFTA or the UK, by country and insurer.",
    miettes: [{ name: "Home", href: "/en/" }, { name: "Health insurance", href: "/en/health-insurance/" }, { name: "EU, EFTA and UK premiums" }] as Miette[],
    repères: "Key points",
    reperes: [
      `${NB_ASSUREURS} Swiss insurers offer 2027 basic insurance to people living in the EU, Iceland, Norway or the United Kingdom, across ${NB_PAYS} countries in all. Not every insurer offers it in every country.`,
      `For an adult with accident cover, the monthly premium ranges from CHF ${en2(FR.min)} to CHF ${en2(FR.max)} in France, from CHF ${en2(DE.min)} to CHF ${en2(DE.max)} in Germany, from CHF ${en2(IT.min)} to CHF ${en2(IT.max)} in Italy and from CHF ${en2(AT.min)} to CHF ${en2(AT.max)} in Austria.`,
      "There is a single deductible: CHF 300 for adults and young adults, none for children. Family-doctor and telemedicine models are not open to these insured people.",
      "The premium depends on the country of residence. The canton of work or a former address in Switzerland makes no difference.",
    ],
    hTableauVoisins: "The four neighbouring countries at a glance",
    captionVoisins: "2027 monthly premium for an adult (26 and over) with accident cover, in Swiss francs, for France, Germany, Italy and Austria",
    ordreVoisins: "Countries are listed in the order France, Germany, Italy, Austria.",
    thPays: "Country",
    thNb: "Insurers",
    thMin: "Lowest premium",
    thMax: "Highest premium",
    thMed: "Median premium",
    hTableauFrance: "France: every insurer, adult aged 26 and over",
    captionFrance: "2027 monthly premiums for an adult (26 and over) living in France, in Swiss francs, with and without accident cover",
    ordreFrance: "Insurers are sorted from the lowest premium to the highest (with accident cover).",
    thAssureur: "Insurer",
    thNo: "FOPH no.",
    thAvec: "With accident",
    thSans: "Without accident",
    hQui: "Who has to be insured in Switzerland while living in the EU",
    qui: [
      "According to the FOPH, cross-border workers, and people who live in an EU state, Iceland, Norway or the United Kingdom and draw a Swiss pension, must in principle be insured in Switzerland, together with their family members who do not work. Family members without a job who live in the EU, Iceland or Norway with someone who lives and works in Switzerland are covered by the same rule. Those living in the United Kingdom must insure in their country of residence.",
      "A person living in the EU can ask to be exempted from Swiss insurance if the free movement agreement allows it and they prove they are covered for illness in their country of residence, during a stay in another EU state and in Switzerland (art. 2 para. 6 OAMal). This is known as the right of option. The LAMal Joint Institution can check the conditions for your situation.",
    ],
    hFranchise: "One deductible, one premium per country",
    franchise: [
      "People insured while living in the EU, Iceland, Norway or the United Kingdom cannot join special forms of insurance such as the family-doctor model (art. 101a OAMal). The deductible is CHF 300 per calendar year for adults (art. 103 paras. 1 and 7 OAMal), and the FOPH lists show none for children.",
      "Each insurer works out a separate premium for each country, based on that country’s healthcare costs. That is why the same insurer charges a different amount in France, Germany or Portugal.",
    ],
    hAccident: "With or without accident cover",
    accident: "Accident cover under health insurance can be suspended as long as you are fully covered against accidents under the accident insurance act (LAA); the insurer then reduces the premium (art. 8 LAMal). Part-time employees working at least eight hours a week for one employer are also insured against non-occupational accidents (art. 13 OLAA). For a pensioner or a family member with no job in Switzerland, accident cover remains useful.",
    hReduction: "Premium reduction for people insured while living abroad",
    reduction: "Switzerland grants premium reductions to insured people on modest incomes who live in the EU, Iceland, Norway or the United Kingdom. For pensioners and their family members, the Confederation is responsible, through the LAMal Joint Institution (kvg.org). For people who work in Switzerland and their family members, it is the canton of residence or, for cross-border workers, the canton of work.",
    simu: "Do you live in France and work in Switzerland?",
    simuLien: "The cross-border calculator",
    simuSuite: "sets these premiums against the French health insurance contribution for your situation.",
    autres: "If you live in Switzerland, see the",
    autresLien: "LAMal premium comparison",
    autresSuite: "by postcode.",
    source: `Source: FOPH, overview of 2027 basic insurance premiums for people living in the EU, EFTA or the UK (Prämien_EU file, dataset “Prämien der obligatorischen Krankenpflegeversicherung” on opendata.swiss, terms of use “attribution required”), published on priminfo.admin.ch and read on 24 November 2026. Amounts are reproduced as published.`,
    faq: [
      {
        q: "Who has to be insured in Switzerland while living in the EU?",
        a: "Cross-border workers, people living in the EU, Iceland, Norway or the United Kingdom who draw a Swiss pension, and their family members without a job must in principle be insured in Switzerland. Family members living in the United Kingdom insure in their country of residence. Some people living in the EU can ask for an exemption (art. 2 para. 6 OAMal).",
      },
      {
        q: "How much does Swiss health insurance cost a cross-border worker living in France or Germany in 2027?",
        a: `For an adult aged 26 and over with accident cover, the monthly premium ranges from CHF ${en2(FR.min)} to CHF ${en2(FR.max)} in France (median CHF ${en2(FR.mediane)}) and from CHF ${en2(DE.min)} to CHF ${en2(DE.max)} in Germany (median CHF ${en2(DE.mediane)}), depending on the insurer. Without accident cover, the French range is CHF ${en2(FRs.min)} to CHF ${en2(FRs.max)}.`,
      },
      {
        q: "Can you choose your deductible when you live abroad?",
        a: "No. People insured while living in the EU, Iceland, Norway or the United Kingdom only have the CHF 300 yearly deductible for adults (art. 103 OAMal), and cannot join special models such as the family-doctor model (art. 101a OAMal).",
      },
      {
        q: "Does a Swiss pensioner in Portugal or Spain stay in LAMal?",
        a: "The FOPH states that people who live in an EU state, Iceland, Norway or the United Kingdom and draw a Swiss pension must in principle be insured in Switzerland, together with their family members without a job. Someone with no Swiss pension but a pension from an EU state is exempt from the obligation (art. 2 para. 1 let. e OAMal). If you draw pensions from several countries, ask the LAMal Joint Institution to confirm.",
      },
      {
        q: "Do all insurers offer cover to EU residents?",
        a: `No. The FOPH notes that about a third of Swiss insurers offer it. For 2027, ${NB_ASSUREURS} insurers appear in its lists. Twelve of them offer it in every country; Aquilana offers it in eight (Austria, France, Germany, Italy, the Netherlands, Portugal, Spain and the United Kingdom) and Sodalis in Italy only.`,
      },
      {
        q: "Where do these premiums come from?",
        a: "They come from the FOPH’s 2027 EU/EFTA/UK premium overview, published on priminfo.admin.ch, which reproduces the Prämien_EU file of the dataset “Prämien der obligatorischen Krankenpflegeversicherung” on opendata.swiss. We read it on 24 November 2026 and reproduced the amounts as published, unchanged. Your actual premium is the one your insurer confirms.",
      },
    ],
    maj: `Updated ${dateLongue(DATE_PAGE.primesUe, "en")}. Data: FOPH, 2027 EU/EFTA/UK premiums.`,
    footer: "Premiums are for information only. The premium confirmed by the insurer is authoritative.",
    nav: "sante" as const,
  },
};

export const metaPrimesUe = (locale: Locale) => {
  const t = T[locale];
  return pageMetadata({ title: t.titre, description: t.description, path: t.path, locale, ...(locale === "fr" ? { enPath: t.alt } : { frPath: t.alt }) });
};

/* Tableaux rendus côté serveur : lisibles sans JavaScript. */
function TableauVoisins({ locale }: { locale: Locale }) {
  const t = T[locale];
  const nf = (x: number) => nombre(x, 2, locale);
  return (
    <>
      <p className="note-outil">{t.ordreVoisins}</p>
      <Table variant="chiffres">
        <TableCaption>{t.captionVoisins}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{t.thPays}</TableHead>
            <TableHead scope="col" className="text-right">{t.thNb}</TableHead>
            <TableHead scope="col" className="text-right">{t.thMin}</TableHead>
            <TableHead scope="col" className="text-right">{t.thMax}</TableHead>
            <TableHead scope="col" className="text-right">{t.thMed}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {VOISINS.map((c) => {
            const s = adulteAvec(c);
            return (
              <TableRow key={c}>
                <TableCell>{PAYS_UE[c][locale]}</TableCell>
                <TableCell className="text-right tabular-nums">{s.n}</TableCell>
                <TableCell className="text-right tabular-nums">{nf(s.min)}</TableCell>
                <TableCell className="text-right tabular-nums">{nf(s.max)}</TableCell>
                <TableCell className="text-right tabular-nums">{nf(s.mediane)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}

function TableauFrance({ locale }: { locale: Locale }) {
  const t = T[locale];
  const nf = (x: number) => nombre(x, 2, locale);
  const avec = trier(offres(D, "FR", "adulte", true), "prix");
  const sans = new Map(offres(D, "FR", "adulte", false).map((o) => [o.no, o.mensuel]));
  return (
    <>
      <p className="note-outil">{t.ordreFrance}</p>
      <Table variant="chiffres">
        <TableCaption>{t.captionFrance}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{t.thAssureur}</TableHead>
            <TableHead scope="col" className="text-right">{t.thNo}</TableHead>
            <TableHead scope="col" className="text-right">{t.thAvec}</TableHead>
            <TableHead scope="col" className="text-right">{t.thSans}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {avec.map((o) => (
            <TableRow key={o.no}>
              <TableCell>{o.nom}</TableCell>
              <TableCell className="text-right tabular-nums">{String(o.no).padStart(4, "0")}</TableCell>
              <TableCell className="text-right tabular-nums">{nf(o.mensuel)}</TableCell>
              <TableCell className="text-right tabular-nums">{nf(sans.get(o.no)!)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

export function PagePrimesUe({ locale }: { locale: Locale }) {
  const t = T[locale];
  const fr = locale === "fr";
  const url = abs(t.path);
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
      datePublished: "2026-11-24",
      dateModified: DATE_PAGE.primesUe,
      breadcrumb: { "@id": `${url}#breadcrumb` },
      mainEntity: { "@id": `${url}#outil` },
      mentions: { "@id": `${url}#donnees` },
      citation: [
        "https://www.priminfo.admin.ch/downloads/gesamtbericht_eu-2027.pdf",
        "https://opendata.swiss/fr/dataset/health-insurance-premiums",
        "https://www.fedlex.admin.ch/eli/cc/1995/3867_3867_3867/fr#art_101a",
        "https://www.fedlex.admin.ch/eli/cc/1995/3867_3867_3867/fr#art_103",
      ],
    },
    {
      "@type": "WebApplication",
      "@id": `${url}#outil`,
      name: t.appli,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      inLanguage: fr ? "fr-CH" : "en",
      isAccessibleForFree: true,
      provider: { "@id": ORG_ID },
    },
    {
      "@type": "Dataset",
      "@id": `${url}#donnees`,
      name: fr ? "Primes LAMal 2027 des assurés résidant dans l’UE, l’AELE ou au Royaume-Uni" : "2027 LAMal premiums for insured people living in the EU, EFTA or the UK",
      description: fr
        ? `Primes mensuelles 2027 de l’assurance obligatoire des soins de ${NB_ASSUREURS} assureurs, dans ${NB_PAYS} pays, par classe d’âge (adulte, jeune adulte, enfant) et avec ou sans couverture accident, telles que publiées par l’OFSP.`
        : `2027 monthly compulsory health insurance premiums of ${NB_ASSUREURS} insurers, in ${NB_PAYS} countries, by age group (adult, young adult, child) and with or without accident cover, as published by the FOPH.`,
      inLanguage: fr ? "fr-CH" : "en",
      temporalCoverage: "2027",
      dateModified: DATE_PAGE.primesUe,
      isAccessibleForFree: true,
      creator: { "@id": ORG_ID },
      creditText: fr ? "Source : OFSP, primes 2027 UE/AELE/UK (Prämien_EU), opendata.swiss" : "Source: FOPH, 2027 EU/EFTA/UK premiums (Prämien_EU), opendata.swiss",
      isBasedOn: [
        { "@type": "Dataset", name: "Prämien der obligatorischen Krankenpflegeversicherung", url: "https://opendata.swiss/fr/dataset/health-insurance-premiums", license: "https://opendata.swiss/terms-of-use#terms_by" },
        { "@type": "CreativeWork", name: fr ? "Aperçu des primes 2027 UE/AELE/UK" : "2027 EU/EFTA/UK premium overview", url: "https://www.priminfo.admin.ch/downloads/gesamtbericht_eu-2027.pdf" },
      ],
      variableMeasured: fr ? "Prime mensuelle de l’assurance obligatoire des soins (CHF)" : "Monthly compulsory health insurance premium (CHF)",
    },
    breadcrumbLd(t.miettes, `${url}#breadcrumb`),
    { ...faqLd(t.faq), "@id": `${url}#faq` },
  );
  const o = fr ? OUTILS : OUTILS_EN;
  return (
    <div className="page-outil">
      <JsonLd data={ld} />
      <SiteHeader current={t.nav} locale={locale} altPath={t.alt} />
      <main id="contenu">
        <div className="wrap">
          <Breadcrumbs items={t.miettes} locale={locale} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>
          <p className="prive">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 9V6a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <rect x="3" y="9" width="14" height="10" rx="1.5" fill="currentColor" />
            </svg>
            {t.prive}
          </p>
          <BandeConfiance locale={locale} signaux={["ofsp", "gratuit"]} compacte />
          <PartagerOutil path={t.path} title={t.appli} text={t.partage} locale={locale} />
          <PrimesUe locale={locale} />

          <h2 className="mt-10" id="reperes">{t.repères}</h2>
          <ul className="mt-3 grid list-disc gap-2 pl-5">
            {t.reperes.map((r) => <li key={r}>{r}</li>)}
          </ul>

          <h2 className="mt-10" id="voisins">{t.hTableauVoisins}</h2>
          <div className="mt-3"><TableauVoisins locale={locale} /></div>

          <h2 className="mt-10" id="france">{t.hTableauFrance}</h2>
          <div className="mt-3"><TableauFrance locale={locale} /></div>
          <p className="mt-4">{t.simu} <a href={o.simulateur}>{t.simuLien}</a> {t.simuSuite}</p>

          <h2 className="mt-10">{t.hQui}</h2>
          {t.qui.map((p) => <p className="mt-3" key={p}>{p}</p>)}
          <h2 className="mt-10">{t.hFranchise}</h2>
          {t.franchise.map((p) => <p className="mt-3" key={p}>{p}</p>)}
          <h2 className="mt-10">{t.hAccident}</h2>
          <p className="mt-3">{t.accident}</p>
          <h2 className="mt-10">{t.hReduction}</h2>
          <p className="mt-3">{t.reduction}</p>
          <p className="mt-4">{t.autres} <a href={o.comparateur}>{t.autresLien}</a> {t.autresSuite}</p>
          <p className="source-outil mt-6">{t.source}</p>
        </div>

        <div className="wrap faq">
          {t.faq.map((f) => (
            <section key={f.q}>
              <h2>{f.q}</h2>
              <p>{f.a}</p>
            </section>
          ))}
          <p className="maj">{t.maj}</p>
        </div>
      </main>
      <SiteFooter note={t.footer} locale={locale} altPath={t.alt} />
    </div>
  );
}
