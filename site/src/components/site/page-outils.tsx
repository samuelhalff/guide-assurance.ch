import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { Faqs, N, chf, nombre, pct, type Faq } from "@/components/donnees/commun";
import { IconeTelephone, LienRappel } from "@/components/demande/lien-rappel";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { DATE_PAGE_DONNEES, DATE_PAGE_OUTILS, DATE_PRIMES } from "@/lib/donnees";
import { DICT, dateLongue, type Locale } from "@/lib/i18n";
import { HUB_OUTILS, outils, PAGES_DONNEES, PAGES_DONNEES_EN } from "@/lib/nav";
import { ROUTES_IDEES, cheminBarometre } from "@/lib/pages-idees";
import { COMPTES_3A, RELEVE_LE, TAUX_MAX, TAUX_MIN, dateCh } from "@/lib/taux3a";
import { CANTONS_BAROMETRE, DATE_OFSP, DONNEES as BAROMETRE } from "@/lib/barometre";
import { groupes } from "@/lib/chiffres-cles";
import * as R from "@/lib/engines/regions-primes";
import * as I from "@/lib/engines/impot3a";
import * as C from "@/lib/engines/communes-3a";
import * as H from "@/lib/engines/historique-3a";
import EU from "@/data/primes-eu-fr-2027.json";
import * as SM from "@/lib/engines/somme-menage";
import { LU_LE as LU_LE_PJ, NB_CONTRATS as NB_CONTRATS_PJ } from "@/lib/garanties-pj";

/* « Outils et chiffres » (/outils/, /en/tools/) : les outils et les pages de données en deux groupes, une phrase
   par page avec son chiffre clé daté, tiré des mêmes fichiers que les pages elles-mêmes. Menu principal. */

type Ligne = { href: string; titre: string; chiffre: string; legende: string; texte: string; cta: string };

/* Chiffres repris des données (aucun nombre écrit à la main). */
function chiffres() {
  const ge = R.REGIONS.find((r) => r.canton === "GE")!.profils.find((p) => p.id === "a300a")!;
  const tabs = I.CANTONS.map((c) => C.table(c));
  const dernier = H.SERIE[H.SERIE.length - 1];
  return {
    ge,
    tabs,
    dernier,
    nbFaits: (l: Locale) => groupes(l).reduce((n, g) => n + g.faits.length, 0),
    ecoMin: Math.min(...tabs.map((t) => t.min.economie)),
    ecoMax: Math.max(...tabs.map((t) => t.max.economie)),
    nbCommunes: tabs.reduce((n, t) => n + t.lignes.length, 0),
    plafond27: I.PLAFONDS["2027"].avecLPP,
    menage: SM.estimer({ pieces: 3.5, personnes: 2, standard: "moyen" }),
  };
}

