import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { PartagerOutil } from "@/components/site/partager-outil";
import { SimulateurFrontalier } from "@/components/outils/simulateur-frontalier";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { FaqSections, faqOutilLd, type FaqOutil } from "@/components/site/faq-sections";
import { abs } from "@/lib/site";
import { DATE_PAGE } from "@/lib/donnees";
import { dateLongue } from "@/lib/i18n";
import { OUTILS } from "@/lib/nav";

const PATH = OUTILS.simulateur;
const URL_ = abs(PATH);
const TITRE = "Frontalier : LAMal ou assurance française ? Simulateur 2027";
const DESCRIPTION =
  "La cotisation Urssaf et les primes LAMal 2027 de votre foyer, calculées avec les chiffres officiels de l’Urssaf et de l’OFSP, dans votre navigateur.";

export const metadata: Metadata = pageMetadata({ title: TITRE, description: DESCRIPTION, path: PATH });

const MIETTES: Miette[] = [
  { name: "Accueil", href: "/" },
  { name: "Frontaliers", href: "/frontaliers/" },
  { name: "LAMal ou assurance française" },
];

/* Questions affichées sous l'outil, reprises telles quelles dans le JSON-LD (FAQPage). */
const FAQ: FaqOutil[] = [
  {
    q: "Combien de temps ai-je pour choisir entre LAMal et assurance française ?",
    a: ["Vous disposez de trois mois à compter du début de votre travail en Suisse (ou de votre installation en France). Le formulaire « Choix du système », une fois tamponné par votre CPAM, est à envoyer vous-même au service de l’assurance maladie de Genève ou à l’OVAM (Vaud), car la CPAM ne le transmet pas."],
    src: <>Sources : OFSP, assurance maladie des frontaliers ; CLEISS, droit d’option ; État de Genève.</>,
  },
  {
    q: "Que se passe-t-il si je ne choisis pas ?",
    a: ["Vous êtes affilié d’office à la LAMal. Un choix tacite n’est pas valable. En cas de retard sans excuse valable, un supplément de prime peut s’appliquer."],
    src: <>Source : OFSP.</>,
  },
  {
    q: "Comment l’Urssaf calcule-t-elle la cotisation ?",
    a: ["L’Urssaf prélève 8 % de vos revenus de l’avant-dernière année, après un abattement de 25 % du plafond annuel de la sécurité sociale (12 225 € en 2027). Par exemple, pour 60 000 € de revenus 2025, (60 000 − 12 225) × 8 % = 3 822 € en 2027. Chaque frontalier du foyer paie sa propre cotisation ; les personnes à charge sont rattachées sans cotisation."],
    src: <>Source : Urssaf, « Travail en Suisse : déclarer vos revenus ». Le taux de 2027 reste à confirmer par la loi de financement de la sécurité sociale.</>,
  },
  {
    q: "Puis-je changer d’option plus tard ?",
    a: ["En principe non. Un nouveau contrat sans interruption, un changement de canton, un mariage ou une naissance ne rouvrent pas le choix."],
    src: <>Sources : OVAM (Vaud), CLEISS.</>,
  },
];

const LD = graph(
  {
    "@type": "WebPage",
    "@id": `${URL_}#webpage`,
    url: URL_,
    name: TITRE,
    description: DESCRIPTION,
    inLanguage: "fr-CH",
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORG_ID },
    datePublished: "2026-11-22",
    dateModified: DATE_PAGE.simulateur,
    breadcrumb: { "@id": `${URL_}#breadcrumb` },
    mainEntity: { "@id": `${URL_}#outil` },
    citation: [
      "https://www.urssaf.fr/accueil/particulier/travailleur-frontalier-suisse/travail-suisse-declarer-revenus.html",
      "https://www.bag.admin.ch/fr/assurance-maladie-travailleurs-frontaliers-en-suisse",
      "https://www.cleiss.fr/faq/droit_d_option_des_frontaliers_france-suisse.html",
      "https://www.fedlex.admin.ch/eli/cc/1995/3867_3867_3867/fr#art_101a",
      "https://opendata.swiss/fr/dataset/health-insurance-premiums",
    ],
  },
  {
    "@type": "WebApplication",
    "@id": `${URL_}#outil`,
    name: "Simulateur frontalier : LAMal ou assurance maladie française",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    inLanguage: "fr-CH",
    isAccessibleForFree: true,
    provider: { "@id": ORG_ID },
  },
  breadcrumbLd(MIETTES, `${URL_}#breadcrumb`),
  { ...faqLd(faqOutilLd(FAQ)), "@id": `${URL_}#faq` },
);

export default function Page() {
  return (
    <div className="page-outil">
      <JsonLd data={LD} />
      <SiteHeader current="frontaliers" altPath="/en/cross-border-calculator/" />
      <main>
        <div className="wrap">
          <Breadcrumbs items={MIETTES} />
          <h1>Frontalier : LAMal ou assurance maladie française ?</h1>
          <p className="intro">
            Si vous vivez en France et travaillez à Genève ou dans le canton de Vaud, le simulateur calcule ce que votre foyer paierait en 2027 avec chaque option, à partir des chiffres officiels de l’Urssaf et de l’OFSP. Le choix est en principe définitif.
          </p>
          <p className="prive">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 9V6a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <rect x="3" y="9" width="14" height="10" rx="1.5" fill="currentColor" />
            </svg>
            Le calcul se fait dans votre navigateur. Nous ne recevons ni vos revenus ni la composition de votre foyer.
          </p>
          <PartagerOutil path={PATH} title="Frontalier : LAMal ou assurance française ?" text="Comparer la LAMal et l’assurance maladie française pour un foyer frontalier, avec les chiffres officiels 2027." />
          <SimulateurFrontalier />
        </div>

        <div className="wrap faq">
          <FaqSections faq={FAQ} />
          <p className="maj">Mis à jour le {dateLongue(DATE_PAGE.simulateur, "fr")}. Données : OFSP 2027, Urssaf 2026 et 2027.</p>
        </div>
      </main>
      <SiteFooter note="Estimation donnée à titre d’information. Le montant appelé par l’Urssaf et la prime de votre assureur font foi." altPath="/en/cross-border-calculator/" />
    </div>
  );
}
