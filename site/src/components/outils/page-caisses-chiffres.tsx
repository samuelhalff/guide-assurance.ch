import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { PartagerOutil } from "@/components/site/partager-outil";
import { BandeConfiance } from "@/components/site/bande-confiance";
import { FaqSections, faqOutilLd, type FaqOutil } from "@/components/site/faq-sections";
import { CaissesChiffres, CtaCaisses } from "@/components/outils/caisses-chiffres";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { META, MOYENNE, chiffresCles, dateCourte } from "@/lib/caisses-lamal";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { DATE_PAGE } from "@/lib/donnees";
import type { Locale } from "@/lib/i18n";
import { OUTILS, OUTILS_EN } from "@/lib/nav";
import { ROUTES_IDEES } from "@/lib/pages-idees";
import { nombre, ESPACE_FINE as N } from "@/lib/nombres";

/* « Les caisses maladie en chiffres » (/assurance-maladie/caisses-maladie-chiffres/ et version anglaise). Les fichiers de
   route ne font qu'appeler ces fonctions. Données : src/data/caisses-lamal-2024.json (data/scripts/build_kvstat.py). */
const K = chiffresCles();
const ED = META.edition;
const URL_OFSP = META.urlSource;
const URL_JEU = "https://opendata.swiss/de/dataset/statistik-der-obligatorischen-krankenversicherung-okp";
const URL_LAMAL = "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_18";
const URL_LSAMAL = "https://www.fedlex.admin.ch/eli/cc/2015/839/fr#art_14";
const f = (x: number, l: Locale, d = 0) => nombre(x, d, l);
const pcFr = (x: number) => `${f(x, "fr", 1)}${N}%`;
const pcEn = (x: number) => `${f(x, "en", 1)}%`;
const D_ASS = dateCourte(META.dateAssures);
const D_SOL = dateCourte(META.dateSolvabilite);
const DATE_LIRE = { fr: "24 novembre 2026", en: "24 November 2026" };
const sousCentFr = K.sousCent === 0 ? "aucune caisse n’est sous 100 %" : K.sousCent === 1 ? "une caisse est sous 100 %" : `${K.sousCent} caisses sont sous 100 %`;
const sousCentEn = K.sousCent === 0 ? "no insurer is below 100%" : K.sousCent === 1 ? "one insurer is below 100%" : `${K.sousCent} insurers are below 100%`;