function lignes(l: Locale) {
  const fr = l === "fr";
  const o = outils(l);
  const D = fr ? PAGES_DONNEES : PAGES_DONNEES_EN;
  const K = chiffres();
  const dp = dateCh(DATE_PRIMES);
  const nat = BAROMETRE.national;
  const nb = (x: number, d = 0) => nombre(x, l, d);
  const outilsL: Ligne[] = fr
    ? [
        {
          href: o.comparateur,
          titre: "Comparateur des primes LAMal 2027",
          chiffre: `${nb(K.ge.min, 2)} à ${nb(K.ge.max, 2)}\u00a0CHF`,
          legende: `par mois pour un adulte à Genève, de la prime la plus basse à la plus haute parmi ${K.ge.n}, avec une franchise de 300\u00a0francs et l’accident compris. Primes relevées le ${dp}.`,
          texte: `Avec votre NPA, votre année de naissance et votre franchise, l’outil classe les primes 2027 de votre région de la plus basse à la plus haute.`,
          cta: "Voir les primes",
        },
        {
          href: o.lettre,
          titre: "Lettre de résiliation",
          chiffre: "30 novembre",
          legende: "Votre caisse doit avoir reçu la lettre de résiliation à cette date pour que vous changiez d’assurance de base le 1er janvier 2027 (art. 7 LAMal).",
          texte: "L’outil calcule la date limite d’après la loi et votre contrat, puis rédige une lettre à imprimer ou à copier.",
          cta: "Préparer ma lettre",
        },
        {
          href: o.simulateur,
          titre: `Simulateur frontalier${N}: LAMal ou assurance française${N}?`,
          chiffre: `${EU.assureurs.length} assureurs`,
          legende: `proposent l’assurance de base suisse en ${EU.annee} aux personnes qui vivent en France, d’après la liste de l’OFSP du 29.09.2026.`,
          texte: "Pour un foyer qui vit en France et travaille à Genève ou dans le canton de Vaud, le simulateur met ces primes en regard de la cotisation Urssaf.",
          cta: "Simuler mon foyer",
        },
        {
          href: ROUTES_IDEES.rappels.fr,
          titre: "Rappels d’échéance",
          chiffre: "3 dates",
          legende: "Résilier la LAMal avant le 30 novembre, verser sur le 3e pilier avant le 31 décembre, et résilier avant le 31 mars pour changer au 30 juin si vous avez la franchise de 300 francs.",
          texte: "Le fichier d’agenda (.ics) se crée dans votre navigateur, sans e-mail, avec une alerte avant chaque date et les échéances de vos propres contrats.",
          cta: "Créer mes rappels",
        },
        {
          href: o.taux3a,
          titre: "Taux des comptes 3a",
          chiffre: `${nb(TAUX_MIN, 2)} à ${pct(TAUX_MAX, l, 2)}`,
          legende: `d’intérêt sur un compte 3a, selon la banque. ${COMPTES_3A.length} banques comparées, taux relevés le ${dateCh(RELEVE_LE)}.`,
          texte: "Chaque taux est relevé sur la page de la banque, avec ses conditions, et la liste va du plus élevé au plus bas.",
          cta: "Voir les taux",
        },
        {
          href: o.impot3a,
          titre: "Économie d’impôt 3a",
          chiffre: chf(K.plafond27, l),
          legende: "C’est le maximum que vous pourrez verser sur votre 3e pilier en 2027 si vous avez une caisse de pension (montant fixé par l’OFAS).",
          texte: "Le calcul estime l’impôt fédéral, cantonal et communal qu’un versement 3a vous fait économiser, selon votre commune, votre revenu et votre famille.",
          cta: "Calculer",
        },
        {
          href: o.sommeMenage,
          titre: "Somme d’assurance ménage",
          chiffre: chf(K.menage.somme, l),
          legende: `C’est la somme à assurer pour le mobilier d’un couple dans un 3,5 pièces de standard moyen, avec une marge de 10${N}%. Calcul selon les méthodes de Baloise et de Zurich.`,
          texte: "Trois réponses suffisent pour estimer la valeur à neuf de votre mobilier, avec la règle de la sous-assurance appliquée à votre police actuelle.",
          cta: "Calculer ma somme",
        },
        {
          href: o.garantiesPj,
          titre: `Protection juridique${N}: ce que couvrent les contrats`,
          chiffre: `${NB_CONTRATS_PJ} contrats`,
          legende: `de protection juridique comparés garantie par garantie, d’après leurs conditions générales lues le ${dateCh(LU_LE_PJ)}. Ils sont présentés par ordre alphabétique.`,
          texte: "Domaines couverts, plafond par cas, délai de carence et choix de l’avocat, contrat par contrat, sans prime ni classement.",
          cta: "Voir les garanties",
        },
      ]
    : [
        {
          href: o.comparateur,
          titre: "2027 LAMal premium comparison",
          chiffre: `CHF\u00a0${nb(K.ge.min, 2)} to ${nb(K.ge.max, 2)}`,
          legende: `a month for an adult in Geneva, from the lowest to the highest premium among ${K.ge.n} offers, with a CHF\u00a0300 deductible and accident cover included. Premiums retrieved on ${dp}.`,
          texte: "Enter your postcode, year of birth and deductible, and the tool ranks your region’s 2027 premiums from lowest to highest.",
          cta: "See premiums",
        },
        {
          href: o.lettre,
          titre: "Cancellation letter",
          chiffre: "30 November",
          legende: "Your insurer must have received your cancellation letter by this date for you to switch basic insurance on 1 January 2027 (art. 7 LAMal).",
          texte: "The tool works out the deadline from the law and your contract, then drafts a letter to print or copy.",
          cta: "Write my letter",
        },
        {
          href: o.simulateur,
          titre: "Cross-border calculator: LAMal or French insurance?",
          chiffre: `${EU.assureurs.length} insurers`,
          legende: `offer Swiss basic health insurance in ${EU.annee} to people living in France, according to the FOPH list of 29.09.2026.`,
          texte: "For a household living in France and working in Geneva or Vaud, the calculator sets these premiums against the Urssaf contribution.",
          cta: "Run my numbers",
        },
        {
          href: ROUTES_IDEES.rappels.en,
          titre: "Renewal reminders",
          chiffre: "3 dates",
          legende: "Cancel basic insurance by 30 November, pay into pillar 3a by 31 December, and cancel by 31 March to switch on 30 June if you have the CHF 300 deductible.",
          texte: "The calendar file (.ics) is built in your browser, with no e-mail, an alert before each date and the renewal dates of your own contracts.",
          cta: "Create my reminders",
        },
        {
          href: o.taux3a,
          titre: "Pillar 3a interest rates",
          chiffre: `${nb(TAUX_MIN, 2)} to ${pct(TAUX_MAX, l, 2)}`,
          legende: `interest on a pillar 3a account, depending on the bank. ${COMPTES_3A.length} banks compared, rates read on ${dateCh(RELEVE_LE)}.`,
          texte: "Each rate is read on the bank’s own page, with its conditions, and the list runs from highest to lowest.",
          cta: "See rates",
        },
        {
          href: o.impot3a,
          titre: "Pillar 3a tax savings",
          chiffre: chf(K.plafond27, l),
          legende: "The most you can pay into pillar 3a in 2027 if you have a pension fund (amount set by the FSIO).",
          texte: "The calculator estimates the federal, cantonal and municipal tax a 3a payment saves you, based on your municipality, income and family.",
          cta: "Calculate",
        },
        {
          href: o.sommeMenage,
          titre: "Household contents sum insured",
          chiffre: chf(K.menage.somme, l),
          legende: "The sum to insure for the contents of a couple’s 3.5-room flat of medium standard, with a 10% margin. Calculated with the Baloise and Zurich methods.",
          texte: "Three answers are enough to estimate the replacement value of your belongings, with the underinsurance rule applied to your current policy.",
          cta: "Work out my sum",
        },
        {
          href: o.garantiesPj,
          titre: "Legal protection: what the policies cover",
          chiffre: `${NB_CONTRATS_PJ} policies`,
          legende: `of legal protection compared clause by clause, from their general terms read on ${dateCh(LU_LE_PJ)}. They are listed in alphabetical order.`,
          texte: "Areas covered, limit per case, waiting period and choice of lawyer, policy by policy, with no premiums or ranking.",
          cta: "See the cover",
        },
      ];

  const chiffresL: Ligne[] = fr
    ? [
        {
          href: D.chiffres,
          titre: "Chiffres clés 2027",
          chiffre: `${K.nbFaits("fr")} chiffres`,
          legende: `sur l’assurance en Suisse, chacun avec sa date et sa source. Page mise à jour le ${dateLongue(DATE_PAGE_DONNEES.chiffres, "fr")}.`,
          texte: `Primes moyennes par canton, écarts entre offres, plafonds et taux 3a, délais${N}: une phrase par chiffre, avec un lien direct pour la citer.`,
          cta: "Lire les chiffres",
        },
        {
          href: ROUTES_IDEES.barometre.fr,
          titre: `Baromètre des primes ${BAROMETRE.annee}`,
          chiffre: chf(nat.adulte, l, 2),
          legende: `par mois${N}: c’est la prime moyenne d’un adulte en Suisse en ${BAROMETRE.annee}, en ${nat.variation_pct >= 0 ? "hausse" : "baisse"} de ${pct(Math.abs(nat.variation_pct), l, 1)} sur un an (OFSP, ${dateCh(DATE_OFSP)}).`,
          texte: "Le baromètre compare les cantons romands entre eux, avec pour chacun la prime moyenne, la hausse et l’écart entre offres dans chaque région de prime.",
          cta: "Voir le baromètre",
        },
        {
          href: D.regions,
          titre: "Primes par région",
          chiffre: `${R.REGIONS.length} régions`,
          legende: `de primes en Suisse romande${N}: la prime de base dépend aussi de la région de votre commune. Primes 2027 relevées le ${dp}.`,
          texte: "Pour chaque région et des profils types, la page donne la prime médiane, les quartiles, le minimum et le maximum, avec le fichier CSV.",
          cta: "Voir les régions",
        },
        {
          href: D.historique3a,
          titre: "Historique des taux 3a",
          chiffre: pct(K.dernier.mediane, l, 2),
          legende: `C’est le taux médian des comptes 3a${N}: la moitié des ${K.dernier.n} banques relevées le ${dateCh(K.dernier.date)} paient plus, l’autre moitié moins.`,
          texte: "Les taux sont relevés chaque lundi et la page garde chaque relevé, avec la moyenne, la médiane et les décisions de la BNS.",
          cta: "Voir l’historique",
        },
        {
          href: D.communes3a,
          titre: "Économie d’impôt par commune",
          chiffre: `${nb(K.ecoMin)} à ${nb(K.ecoMax)}\u00a0CHF`,
          legende: `d’impôts en moins en 2026 en versant ${chf(C.PROFIL_TYPE.versement, l)} sur le 3e pilier, pour une personne seule avec ${chf(C.PROFIL_TYPE.revenu, l)} de revenu imposable. Le montant dépend de la commune.`,
          texte: `La page classe les ${nb(K.nbCommunes)} communes romandes selon l’impôt que ce versement fait économiser, avec une page par canton.`,
          cta: "Voir les communes",
        },
      ]
    : [
        {
          href: D.chiffres,
          titre: "2027 key figures",
          chiffre: `${K.nbFaits("en")} figures`,
          legende: `about insurance in Switzerland, each with its date and source. Page updated on ${dateLongue(DATE_PAGE_DONNEES.chiffres, "en")}.`,
          texte: "Average premiums by canton, gaps between offers, pillar 3a caps and rates, deadlines: one sentence per figure, with a direct link to cite it.",
          cta: "Read the figures",
        },
        {
          href: ROUTES_IDEES.barometre.en,
          titre: `${BAROMETRE.annee} premium barometer`,
          chiffre: chf(nat.adulte, l, 2),
          legende: `a month: the average premium for an adult in Switzerland in ${BAROMETRE.annee}, ${nat.variation_pct >= 0 ? "up" : "down"} ${pct(Math.abs(nat.variation_pct), l, 1)} on the year (FOPH, ${dateCh(DATE_OFSP)}).`,
          texte: "The barometer compares the French-speaking cantons, each with its average premium, its increase and the gap between offers in every premium region.",
          cta: "See the barometer",
        },
        {
          href: D.regions,
          titre: "Premiums by region",
          chiffre: `${R.REGIONS.length} regions`,
          legende: `in French-speaking Switzerland: your basic premium also depends on the region your municipality is in. 2027 premiums retrieved on ${dp}.`,
          texte: "For each region and a set of standard profiles, the page gives the median premium, quartiles, minimum and maximum, with the CSV file.",
          cta: "See the regions",
        },
        {
          href: D.historique3a,
          titre: "Pillar 3a rate history",
          chiffre: pct(K.dernier.mediane, l, 2),
          legende: `The median pillar 3a rate: half of the ${K.dernier.n} banks surveyed on ${dateCh(K.dernier.date)} pay more, half pay less.`,
          texte: "Rates are read every Monday and the page keeps each survey, with the mean, the median and the SNB’s decisions.",
          cta: "See the history",
        },
        {
          href: D.communes3a,
          titre: "Tax savings by municipality",
          chiffre: `CHF\u00a0${nb(K.ecoMin)} to ${nb(K.ecoMax)}`,
          legende: `less tax in 2026 by paying ${chf(C.PROFIL_TYPE.versement, l)} into pillar 3a, for a single person with ${chf(C.PROFIL_TYPE.revenu, l)} of taxable income. The amount depends on the municipality.`,
          texte: `The page ranks the ${nb(K.nbCommunes)} municipalities of French-speaking Switzerland by the tax this payment saves, with one page per canton.`,
          cta: "See the municipalities",
        },
      ];
  return { outilsL, chiffresL };
}

