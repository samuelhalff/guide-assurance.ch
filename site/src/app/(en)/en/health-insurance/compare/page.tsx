import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { PartagerOutil } from "@/components/site/partager-outil";
import { ComparateurPrimes } from "@/components/outils/comparateur-primes";
import { TableauReperes } from "@/components/outils/reperes-primes";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { MAJ_ISO, abs } from "@/lib/site";
import { OUTILS, OUTILS_EN } from "@/lib/nav";

/* English version of /assurance-maladie/comparateur/: same tool, English interface. */
const PATH = OUTILS_EN.comparateur;
const URL_ = abs(PATH);
const TITRE = "Compare 2027 LAMal health insurance premiums";
const DESCRIPTION =
  "2027 LAMal premiums of the offers in your region for your postcode, age, deductible and model, sorted from lowest to highest. FOPH (OFSP) data.";

const FAQ = [
  {
    q: "Do the benefits vary from one insurer to another?",
    a: "No. Basic insurance reimburses the same benefits whichever insurer you choose, because the list is set by the Health Insurance Act (LAMal) and its ordinances. Insurers differ in their premium, the rules of their models and their service.",
  },
  {
    q: "Why does the premium depend on my postcode?",
    a: "Premiums are set per canton and, in some cantons, per premium region. Vaud, Valais and Fribourg have several; Geneva, Neuchâtel and Jura have one. For the canton of Bern, only the Bernese Jura is covered here. Your municipality of residence is what counts. When a postcode covers several regions, the tool asks you to pick yours.",
  },
  {
    q: "What do the PRAXIS, TEL_DIG, PHARM and FLEX models mean?",
    a: "They are the model categories the FOPH uses from 2027. With PRAXIS, the first point of contact is a designated practice (family doctor or HMO centre). With TEL_DIG, you start with a call or an app, and with PHARM, with a partner pharmacy. FLEX lets you choose between several first points of contact. The standard model keeps the free choice of doctor.",
  },
  {
    q: "What is the deadline to change insurer for 2027?",
    a: "Your cancellation letter must reach the insurer by Monday 30 November 2026 at the latest for a change on 1 January 2027 (art. 7 para. 2 LAMal). The new insurer must accept you, whatever your state of health.",
  },
  {
    q: "Where do the premiums come from?",
    a: "They come from the 2027 premiums approved by the Federal Office of Public Health (FOPH, OFSP in French), published on priminfo.admin.ch and retrieved on 22 November 2026, and from the FOPH 2027 premium regions file. Amounts are monthly, in Swiss francs, before the redistribution of environmental levies.",
  },
];

export const metadata: Metadata = pageMetadata({ title: TITRE, description: DESCRIPTION, path: PATH, locale: "en", frPath: OUTILS.comparateur });

const MIETTES: Miette[] = [
  { name: "Home", href: "/en/" },
  { name: "Health insurance", href: "/en/health-insurance/" },
  { name: "Compare 2027 premiums" },
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
      "https://www.priminfo.admin.ch/fr/praemien",
      "https://www.priminfo.admin.ch/downloads/praemienregionen-2027.xlsx",
      "https://www.bag.admin.ch/fr/assurance-maladie-assurances-impliquant-un-choix-limite-des-fournisseurs-de-prestations",
      "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_7",
    ],
  },
  {
    "@type": "WebApplication",
    "@id": `${URL_}#outil`,
    name: "Compare 2027 LAMal premiums",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    inLanguage: "en",
    isAccessibleForFree: true,
    provider: { "@id": ORG_ID },
  },
  breadcrumbLd(MIETTES, `${URL_}#breadcrumb`),
  { ...faqLd(FAQ), "@id": `${URL_}#faq` },
);

export default function Page() {
  return (
    <div className="page-outil">
      <JsonLd data={LD} />
      <SiteHeader current="sante" locale="en" altPath={OUTILS.comparateur} />
      <main>
        <div className="wrap">
          <Breadcrumbs items={MIETTES} locale="en" />
          <h1>Compare 2027 health insurance premiums</h1>
          <p className="intro">
            From your postcode, year of birth and deductible, the tool lists the 2027 premiums of the offers in your region, sorted from the lowest to the highest. Basic benefits are identical from one insurer to the next, so it is up to you to judge what the difference in premium is worth.
          </p>
          <p className="prive">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 9V6a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <rect x="3" y="9" width="14" height="10" rx="1.5" fill="currentColor" />
            </svg>
            The calculation runs in your browser. We receive neither your postcode nor your age.
          </p>
          <PartagerOutil path={PATH} title="Compare 2027 LAMal premiums" text="The 2027 LAMal premiums for your postcode, age and deductible, sorted from lowest to highest." locale="en" />
          <ComparateurPrimes locale="en" />
          <TableauReperes locale="en" />
        </div>

        <div className="wrap faq">
          {FAQ.map((f) => (
            <section key={f.q}>
              <h2>{f.q}</h2>
              <p>{f.a}</p>
            </section>
          ))}
          <p className="maj">Updated on 22 November 2026. Data: FOPH (OFSP), 2027 premiums and 2027 premium regions.</p>
        </div>
      </main>
      <SiteFooter note="Premiums for information only. The premium on your policy is what counts." locale="en" altPath={OUTILS.comparateur} />
    </div>
  );
}
