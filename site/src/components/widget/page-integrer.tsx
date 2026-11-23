import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { CodeWidget } from "@/components/widget/integrer";
import { nomRegion, regionsWidget } from "@/components/widget/widgets";
import { FaqSections, faqOutilLd, type FaqOutil } from "@/components/site/faq-sections";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { dateLongue, type Locale } from "@/lib/i18n";
import { MAJ_IDEES, ROUTES_IDEES } from "@/lib/pages-idees";
import { ANNEE_BAROMETRE } from "@/lib/barometre";

/* Page « Intégrer nos chiffres » (idée 7) : aperçu et code des trois widgets. Les widgets eux-mêmes sont sous /widget/,
   en noindex, sans mesure ; seule cette page est indexable. */
const T = " ";
export const WIDGETS = {
  fr: { delai: "/widget/delai-resiliation/", prime: "/widget/prime-moyenne/", taux: "/widget/taux-3a/" },
  en: { delai: "/widget/en/cancellation-deadline/", prime: "/widget/en/average-premium/", taux: "/widget/en/3a-rates/" },
};
/* Hauteurs mesurées pour une iframe de 358 px de large (écran de 390 px moins les marges ; Playwright, 23.11.2026). Plus large, l’encadré remplit la hauteur. */
const H = { delai: 320, primeListe: 420, primeRegion: 345, taux: 350 };

const TXT = {
  fr: {
    titre: "Widgets : délai LAMal, primes et taux 3a à intégrer",
    description: "Trois encadrés gratuits pour le site d’un journal, d’une commune ou d’une entreprise : délai de résiliation LAMal, prime médiane et taux 3a.",
    h1: "Nos chiffres à intégrer sur votre site",
    intro: "Trois petits encadrés à placer sur la page d’un journal, d’une commune ou d’un service RH. Ils se mettent à jour avec les données du site et ne déposent aucun cookie.",
    miettes: [{ name: "Accueil", href: "/" }, { name: "Intégrer nos chiffres" }] as Miette[],
    h2Delai: `Combien de jours reste-t-il pour résilier l’assurance de base${T}?`,
    pDelai: "L’encadré compte les jours jusqu’au 30 novembre, dernier jour où l’assureur doit recevoir la lettre pour un changement au 1er janvier (art. 7, al. 2, LAMal). Le nombre de jours se calcule avec la date de l’appareil du lecteur.",
    titreDelai: "Délai de résiliation de l’assurance de base, Guide Assurance",
    h2Prime: `Quelle est la prime médiane dans votre région${T}?`,
    pPrime: `L’encadré affiche la prime médiane ${ANNEE_BAROMETRE} d’un adulte avec la franchise de 300 francs dans la région de prime choisie, avec la fourchette où se trouve la moitié des offres et la moyenne cantonale de l’OFSP. Aucun assureur n’est nommé. Sans région, l’encadré donne la prime moyenne des six cantons romands.`,
    titrePrime: `Prime maladie ${ANNEE_BAROMETRE}, Guide Assurance`,
    choixPrime: "Région",
    tous: "Les six cantons romands (moyennes OFSP)",
    h2Taux: `Que rapportent les comptes 3a en ce moment${T}?`,
    pTaux: "L’encadré donne le taux le plus élevé, le taux médian et le plus bas des comptes 3a, relevés chaque semaine sur les pages des banques. Aucune banque n’y est nommée ; la liste complète, triée par taux, est sur le site.",
    titreTaux: "Taux des comptes 3a, Guide Assurance",
    maj: `Mis à jour le ${dateLongue(MAJ_IDEES, "fr")}.`,
  },
  en: {
    titre: "Widgets: LAMal deadline, premiums and 3a rates to embed",
    description: "Three free boxes to embed on a newspaper, municipality or company site: the cancellation deadline, the median premium by region and 3a rates. No cookies.",
    h1: "Our figures, ready to embed on your site",
    intro: "Three small boxes to place on a newspaper, municipality or HR page. They update with the site’s data and set no cookies.",
    miettes: [{ name: "Home", href: "/en/" }, { name: "Embed our figures" }] as Miette[],
    h2Delai: "How many days are left to cancel basic health insurance?",
    pDelai: "The box counts down the days to 30 November, the last day the insurer must receive the letter for a change on 1 January (art. 7 para. 2 LAMal). The number of days is calculated with the date on the reader’s device.",
    titreDelai: "Basic health insurance cancellation deadline, Guide Assurance",
    h2Prime: "What is the median premium in your region?",
    pPrime: `The box shows the ${ANNEE_BAROMETRE} median premium for an adult with the CHF 300 deductible in the chosen premium region, with the range covering half of the offers and the FOPH cantonal average. No insurer is named. Without a region, the box shows the average premium of the six French-speaking cantons.`,
    titrePrime: `${ANNEE_BAROMETRE} health insurance premium, Guide Assurance`,
    choixPrime: "Region",
    tous: "The six French-speaking cantons (FOPH averages)",
    h2Taux: "What do 3a accounts pay at the moment?",
    pTaux: "The box shows the highest, median and lowest rates of the 3a accounts, read every week on the banks’ own pages. No bank is named in it; the full list, sorted by rate, is on the site.",
    titreTaux: "Pillar 3a account rates, Guide Assurance",
    maj: `Updated on ${dateLongue(MAJ_IDEES, "en")}.`,
  },
};