const TXT = {
  fr: {
    titre: "Outils et chiffres : primes LAMal, 3e pilier, délais",
    description: "Comparateur LAMal, lettre de résiliation, simulateur frontalier, taux et impôt 3a, chiffres clés 2027 et baromètre des primes : gratuits, datés et sourcés.",
    h1: "Outils gratuits et chiffres de l’assurance en Suisse romande",
    intro: "Les outils calculent dans votre navigateur, sans inscription. Les pages de chiffres reprennent les données officielles avec leur date et leur source, sans nommer d’assureur ni de banque.",
    h2Outils: "Outils",
    pOutils: "Pour comparer vos primes, résilier à temps et calculer ce que rapporte le 3e pilier.",
    h2Chiffres: "Chiffres",
    pChiffres: "Les données de l’année sur les primes et le 3e pilier, que vous pouvez lire, télécharger et citer.",
    parCanton: `Par canton${N}:`,
    autres: (w: string, k: string) => (
      <>
        Vous tenez un site{N}? La page <a href={w}>Intégrer nos outils</a> propose des widgets sans cookie (compte à rebours de résiliation, prime médiane d’une région, taux 3a). Pour les employeurs, le <a href={k}>kit RH</a> réunit sur une page PDF les délais des frontaliers et des nouveaux arrivants.
      </>
    ),
    rappelQ: `Une question sur votre propre situation${N}?`,
    rappel: "Être rappelé",
    faq: [
      {
        q: `Les outils sont-ils gratuits et sans inscription${N}?`,
        a: "Oui. Aucun compte ni adresse e-mail n’est demandé. Les calculs se font dans votre navigateur et les chiffres que vous saisissez ne nous sont pas transmis.",
      },
      {
        q: `D’où viennent les chiffres${N}?`,
        a: "Les primes viennent de Priminfo et des moyennes publiées par l’OFSP, les taux 3a des pages des banques, les plafonds 3a de l’OFAS et les barèmes d’impôt des calculettes officielles. Chaque page cite sa source et sa date.",
      },
      {
        q: `À quel rythme les chiffres sont-ils mis à jour${N}?`,
        a: "Les taux 3a sont relevés chaque lundi. Les primes et les plafonds 3a changent une fois par an, à l’automne. La date de mise à jour figure au bas de chaque page.",
      },
      {
        q: `Puis-je reprendre ces chiffres sur mon site${N}?`,
        a: `Oui. Les fichiers CSV des pages de données sont publiés sous licence CC${N}BY${N}4.0, en citant la source. Pour afficher un chiffre tenu à jour, les widgets de la page « ${N}Intégrer nos outils${N} » s’ajoutent par un simple code à copier.`,
      },
      {
        q: `Ces outils remplacent-ils un conseil${N}?`,
        a: "Non. Ils décrivent les offres et la loi à une date donnée, sans recommander d’assureur ni de banque. Pour parler de votre situation, vous pouvez demander à être rappelé par un conseiller.",
      },
    ] as Faq[],
    maj: `Page mise à jour le ${dateLongue(DATE_PAGE_OUTILS, "fr")}.`,
    footer: "Chiffres donnés à titre d’information, d’après les sources officielles citées sur chaque page.",
  },
  en: {
    titre: "Tools and figures: health premiums, pillar 3a, deadlines",
    description: "LAMal premium comparison, cancellation letter, cross-border calculator, 3a rates and tax savings, 2027 key figures and premium barometer: free, dated and sourced.",
    h1: "Free tools and insurance figures for French-speaking Switzerland",
    intro: "The tools run in your browser, with no sign-up. The data pages use official figures with their date and source, and name no insurer or bank.",
    h2Outils: "Tools",
    pOutils: "To compare premiums, cancel on time and see what pillar 3a is worth to you.",
    h2Chiffres: "Figures",
    pChiffres: "This year’s data on premiums and pillar 3a, to read, download and cite.",
    parCanton: "By canton:",
    autres: (w: string, k: string) => (
      <>
        Run a website? The <a href={w}>embed page</a> offers cookie-free widgets (LAMal cancellation countdown, median premium of a region, pillar 3a rates). For employers, the <a href={k}>HR kit</a> puts the deadlines for cross-border workers and newcomers on a one-page PDF.
      </>
    ),
    rappelQ: "A question about your own situation?",
    rappel: "Request a call-back",
    faq: [
      {
        q: "Are the tools free and sign-up free?",
        a: "Yes. No account or e-mail address is needed. Calculations run in your browser and the figures you enter are not sent to us.",
      },
      {
        q: "Where do the figures come from?",
        a: "Premiums come from Priminfo and the averages published by the FOPH, pillar 3a rates from the banks’ own pages, 3a caps from the FSIO and tax scales from the official calculators. Each page cites its source and date.",
      },
      {
        q: "How often are the figures updated?",
        a: "Pillar 3a rates are read every Monday. Premiums and 3a caps change once a year, in the autumn. The update date is shown at the bottom of each page.",
      },
      {
        q: "Can I use these figures on my own site?",
        a: "Yes. The CSV files of the data pages are published under a CC BY 4.0 licence, with the source credited. To show a figure that stays up to date, the widgets on the embed page take one snippet of code to copy.",
      },
      {
        q: "Do these tools replace advice?",
        a: "No. They describe offers and the law at a given date, and recommend no insurer or bank. To talk about your situation, you can ask to be called back by an adviser.",
      },
    ] as Faq[],
    maj: `Page updated on ${dateLongue(DATE_PAGE_OUTILS, "en")}.`,
    footer: "Figures for information only, from the official sources cited on each page.",
  },
};

