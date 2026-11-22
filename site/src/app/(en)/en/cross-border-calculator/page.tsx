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
import { MAJ_ISO, abs } from "@/lib/site";
import { OUTILS, OUTILS_EN } from "@/lib/nav";

/* English version of /simulateur-frontalier/: same engine, English interface. */
const PATH = OUTILS_EN.simulateur;
const URL_ = abs(PATH);
const TITRE = "LAMal or French health insurance? Cross-border calculator";
const DESCRIPTION =
  "The Urssaf contribution and the 2027 LAMal premiums for your household, calculated from official Urssaf and FOPH figures, in your browser.";

export const metadata: Metadata = pageMetadata({ title: TITRE, description: DESCRIPTION, path: PATH, locale: "en", frPath: OUTILS.simulateur });

const MIETTES: Miette[] = [
  { name: "Home", href: "/en/" },
  { name: "Cross-border workers", href: "/en/cross-border-workers/" },
  { name: "LAMal or French insurance" },
];

/* Questions affichées sous l'outil, reprises telles quelles dans le JSON-LD (FAQPage). */
const FAQ: FaqOutil[] = [
  {
    q: "How long do I have to choose between LAMal and French insurance?",
    a: ["You have three months from the start of your work in Switzerland (or from your move to France). Once your CPAM (French local health insurance fund) has stamped the “Choix du système” (choice of system) form, you send it yourself to the Geneva health insurance service or to the OVAM (Vaud), because the CPAM does not forward it."],
    src: <>Sources: FOPH, health insurance for cross-border workers; CLEISS, right of option; State of Geneva.</>,
  },
  {
    q: "What happens if I do not choose?",
    a: ["You are automatically enrolled in LAMal. A tacit choice is not valid. If you are late without a valid excuse, a premium surcharge can apply."],
    src: <>Source: FOPH.</>,
  },
  {
    q: "How does Urssaf calculate the contribution?",
    a: ["Urssaf charges 8% of your income from the year before last, after an allowance of 25% of the annual social security ceiling (€12,225 in 2027). For example, for €60,000 of 2025 income, (60,000 − 12,225) × 8% = €3,822 in 2027. Each cross-border worker in the household pays their own contribution; dependants are attached with no contribution."],
    src: <>Source: Urssaf, “Travail en Suisse : déclarer vos revenus” (Working in Switzerland: declaring your income). The 2027 rate is still to be confirmed by the French social security financing act.</>,
  },
  {
    q: "Can I change option later?",
    a: ["In principle, no. A new contract with no break, a change of canton, a marriage or a birth does not reopen the choice."],
    src: <>Sources: OVAM (Vaud), CLEISS.</>,
  },
];

const LD = graph(
  {
    "@type": "WebPage",
    "@id": `${URL_}#webpage`,
    url: URL_,
    name: TITRE,
    description: DESCRIPTION,
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORG_ID },
    datePublished: "2026-11-22",
    dateModified: MAJ_ISO,
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
    name: "Cross-border calculator: Swiss LAMal or French health insurance",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    inLanguage: "en",
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
      <SiteHeader current="frontaliers" locale="en" altPath={OUTILS.simulateur} />
      <main>
        <div className="wrap">
          <Breadcrumbs items={MIETTES} locale="en" />
          <h1>Cross-border worker: LAMal or French health insurance?</h1>
          <p className="intro">
            If you live in France and work in Geneva or in the canton of Vaud, the calculator works out what your household would pay in 2027 with each option, using the official figures from Urssaf and the FOPH (OFSP, Federal Office of Public Health). In principle, the choice is final.
          </p>
          <p className="prive">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 9V6a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <rect x="3" y="9" width="14" height="10" rx="1.5" fill="currentColor" />
            </svg>
            The calculation runs in your browser. We receive neither your income nor the make-up of your household.
          </p>
          <PartagerOutil
            locale="en"
            path={PATH}
            title="Cross-border worker: LAMal or French insurance?"
            text="Compare Swiss LAMal and French health insurance for a cross-border household, with the official 2027 figures."
          />
          <SimulateurFrontalier locale="en" />
        </div>

        <div className="wrap faq">
          <FaqSections faq={FAQ} />
          <p className="maj">Updated on 22 November 2026. Data: FOPH 2027, Urssaf 2026 and 2027.</p>
        </div>
      </main>
      <SiteFooter locale="en" altPath={OUTILS.simulateur} note="Estimate for information only. The amount Urssaf asks for and your insurer’s premium prevail." />
    </div>
  );
}