const FAQ: Record<Locale, FaqOutil[]> = {
  fr: [
    {
      q: `Comment intégrer un encadré${T}?`,
      a: [
        "Copiez le code, puis collez-le dans un bloc HTML de votre page (dans WordPress, le bloc « HTML personnalisé »). L’encadré prend toute la largeur disponible jusqu’à 420 pixels et garde sa hauteur. L’usage est gratuit, à condition de laisser visible la mention « Source : Guide Assurance » et de ne pas modifier les chiffres.",
      ],
    },
    {
      q: `Les encadrés suivent-ils vos lecteurs${T}?`,
      a: [
        "Non. Ils ne déposent aucun cookie, n’enregistrent rien dans le navigateur et ne chargent aucun outil de mesure d’audience. Notre serveur note seulement, comme pour toute page, l’adresse du site qui affiche l’encadré, sans adresse IP.",
      ],
    },
    {
      q: `Les chiffres des encadrés sont-ils à jour${T}?`,
      a: [
        "Oui. Ils sont recalculés à chaque mise à jour du site : chaque semaine pour les taux 3a, à chaque relevé des primes de l’OFSP, et chaque jour pour le compte à rebours, qui suit la date de l’appareil du lecteur. La date des données figure en bas de chaque encadré.",
      ],
    },
  ],
  en: [
    {
      q: "How do I embed a box?",
      a: [
        "Copy the code, then paste it into an HTML block on your page (in WordPress, the “Custom HTML” block). The box takes the full available width up to 420 pixels and keeps its height. Use is free, provided the “Source: Guide Assurance” line stays visible and the figures are not changed.",
      ],
    },
    {
      q: "Do the boxes track your readers?",
      a: [
        "No. They set no cookies, store nothing in the browser and load no audience measurement tool. As for any page, our server only logs the address of the site showing the box, without the IP address.",
      ],
    },
    {
      q: "Are the figures in the boxes up to date?",
      a: [
        "Yes. They are recalculated with every site update: weekly for 3a rates, with each FOPH premium release, and daily for the countdown, which follows the date on the reader’s device. The data date is shown at the bottom of each box.",
      ],
    },
  ],
};

export function metadataIntegrer(l: Locale): Metadata {
  const t = TXT[l];
  return pageMetadata({ title: t.titre, description: t.description, path: ROUTES_IDEES.integrer[l], locale: l, ...(l === "fr" ? { enPath: ROUTES_IDEES.integrer.en } : { frPath: ROUTES_IDEES.integrer.fr }) });
}

export function PageIntegrer({ l }: { l: Locale }) {
  const t = TXT[l];
  const fr = l === "fr";
  const path = ROUTES_IDEES.integrer[l];
  const autre = ROUTES_IDEES.integrer[fr ? "en" : "fr"];
  const URL_ = abs(path);
  const w = WIDGETS[l];
  const choix = [{ valeur: "", libelle: t.tous }, ...regionsWidget().map((x) => ({ valeur: x.cle, libelle: nomRegion(x.c, x.r, l) }))];
  const hauteurs = Object.fromEntries(choix.map((c) => [c.valeur, c.valeur ? H.primeRegion : H.primeListe]));
  const LD = graph(
    {
      "@type": "WebPage",
      "@id": `${URL_}#webpage`,
      url: URL_,
      name: t.titre,
      description: t.description,
      inLanguage: fr ? "fr-CH" : "en",
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORG_ID },
      datePublished: MAJ_IDEES,
      dateModified: MAJ_IDEES,
      breadcrumb: { "@id": `${URL_}#breadcrumb` },
    },
    breadcrumbLd(t.miettes, `${URL_}#breadcrumb`),
    { ...faqLd(faqOutilLd(FAQ[l])), "@id": `${URL_}#faq` },
  );
  return (
    <div className="page-outil page-integrer">
      <JsonLd data={LD} />
      <SiteHeader current="outils" locale={l} altPath={autre} />
      <main>
        <div className="wrap">
          <Breadcrumbs items={t.miettes} locale={l} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>
          <div className="grille-widgets">
            <section>
              <h2>{t.h2Delai}</h2>
              <p>{t.pDelai}</p>
              <CodeWidget locale={l} base={abs(w.delai)} chemin={w.delai} titre={t.titreDelai} hauteur={H.delai} />
            </section>
            <section>
              <h2>{t.h2Prime}</h2>
              <p>{t.pPrime}</p>
              <CodeWidget locale={l} base={abs(w.prime)} chemin={w.prime} titre={t.titrePrime} hauteur={hauteurs} choix={choix} libelleChoix={t.choixPrime} />
            </section>
            <section>
              <h2>{t.h2Taux}</h2>
              <p>{t.pTaux}</p>
              <CodeWidget locale={l} base={abs(w.taux)} chemin={w.taux} titre={t.titreTaux} hauteur={H.taux} />
            </section>
          </div>
        </div>
        <div className="wrap faq">
          <FaqSections faq={FAQ[l]} />
          <p className="maj">{t.maj}</p>
        </div>
      </main>
      <SiteFooter locale={l} altPath={autre} />
    </div>
  );
}
