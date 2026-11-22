import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { PartagerOutil } from "@/components/site/partager-outil";
import { LettreResiliation } from "@/components/outils/lettre-resiliation";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { FaqSections, faqOutilLd, type FaqOutil } from "@/components/site/faq-sections";
import { MAJ_ISO, abs } from "@/lib/site";
import { OUTILS, OUTILS_EN } from "@/lib/nav";

/* English version of /lettre-resiliation/: English interface, same engine. The letter itself stays in French. */
const PATH = OUTILS_EN.lettre;
const URL_ = abs(PATH);
const TITRE = "Swiss health insurance cancellation letter: 2026 template";
const DESCRIPTION =
  "A LAMal or supplementary insurance cancellation letter written in your browser, with the legal deadline calculated. Nothing leaves your device.";

export const metadata: Metadata = pageMetadata({ title: TITRE, description: DESCRIPTION, path: PATH, locale: "en", frPath: OUTILS.lettre });

const MIETTES: Miette[] = [
  { name: "Home", href: "/en/" },
  { name: "Health", href: "/en/health-insurance/" },
  { name: "Cancellation letter" },
];

/* Questions affichées sous l'outil, reprises telles quelles dans le JSON-LD (FAQPage). */
const FAQ: FaqOutil[] = [
  {
    q: "When is the deadline to cancel basic health insurance for 2027?",
    a: ["Your insurer must receive your letter by 30 November 2026 at the latest for you to change insurer on 1 January 2027. This one-month period applies after the new premiums are announced (art. 7 para. 2 LAMal).", "With the CHF 300 deductible and free choice of doctor, a change on 30 June is also possible, with a letter received by 31 March (art. 7 para. 1 LAMal). With another deductible or a family doctor, HMO or Telmed model, a change is possible only at the end of the year (art. 94 and 100 OAMal, Health Insurance Ordinance)."],
  },
  {
    q: "When can you cancel supplementary insurance?",
    a: ["Supplementary insurance can be cancelled for the end of the third year of the contract, then for the end of each year, with three months’ notice (art. 35a LCA, Insurance Contract Act). For a contract that follows the calendar year, the letter must therefore arrive by 30 September.", "Your general terms and conditions can allow earlier cancellation, for example after a premium increase. They cannot be less favourable than the law."],
  },
  {
    q: "Do you have to send the letter by registered mail?",
    a: ["No, the law does not require it. Registered mail does, however, let you prove the date of receipt, which is the only date that counts. For supplementary insurance, the law requires writing or another means that leaves a written record (art. 35a LCA)."],
  },
  {
    q: "What happens if I do not have a new insurer yet?",
    a: ["For basic health insurance, you stay insured with the old insurer until the new one confirms your membership to it, with no gap in cover (art. 7 para. 5 LAMal). Supplementary insurance offers no such protection, so it is safer to wait until another insurer has accepted you before you cancel it."],
  },
  {
    q: "Can you change insurer with unpaid premiums?",
    a: ["No. As long as premiums, cost sharing, interest and debt collection costs are not paid in full, the insured person cannot change basic health insurer (art. 64a para. 6 LAMal). Arrears that concern only your children do not stop you."],
    src: <>Texts: <a href="https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_7">art. 7 LAMal</a>, <a href="https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_64a">art. 64a LAMal</a>, <a href="https://www.fedlex.admin.ch/eli/cc/1995/3867_3867_3867/fr#art_94">art. 94</a> and <a href="https://www.fedlex.admin.ch/eli/cc/1995/3867_3867_3867/fr#art_100">100 OAMal</a>, <a href="https://www.fedlex.admin.ch/eli/cc/24/719_735_717/fr#art_35a">art. 35a LCA</a>.</>,
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
      "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_7",
      "https://www.fedlex.admin.ch/eli/cc/24/719_735_717/fr#art_35a",
      "https://www.fedlex.admin.ch/eli/cc/1995/3867_3867_3867/fr#art_94",
      "https://www.fedlex.admin.ch/eli/cc/1995/3867_3867_3867/fr#art_100",
      "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_64a",
    ],
  },
  {
    "@type": "WebApplication",
    "@id": `${URL_}#outil`,
    name: "Swiss health insurance cancellation letter",
    applicationCategory: "UtilitiesApplication",
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
    <div className="page-outil page-lettre">
      <JsonLd data={LD} />
      <SiteHeader current="sante" locale="en" altPath={OUTILS.lettre} />
      <main>
        <div className="wrap">
          <Breadcrumbs items={MIETTES} locale="en" />
          <h1>Your health insurance cancellation letter</h1>
          <p className="intro">
            For basic health insurance (LAMal) or supplementary insurance (LCA), the letter takes shape as you fill in the fields, with the deadline calculated under the law.
          </p>
          <p className="prive">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 9V6a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <rect x="3" y="9" width="14" height="10" rx="1.5" fill="currentColor" />
            </svg>
            What you type stays on your device. The letter is created in your browser; we receive and keep nothing.
          </p>
          <PartagerOutil
            locale="en"
            path={PATH}
            title="Swiss health insurance cancellation letter"
            text="Prepare a LAMal or supplementary insurance cancellation letter, with the deadline calculated under the law."
          />
          <LettreResiliation locale="en" aujourdhuiIso={new Date().toISOString().slice(0, 10)} />
        </div>

        <div className="wrap faq">
          <p className="maj">Updated on 22 November 2026. Sources: Fedlex (LAMal, OAMal, LCA).</p>
          <FaqSections faq={FAQ} />
        </div>
      </main>
      <SiteFooter locale="en" altPath={OUTILS.lettre} note="This tool gives general information; your contract prevails." />
    </div>
  );
}