const T = {
  fr: {
    path: OUTILS.caissesChiffres,
    alt: OUTILS_EN.caissesChiffres,
    titre: `Caisses maladie en chiffres${N}: assurés, frais, solvabilité`,
    description: `Les ${K.nb} caisses maladie en chiffres officiels de l’OFSP : assurés par canton, frais administratifs, réserves et solvabilité, sans classement.`,
    h1: "Les caisses maladie en chiffres",
    intro: `En ${ED}, ${K.nb} caisses ont assuré ${f(K.totalAssures, "fr")} personnes à l’assurance de base. Le tableau ci-dessous reprend, pour chacune, les chiffres publiés par l’OFSP : assurés et part de marché dans votre canton, frais administratifs, réserves, résultat et taux de solvabilité.`,
    source: `Source : OFSP, Statistique de l’assurance-maladie obligatoire ${ED}, tableaux 5.01, 5.03, 5.07 et 5.10, relevée le ${DATE_LIRE.fr}. État des données : 22 mai 2025 pour les tableaux 5.01, 5.07 et 5.10, 23 septembre 2025 pour le tableau 5.03.`,
    enBref: "Les chiffres à retenir",
    faits: [
      `Le tableau 5.01 de l’OFSP compte ${K.nb} caisses en ${ED}. Quand plusieurs caisses appartiennent à un même groupe, chacune figure séparément.`,
      `Au ${D_ASS}, ces caisses comptaient ${f(K.totalAssures, "fr")} assurés.`,
      `Les frais administratifs vont de ${f(K.fraisMin, "fr")} à ${f(K.fraisMax, "fr")}${N}CHF par assuré en ${ED}, selon la caisse. La moyenne suisse est de ${f(MOYENNE.fraisAdminParAssure, "fr")}${N}CHF, soit ${pcFr(MOYENNE.fraisAdminPctDepenses)} des dépenses.`,
      `Les caisses ayant des assurés sont au nombre de ${K.parCanton.GE} à Genève, ${K.parCanton.VD} dans le canton de Vaud, ${K.parCanton.VS} en Valais, ${K.parCanton.FR} dans le canton de Fribourg, ${K.parCanton.NE} dans le canton de Neuchâtel, ${K.parCanton.JU} dans le canton du Jura et ${K.parCanton.BE} dans le canton de Berne.`,
      `Au ${D_SOL}, le taux de solvabilité publié va de ${K.solMin}${N}% à ${f(K.solMax, "fr")}${N}% pour ${K.nbSolvabilite} caisses ; ${sousCentFr}.`,
    ],
    liensTitre: "À consulter avec ces chiffres",
    lienComparateur: "Comparer les primes 2027 de ces caisses selon votre NPA",
    lienComparateurTexte: "Le comparateur affiche les primes approuvées par l’OFSP pour votre adresse, votre âge et votre franchise.",
    lienLettre: "Préparer votre lettre de résiliation",
    lienLettreTexte: "L’outil calcule la date limite d’après la loi et votre contrat, puis rédige la lettre.",
    lienBarometre: "Baromètre des primes maladie",
    lienBarometreTexte: "La prime moyenne et la hausse par canton romand.",
    lienGuide: "Le guide de l’assurance maladie",
    lienGuideTexte: "Franchise, modèles d’assurance, délais et changement de caisse.",
    lireTitre: "Comment lire ces chiffres",
    lire: [
      "L’assurance de base offre les mêmes prestations chez toutes les caisses, parce que la loi les fixe. Ces chiffres décrivent donc la caisse (sa taille, ses coûts, ses réserves) et ne disent rien de la couverture que vous obtenez.",
      `Les assurés sont ceux du ${D_ASS} (tableau 5.07). La part de marché vient du tableau 5.10 et se calcule sur l’effectif moyen de l’année, pas sur celui du 31 décembre : les deux colonnes ne coïncident donc pas exactement. Avoir eu des assurés dans un canton en ${ED} ne veut pas dire que la caisse y proposera une offre en 2027.`,
      `Les frais administratifs par assuré rapportent les frais d’exploitation de la caisse (personnel, locaux, informatique, publicité, amortissements) à son effectif moyen de ${ED}. En pourcentage des dépenses, ils vont de ${pcFr(K.pctMin)} à ${pcFr(K.pctMax)} selon la caisse ; le reste des dépenses sert surtout à rembourser les soins. Le tableau ne dit pas pourquoi ces frais diffèrent d’une caisse à l’autre, et un chiffre plus bas ne dit rien du service.`,
      "Les réserves par assuré additionnent les réserves de l’assurance de base et le capital de la caisse, rapportés à l’effectif moyen. Elles ne comprennent pas toutes les positions retenues par le test de solvabilité, par exemple les réserves de l’assurance facultative d’indemnités journalières. Les provisions pour les soins déjà reçus et pas encore facturés sont comptées à part : ce ne sont pas des réserves.",
      "Le résultat global par assuré est la différence entre les recettes et les dépenses de la caisse pour l’année, rapportée à l’effectif moyen. Un résultat négatif signifie que les dépenses ont dépassé les recettes en 2024. Il faut le lire avec les réserves et le taux de solvabilité.",
      `Le taux de solvabilité divise les réserves disponibles au ${D_SOL} par le montant minimal de réserves que le modèle de l’OFSP calcule pour les risques de la caisse. À 100${N}%, la caisse atteint ce minimum ; selon l’OFSP, avec un taux d’au moins 100${N}%, un assureur devrait pouvoir tenir ses engagements même après une très mauvaise année. La loi oblige les assureurs à constituer des réserves suffisantes pour garantir leur solvabilité, et le Conseil fédéral en fixe le niveau minimal (art. 14 LSAMal). Le test porte sur toutes les activités de la caisse : ses réserves ne sont donc pas celles du tableau 5.01. ${K.nb - K.nbSolvabilite === 2 ? "Deux caisses" : `${K.nb - K.nbSolvabilite} caisses`} de ce tableau n’apparaissent pas dans le test, et leur colonne indique « non indiqué ».`,
      "Les caisses d’un même groupe figurent chacune avec leurs propres chiffres, comme dans le tableau de l’OFSP : on ne peut pas les additionner à partir de cette page.",
    ],
    sourcesTitre: "Sources",
    sources: [
      [`OFSP, Statistique de l’assurance-maladie obligatoire ${ED} : tableaux 5.01, 5.02 (explications), 5.03, 5.07 et 5.10`, URL_OFSP],
      ["opendata.swiss, jeu de données de l’OFSP (conditions « Open use », source recommandée)", URL_JEU],
      ["Art. 18 LAMal, institution commune (Fedlex)", URL_LAMAL],
      ["Art. 14 LSAMal, réserves (Fedlex)", URL_LSAMAL],
    ] as [string, string][],
    ctaBas: "C’est gratuit et sans engagement, et un seul conseiller vous contacte.",
    miettes: [{ name: "Accueil", href: "/" }, { name: "Assurance maladie", href: "/assurance-maladie/" }, { name: "Caisses maladie en chiffres" }] as Miette[],
    appli: "Caisses maladie en chiffres",
    partage: `Les ${K.nb} caisses maladie de l’assurance de base en chiffres officiels de l’OFSP : assurés par canton, frais administratifs, réserves et solvabilité.`,
    maj: `Chiffres de l’OFSP (édition ${ED}), relevés le ${DATE_LIRE.fr}. Ils décrivent ${ED} et le début de 2025 : ils ne disent rien des primes ni de la situation d’une caisse en 2027.`,
    footer: "Ces chiffres sont donnés à titre d’information. Seules les publications de l’OFSP font foi.",
    faq: [
      {
        q: `Combien y a-t-il de caisses maladie en Suisse${N}?`,
        a: [`Le tableau 5.01 de l’OFSP compte ${K.nb} caisses de l’assurance de base avec des assurés en ${ED}. Le test de solvabilité de ${D_SOL.slice(-4)} en liste ${K.nbSolvabilite + META.solvabiliteHorsTableau501}, dont ${META.solvabiliteHorsTableau501} ne figurent pas dans le tableau 5.01. Le nombre de caisses qui ont des assurés varie selon le canton, de ${Math.min(...Object.values(K.parCanton))} à ${Math.max(...Object.values(K.parCanton))}. Les caisses d’un même groupe sont comptées séparément.`],
        src: <>Source : <a href={URL_OFSP}>OFSP, tableaux 5.01, 5.03 et 5.10</a>.</>,
      },
      {
        q: `Quelle caisse a le plus d’assurés dans mon canton${N}?`,
        a: ["La réponse change d’un canton à l’autre. Il suffit de choisir votre canton dans le tableau, puis de trier par nombre d’assurés, du plus élevé au plus bas : la liste donne les assurés au 31.12.2024 et la part de marché de chaque caisse. Avoir beaucoup d’assurés ne renseigne ni sur la qualité du service ni sur le niveau des primes."],
      },
      {
        q: `Les frais administratifs changent-ils ma prime${N}?`,
        a: [`Ils font partie des coûts que la prime doit couvrir, mais ils pèsent peu : ${pcFr(MOYENNE.fraisAdminPctDepenses)} des dépenses en moyenne suisse en ${ED}, soit ${f(MOYENNE.fraisAdminParAssure, "fr")}${N}CHF par assuré, contre ${f(MOYENNE.primesParAssure, "fr")}${N}CHF de primes par assuré. La prime d’une caisse dépend de plusieurs éléments, en premier lieu des coûts de santé de la région de prime, et l’OFSP l’approuve chaque année. Les primes 2027 se consultent dans le comparateur.`],
      },
      {
        q: `Que signifie le taux de solvabilité${N}?`,
        a: [`C’est le rapport entre les réserves disponibles d’une caisse au ${D_SOL} et le minimum que l’OFSP calcule pour ses risques. À 100${N}%, la caisse atteint ce minimum ; en dessous, elle est sous le niveau demandé par la loi. L’OFSP indique qu’avec au moins 100${N}%, un assureur devrait pouvoir tenir ses engagements même après une très mauvaise année. Ce taux ne mesure ni la qualité du service ni le niveau des primes.`],
        src: <>Sources : <a href={URL_OFSP}>OFSP, tableau 5.03</a> ; <a href={URL_LSAMAL}>art. 14 LSAMal</a>.</>,
      },
      {
        q: `Une caisse peut-elle faire faillite${N}?`,
        a: ["Une caisse peut devenir insolvable. La loi prévoit alors que l’institution commune LAMal, une fondation créée par les assureurs, prend en charge les coûts des prestations légales à la place de l’assureur insolvable (art. 18, al. 2, LAMal, qui renvoie à l’art. 51 LSAMal). L’OFSP surveille les assureurs, et ceux-ci doivent constituer des réserves suffisantes pour garantir leur solvabilité (art. 14 LSAMal)."],
        src: <>Sources : <a href={URL_LAMAL}>art. 18 LAMal</a> ; <a href={URL_LSAMAL}>art. 14 LSAMal</a>.</>,
      },
      {
        q: `D’où viennent ces chiffres et de quand datent-ils${N}?`,
        a: [`Ils viennent de la Statistique de l’assurance-maladie obligatoire ${ED} de l’OFSP, publiée le 19 janvier 2026, que nous avons lue le ${DATE_LIRE.fr}. Les tableaux 5.01, 5.07 et 5.10 sont à l’état du 22 mai 2025 et le tableau 5.03 à celui du 23 septembre 2025. Les assurés sont comptés au ${D_ASS}, les frais administratifs, les réserves et le résultat portent sur ${ED}, et la solvabilité sur le ${D_SOL}. L’OFSP a commencé à publier l’édition 2025 le 17 novembre 2026, et elle n’est pas encore complète.`],
        src: <>Source : <a href={URL_OFSP}>OFSP, Statistique de l’assurance-maladie obligatoire</a>.</>,
      },
    ] as FaqOutil[],
  },
  en: {
    path: OUTILS_EN.caissesChiffres,
    alt: OUTILS.caissesChiffres,
    titre: "Swiss health insurers in figures: insured, costs, solvency",
    description: `The ${K.nb} basic health insurers in official FOPH figures: insured by canton, administrative costs, reserves and solvency ratio, listed with no ranking.`,
    h1: "Swiss health insurers in figures",
    intro: `In ${ED}, ${K.nb} insurers covered ${f(K.totalAssures, "en")} people for basic health insurance. The table below gives the FOPH figures for each of them: insured and market share in your canton, administrative costs, reserves, result and solvency ratio.`,
    source: `Source: FOPH, compulsory health insurance statistics ${ED}, tables 5.01, 5.03, 5.07 and 5.10, read on ${DATE_LIRE.en}. Data as of 22 May 2025 for tables 5.01, 5.07 and 5.10, and 23 September 2025 for table 5.03.`,
    enBref: "Key figures",
    faits: [
      `FOPH table 5.01 lists ${K.nb} insurers for ${ED}. Where several insurers belong to one group, each appears separately.`,
      `On ${D_ASS}, these insurers had ${f(K.totalAssures, "en")} insured people.`,
      `Administrative costs range from CHF ${f(K.fraisMin, "en")} to CHF ${f(K.fraisMax, "en")} per insured in ${ED}, depending on the insurer. The Swiss average is CHF ${f(MOYENNE.fraisAdminParAssure, "en")}, which is ${pcEn(MOYENNE.fraisAdminPctDepenses)} of expenses.`,
      `The number of insurers with insured people is ${K.parCanton.GE} in Geneva, ${K.parCanton.VD} in Vaud, ${K.parCanton.VS} in Valais, ${K.parCanton.FR} in Fribourg, ${K.parCanton.NE} in Neuchâtel, ${K.parCanton.JU} in Jura and ${K.parCanton.BE} in Bern.`,
      `On ${D_SOL}, the published solvency ratio ranges from ${K.solMin}% to ${f(K.solMax, "en")}% for ${K.nbSolvabilite} insurers; ${sousCentEn}.`,
    ],
    liensTitre: "To read with these figures",
    lienComparateur: "Compare the 2027 premiums of these insurers for your postcode",
    lienComparateurTexte: "The comparison tool shows the FOPH-approved premiums for your address, age and deductible.",
    lienLettre: "Prepare your cancellation letter",
    lienLettreTexte: "The tool works out the deadline from the law and your contract, then writes the letter.",
    lienBarometre: "Health premium barometer",
    lienBarometreTexte: "The average premium and the increase in each French-speaking canton.",
    lienGuide: "The health insurance guide",
    lienGuideTexte: "Deductible, insurance models, deadlines and changing insurer.",
    lireTitre: "How to read these figures",
    lire: [
      "Basic insurance covers the same benefits at every insurer, because the law sets them. These figures therefore describe the insurer (its size, costs and reserves) and say nothing about the cover you get.",
      `Insured people are counted on ${D_ASS} (table 5.07). Market share comes from table 5.10 and is based on the average number of insured over the year, not on the 31 December count, so the two columns do not match exactly. Having had insured people in a canton in ${ED} does not mean the insurer will offer cover there in 2027.`,
      `Administrative costs per insured divide the insurer’s operating costs (staff, premises, IT, advertising, depreciation) by its average number of insured in ${ED}. As a percentage of expenses they range from ${pcEn(K.pctMin)} to ${pcEn(K.pctMax)} depending on the insurer; most of the remaining expenses pay for care. The table does not say why these costs differ between insurers, and a lower figure says nothing about service.`,
      "Reserves per insured add the reserves for basic insurance and the insurer’s capital, divided by the average number of insured. They leave out some items that the solvency test counts, such as reserves for optional daily sickness benefits. Provisions for care already received but not yet invoiced are counted separately and are not reserves.",
      "The overall result per insured is the difference between the insurer’s income and expenses for the year, divided by the average number of insured. A negative result means that expenses exceeded income in 2024. It should be read together with the reserves and the solvency ratio.",
      `The solvency ratio divides the reserves available on ${D_SOL} by the minimum reserves that the FOPH model calculates for the insurer’s risks. At 100%, the insurer reaches that minimum; according to the FOPH, with a ratio of at least 100% an insurer should be able to meet its commitments even after a very bad year. The law requires insurers to build up sufficient reserves to guarantee their solvency, and the Federal Council sets the minimum level (art. 14 LSAMal, the federal health insurance supervision act). The test covers all of an insurer’s activities, so its reserves are not those of table 5.01. ${K.nb - K.nbSolvabilite} insurers in that table do not appear in the test, and their column reads “not shown”.`,
      "Insurers belonging to the same group each appear with their own figures, as in the FOPH table, so this page cannot be used to add them up.",
    ],
    sourcesTitre: "Sources",
    sources: [
      [`FOPH, compulsory health insurance statistics ${ED}: tables 5.01, 5.02 (explanations), 5.03, 5.07 and 5.10`, URL_OFSP],
      ["opendata.swiss, FOPH dataset (“Open use” terms, source recommended)", URL_JEU],
      ["Art. 18 LAMal (KVG), common institution (Fedlex)", URL_LAMAL],
      ["Art. 14 LSAMal (KVAG), reserves (Fedlex)", URL_LSAMAL],
    ] as [string, string][],
    ctaBas: "It is free and without commitment, and only one adviser contacts you.",
    miettes: [{ name: "Home", href: "/en/" }, { name: "Health insurance", href: "/en/health-insurance/" }, { name: "Insurers in figures" }] as Miette[],
    appli: "Swiss health insurers in figures",
    partage: `The ${K.nb} basic health insurers in official FOPH figures: insured by canton, administrative costs, reserves and solvency ratio.`,
    maj: `FOPH figures (${ED} edition), read on ${DATE_LIRE.en}. They describe ${ED} and the start of 2025: they say nothing about premiums or an insurer’s situation in 2027.`,
    footer: "These figures are for information only. Only the FOPH publications are authoritative.",
    faq: [
      {
        q: "How many health insurers are there in Switzerland?",
        a: [`FOPH table 5.01 lists ${K.nb} basic insurers with insured people in ${ED}. The ${D_SOL.slice(-4)} solvency test lists ${K.nbSolvabilite + META.solvabiliteHorsTableau501}, of which ${META.solvabiliteHorsTableau501} are not in table 5.01. The number of insurers with insured people varies by canton, from ${Math.min(...Object.values(K.parCanton))} to ${Math.max(...Object.values(K.parCanton))}. Insurers in the same group are counted separately.`],
        src: <>Source: <a href={URL_OFSP}>FOPH, tables 5.01, 5.03 and 5.10</a>.</>,
      },
      {
        q: "Which insurer has the most insured people in my canton?",
        a: ["The answer differs from one canton to the next. You can pick your canton in the table, then sort by number of insured from highest to lowest: the list gives the insured at 31.12.2024 and each insurer’s market share. Having many insured people tells you nothing about service quality or premium levels."],
      },
      {
        q: "Do administrative costs change my premium?",
        a: [`They are part of the costs that the premium must cover, but they weigh little: ${pcEn(MOYENNE.fraisAdminPctDepenses)} of expenses on the Swiss average in ${ED}, or CHF ${f(MOYENNE.fraisAdminParAssure, "en")} per insured against CHF ${f(MOYENNE.primesParAssure, "en")} of premiums per insured. An insurer’s premium depends on several things, first of all the health costs of the premium region, and the FOPH approves it every year. The 2027 premiums are in the comparison tool.`],
      },
      {
        q: "What does the solvency ratio mean?",
        a: [`It is the ratio between an insurer’s available reserves on ${D_SOL} and the minimum that the FOPH calculates for its risks. At 100%, the insurer reaches that minimum; below it, the insurer is under the level the law asks for. The FOPH states that with at least 100%, an insurer should be able to meet its commitments even after a very bad year. The ratio measures neither service quality nor premium levels.`],
        src: <>Sources: <a href={URL_OFSP}>FOPH, table 5.03</a>; <a href={URL_LSAMAL}>art. 14 LSAMal</a>.</>,
      },
      {
        q: "Can a health insurer go bankrupt?",
        a: ["An insurer can become insolvent. The law then provides that the LAMal common institution, a foundation set up by the insurers, takes over the cost of the statutory benefits in place of the insolvent insurer (art. 18 para. 2 LAMal, which refers to art. 51 LSAMal). The FOPH supervises insurers, and they must build up sufficient reserves to guarantee their solvency (art. 14 LSAMal)."],
        src: <>Sources: <a href={URL_LAMAL}>art. 18 LAMal</a>; <a href={URL_LSAMAL}>art. 14 LSAMal</a>.</>,
      },
      {
        q: "Where do these figures come from and how old are they?",
        a: [`They come from the FOPH compulsory health insurance statistics ${ED}, published on 19 January 2026, which we read on ${DATE_LIRE.en}. Tables 5.01, 5.07 and 5.10 are as of 22 May 2025 and table 5.03 as of 23 September 2025. Insured people are counted on ${D_ASS}, administrative costs, reserves and result cover ${ED}, and solvency is as of ${D_SOL}. The FOPH began publishing the 2025 edition on 17 November 2026, and it is not yet complete.`],
        src: <>Source: <a href={URL_OFSP}>FOPH, compulsory health insurance statistics</a>.</>,
      },
    ] as FaqOutil[],
  },
};