export const metaOutils = (locale: Locale) => {
  const t = TXT[locale];
  return pageMetadata({ title: t.titre, description: t.description, path: HUB_OUTILS[locale], locale, ...(locale === "fr" ? { enPath: HUB_OUTILS.en } : { frPath: HUB_OUTILS.fr }) });
};

const Fleche = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

function Liste({ items, apres }: { items: Ligne[]; apres?: Record<string, React.ReactNode> }) {
  return (
    <ol className="outils-liste hub-liste">
      {items.map((o) => (
        <li key={o.href}>
          <a className="outil-ligne" href={o.href}>
            <span className="outil-chiffre">
              {o.chiffre}
              <small>{o.legende}</small>
            </span>
            <span className="outil-texte">
              <b>{o.titre}</b>
              {o.texte}
            </span>
            <span className="outil-cta">
              {o.cta}
              <Fleche />
            </span>
          </a>
          {apres?.[o.href]}
        </li>
      ))}
    </ol>
  );
}

export function PageOutils({ locale }: { locale: Locale }) {
  const t = TXT[locale];
  const fr = locale === "fr";
  const d = DICT[locale];
  const path = HUB_OUTILS[locale];
  const alt = HUB_OUTILS[fr ? "en" : "fr"];
  const url = abs(path);
  const { outilsL, chiffresL } = lignes(locale);
  const miettes: Miette[] = [{ name: d.accueil, href: fr ? "/" : "/en/" }, { name: fr ? "Outils et chiffres" : "Tools and figures" }];
  const tous = [...outilsL, ...chiffresL];
  const ld = graph(
    {
      "@type": "CollectionPage",
      "@id": `${url}#webpage`,
      url,
      name: t.titre,
      description: t.description,
      inLanguage: d.inLanguage,
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORG_ID },
      datePublished: "2026-11-23",
      dateModified: DATE_PAGE_OUTILS,
      breadcrumb: { "@id": `${url}#breadcrumb` },
      mainEntity: {
        "@type": "ItemList",
        "@id": `${url}#liste`,
        numberOfItems: tous.length,
        itemListElement: tous.map((o, i) => ({ "@type": "ListItem", position: i + 1, url: abs(o.href), name: o.titre })),
      },
    },
    breadcrumbLd(miettes, `${url}#breadcrumb`),
    { ...faqLd(t.faq), "@id": `${url}#faq` },
  );
  const cantons = (
    <p className="hub-cantons">
      {t.parCanton}{" "}
      {CANTONS_BAROMETRE.map((c, i) => (
        <span key={c.code}>
          {i > 0 ? ", " : ""}
          <a href={cheminBarometre(c.code, locale)}>{c[locale]}</a>
        </span>
      ))}
    </p>
  );
  return (
    <div className="page-outil page-donnees page-hub">
      <JsonLd data={ld} />
      <SiteHeader current="outils" locale={locale} altPath={alt} />
      <main id="contenu">
        <div className="wrap">
          <Breadcrumbs items={miettes} locale={locale} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>

          <section className="hub-groupe" aria-labelledby="hub-outils">
            <h2 id="hub-outils">{t.h2Outils}</h2>
            <p>{t.pOutils}</p>
            <Liste items={outilsL} />
          </section>

          <section className="hub-groupe" aria-labelledby="hub-chiffres">
            <h2 id="hub-chiffres">{t.h2Chiffres}</h2>
            <p>{t.pChiffres}</p>
            <Liste items={chiffresL} apres={{ [ROUTES_IDEES.barometre[locale]]: cantons }} />
          </section>

          <p className="hub-autres">{t.autres(ROUTES_IDEES.integrer[locale], ROUTES_IDEES.kitRh[locale])}</p>

          <p className="rappel-liste">
            {t.rappelQ}{" "}
            <LienRappel locale={locale} emplacement="outils">
              <IconeTelephone size={16} />
              {t.rappel}
            </LienRappel>
          </p>
        </div>
        <Faqs faq={t.faq} maj={t.maj} />
      </main>
      <SiteFooter note={t.footer} locale={locale} altPath={alt} />
    </div>
  );
}