export const metaCaissesChiffres = (locale: Locale) => {
  const t = T[locale];
  return pageMetadata({ title: t.titre, description: t.description, path: t.path, locale, ...(locale === "fr" ? { enPath: t.alt } : { frPath: t.alt }) });
};

export function PageCaissesChiffres({ locale }: { locale: Locale }) {
  const t = T[locale];
  const fr = locale === "fr";
  const url = abs(t.path);
  const o = fr ? OUTILS : OUTILS_EN;
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
      dateModified: DATE_PAGE.caissesChiffres,
      breadcrumb: { "@id": `${url}#breadcrumb` },
      mainEntity: { "@id": `${url}#outil` },
      citation: t.sources.map((s) => s[1]),
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
      name: t.appli,
      description: t.description,
      inLanguage: fr ? "fr-CH" : "en",
      dateModified: META.relevele,
      temporalCoverage: String(ED),
      isAccessibleForFree: true,
      creator: { "@id": ORG_ID },
      isBasedOn: URL_OFSP,
      license: "https://opendata.swiss/terms-of-use#terms_open",
      variableMeasured: fr
        ? ["Assurés au 31.12.2024", "Part de marché par canton", "Frais administratifs par assuré (CHF)", "Frais administratifs en % des dépenses", "Réserves par assuré (CHF)", "Résultat global par assuré (CHF)", "Taux de solvabilité au 1.1.2025 (%)"]
        : ["Insured at 31.12.2024", "Market share by canton", "Administrative costs per insured (CHF)", "Administrative costs as % of expenses", "Reserves per insured (CHF)", "Overall result per insured (CHF)", "Solvency ratio at 1.1.2025 (%)"],
    },
    breadcrumbLd(t.miettes, `${url}#breadcrumb`),
    { ...faqLd(faqOutilLd(t.faq)), "@id": `${url}#faq` },
  );
  const liens: [string, string, string][] = [
    [o.lettre, t.lienLettre, t.lienLettreTexte],
    [ROUTES_IDEES.barometre[locale], t.lienBarometre, t.lienBarometreTexte],
    [fr ? "/assurance-maladie/" : "/en/health-insurance/", t.lienGuide, t.lienGuideTexte],
  ];
  return (
    <div className="page-outil page-caisses-chiffres">
      <JsonLd data={ld} />
      <SiteHeader current="sante" locale={locale} altPath={t.alt} />
      <main id="contenu">
        <div className="wrap">
          <Breadcrumbs items={t.miettes} locale={locale} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>
          <CtaCaisses locale={locale} id="cta-caisses-haut" />
          <BandeConfiance locale={locale} signaux={["gratuit"]} compacte />
          <p className="mt-4 text-base">
            <a href={o.comparateur} className="font-semibold underline underline-offset-2">{t.lienComparateur}</a>
            <span className="text-muted-foreground"> {t.lienComparateurTexte}</span>
          </p>
          <Alert variant="info" className="mt-5">
            <AlertTitle>{t.enBref}</AlertTitle>
            <AlertDescription>
              <ul>
                {t.faits.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
          <p className="source-outil mt-4">{t.source}</p>
          <PartagerOutil path={t.path} title={t.appli} text={t.partage} locale={locale} />

          <section className="mt-8" aria-labelledby="chiffres">
            <h2 id="chiffres" className="sr-only">{t.h1}</h2>
            <CaissesChiffres locale={locale} />
          </section>

          <CtaCaisses locale={locale} id="cta-caisses-bas" note={t.ctaBas} className="mt-8" />

          <section className="mt-8 max-w-[68ch]">
            <h2>{t.lireTitre}</h2>
            {t.lire.map((p) => (
              <p key={p} className="mt-3">{p}</p>
            ))}
          </section>

          <section className="mt-8">
            <h2>{t.liensTitre}</h2>
            <ul className="mt-3 grid gap-3">
              <li>
                <a href={o.comparateur} className="font-semibold underline underline-offset-2">{t.lienComparateur}</a>{" "}
                <span className="text-muted-foreground">{t.lienComparateurTexte}</span>
              </li>
              {liens.map(([href, titre, texte]) => (
                <li key={href}>
                  <a href={href} className="font-semibold underline underline-offset-2">{titre}</a> <span className="text-muted-foreground">{texte}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="sources-pj">
            <h2>{t.sourcesTitre}</h2>
            <ol>
              {t.sources.map(([label, href]) => (
                <li key={href}>
                  <a href={href}>{label}</a>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="wrap faq">
          <p className="maj">{t.maj}</p>
          <FaqSections faq={t.faq} />
        </div>
      </main>
      <SiteFooter note={t.footer} locale={locale} altPath={t.alt} />
    </div>
  );
}
