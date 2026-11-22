import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { JsonLd } from "@/components/site/json-ld";
import { PaysageAccueil } from "@/components/site/paysage-accueil";
import { AccueilFeuille, AccueilSituations } from "@/components/site/accueil-feuille";
import { calculerSaison } from "@/components/site/saison";
import { pageMetadata } from "@/lib/metadata";
import { jsonLdAccueil } from "@/lib/jsonld-accueil";
import { ORG_ID, WEBSITE_ID } from "@/lib/jsonld";
import { MAJ_ISO, abs } from "@/lib/site";
import { OUTILS_EN } from "@/lib/nav";

/* English home: the French home (src/app/(fr)/page.tsx) in English, same figures, links to the English pages. */
const TITRE = "Compare 2027 Swiss health insurance premiums";
const DESCRIPTION =
  "2027 health insurance premiums from the insurers active in your part of French-speaking Switzerland (FOPH data). No sign-up or ads; runs in your browser.";

export const metadata: Metadata = pageMetadata({ title: TITRE, description: DESCRIPTION, path: "/en/", locale: "en", frPath: "/" });

const LD = {
  "@context": "https://schema.org",
  "@graph": [
    ...jsonLdAccueil["@graph"].slice(0, 3),
    {
      "@type": "WebPage",
      "@id": abs("/en/#webpage"),
      url: abs("/en/"),
      name: TITRE,
      description: DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORG_ID },
      publisher: { "@id": ORG_ID },
      mainEntity: { "@id": abs(`${OUTILS_EN.comparateur}#outil`) },
      dateModified: MAJ_ISO,
    },
    {
      "@type": "WebApplication",
      "@id": abs(`${OUTILS_EN.comparateur}#outil`),
      name: "Compare 2027 LAMal premiums",
      url: abs(OUTILS_EN.comparateur),
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      inLanguage: "en",
      isAccessibleForFree: true,
      provider: { "@id": ORG_ID },
    },
  ],
};

/* Average adult premiums (FOPH, premiums published on 29.09.2026) and standard premium with CHF 300 deductible (Guide Assurance calculation). */
const PRIMES = [
  { canton: "Geneva", moy: "610.60", hausse: "+4.3%", avant: "585.40", g26: 78.6, w: 13.6, std: "771.00", min: "711.20", max: "915.70" },
  { canton: "Neuchâtel", moy: "558.80", hausse: "+5.3%", avant: "530.80", g26: 49.1, w: 15.1, std: "730.20", min: "675.60", max: "835.00" },
  { canton: "Jura", moy: "551.00", hausse: "+5.9%", avant: "520.50", g26: 43.5, w: 16.5, std: "703.50", min: "655.80", max: "810.60" },
  { canton: "Vaud", moy: "543.50", hausse: "+3.2%", avant: "526.60", g26: 46.8, w: 9.1, std: "693.50", min: "614.40", max: "780.80" },
  { canton: "Fribourg", moy: "465.50", hausse: "+5.2%", avant: "442.60", g26: 1.4, w: 12.4, std: "610.60", min: "551.00", max: "699.70" },
  { canton: "Valais", moy: "460.90", hausse: "+5.7%", avant: "436.10", g26: -2.1, w: 13.4, std: "584.60", min: "494.50", max: "652.90" },
];

/* Published guides (content/en): the full list is on /en/guides/. */
const GUIDES = [
  { titre: "Health insurance (LAMal) 2027: deductibles, models, changing insurer", href: "/en/health-insurance/", pour: "Households", lecture: "5 min" },
  { titre: "2027 LAMal premiums in French-speaking Switzerland, canton by canton", href: "/en/health-insurance/premiums/", pour: "Households", lecture: "4 min" },
  { titre: "Cross-border workers: LAMal or French insurance, the right of option", href: "/en/cross-border-workers/", pour: "Cross-border workers", lecture: "4 min" },
  { titre: "Moving to Switzerland: insurance for your first months", href: "/en/moving-to-switzerland/", pour: "New arrivals", lecture: "4 min" },
  { titre: "Pillar 3 in 2027: limits, deductions and death cover", href: "/en/pillar-3a/", pour: "Pensions", lecture: "4 min" },
  { titre: "Occupational pensions (LPP) for small businesses: 2027 thresholds and choosing a pension fund", href: "/en/business/occupational-pensions/", pour: "Business", lecture: "3 min" },
];

/* Tools, in home-page order. The first figure of each row comes from the tool itself (profile stated). */
type OutilLigne = { href: string; chiffre: string; legende: string; titre: string; texte: string; cta: string };
const OUTILS_LISTE: OutilLigne[] = [
  {
    href: OUTILS_EN.comparateur,
    chiffre: "611.70 to 915.70",
    legende: "CHF a month · 106 offers for an adult in Geneva, CHF 300 deductible, 2027 premiums",
    titre: "Compare 2027 LAMal premiums",
    texte: "The law sets the basic benefits, which are identical from one insurer to the next. The list shows the offers in your region sorted by premium, for your age, deductible and model.",
    cta: "See the premiums",
  },
  {
    href: OUTILS_EN.simulateur,
    chiffre: "6,452 to 26,857",
    legende: "CHF per year · example of a household of four, 2027 LAMal premiums",
    titre: "Cross-border worker: LAMal or French insurance?",
    texte: "This household pays one amount or the other depending on the insurer it chooses. The calculator sets them against the Urssaf contribution due on your income.",
    cta: "Calculate for my household",
  },
  {
    href: OUTILS_EN.lettre,
    chiffre: "30 November",
    legende: "date of receipt to change insurer on 1 January",
    titre: "Cancellation letter",
    texte: "The tool works out the deadline from the law and your contract, then prepares a letter to print or copy.",
    cta: "Prepare my letter",
  },
];
/* TODO(3a): pillar 3a tools in progress. Add rows here (same shape as OUTILS_LISTE) once Sam gives the published
   addresses. Nothing renders while the list is empty: no link to a missing page. */
const OUTILS_3A: OutilLigne[] = [
  {
    href: "/en/pillar-3a/interest-rates/",
    chiffre: "0.05 to 0.65%",
    legende: "pillar 3a account rates at 17 banks, read on 22.11.2026",
    titre: "Pillar 3a interest rates",
    texte: "We read each bank's rate on its own page, with its conditions. The list runs from the highest rate to the lowest, and no bank pays to be listed.",
    cta: "See the rates",
  },
  {
    href: "/en/pillar-3a/tax-savings/",
    chiffre: "CHF 7,373",
    legende: "maximum 3a payment in 2027 with a pension fund (FSIO)",
    titre: "Pillar 3a tax savings in French-speaking Switzerland",
    texte: "The calculator estimates how much a 3a payment lowers your federal, cantonal and municipal tax, depending on your municipality, income and family.",
    cta: "Calculate",
  },
];

const Fleche = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export default function Home() {
  return (
    <>
      <JsonLd data={LD} />
      <SiteHeader locale="en" altPath="/" />
      <main className="accueil">
        <AccueilFeuille locale="en" saisonInitiale={calculerSaison(new Date())} cartes={<PaysageAccueil />} />
        <AccueilSituations locale="en" />

        <section className="passage" id="passage" aria-labelledby="passage-titre">
          <div className="wrap grille">
            <div>
              <h2 className="titre" id="passage-titre">When is the deadline to change health insurer for 2027?</h2>
              <p className="texte">
                Your insurer must receive your cancellation letter by 30 November 2026 at the latest for a change on 1 January 2027 (art. 7 LAMal). For basic insurance, the new insurer must accept you, whatever your health.
              </p>
              <p className="texte">
                Supplementary insurance (LCA, Insurance Contract Act) works differently. Because the new insurer can refuse you on health grounds, it is safer to wait for its written acceptance before you cancel. The law lets you cancel for the end of the third year of the contract, then of each year, with three months’ notice (art. 35a LCA).
              </p>
              <p className="texte">
                Our <a href={OUTILS_EN.lettre}>cancellation letter tool</a> works out the deadline for your contract, and your data stays on your device.
              </p>
              <div className="echeances">
                <div className="echeance alerte">
                  <div className="date">30.11<span className="an">.2026</span></div>
                  <div className="quoi">Basic health insurance (LAMal): letter received by this date at the latest</div>
                </div>
                <div className="echeance alerte">
                  <div className="date">30.09<span className="an">.2027</span></div>
                  <div className="quoi">Supplementary insurance (LCA): common deadline, check it in your contract</div>
                </div>
              </div>
            </div>
            <figure className="extrait document">
              <p className="source">Sample clause based on common wording, without copying a specific contract</p>
              <p className="clause">
                <b>Cancellation.</b> The policyholder may cancel the contract for the end of a calendar year, <mark>subject to three months’ notice</mark>. Any new insurance application may be subject to a health assessment.
              </p>
              <figcaption className="note">
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="i-fond" cx="12" cy="12" r="10.5" strokeWidth="1.8" />
                  <path className="i-trait" d="M12 10.5v6" strokeWidth="2.2" strokeLinecap="round" />
                  <circle className="i-point" cx="12" cy="7.3" r="1.4" />
                </svg>
                <span>
                  <b>What it means</b>Your letter must arrive by 30 September at the latest. Since the new insurer can refuse you on health grounds, it is safer to wait for its written confirmation before sending it.
                </span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="outils" id="outils" aria-labelledby="outils-titre">
          <div className="wrap">
            <h2 className="titre" id="outils-titre">Which tools should you use before changing insurance?</h2>
            <p className="texte">The tools below are free and need no sign-up. The calculation runs on your device, and your figures do not reach us.</p>
            <ol className="outils-liste">
              {[...OUTILS_LISTE, ...OUTILS_3A].map((o) => (
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
                </li>
              ))}
              <li className="bientot-ligne">
                <b>Which deductible should you choose?</b> A tool in preparation will show the level of costs above which the low deductible pays off.
              </li>
            </ol>
          </div>
        </section>

        <section className="primes" id="primes" aria-labelledby="primes-titre">
          <div className="wrap">
            <h2 className="titre" id="primes-titre">How much does basic health insurance cost in 2027 in French-speaking Switzerland?</h2>
            <p className="texte">
              In 2027, the average premium for an adult ranges from CHF 460.90 per month in Valais to CHF 610.60 in Geneva. The Swiss average is CHF 487.60, up 4.9% (FOPH, Federal Office of Public Health, premiums published on 29.09.2026).
            </p>
            <p className="texte">
              According to Guide Assurance calculations on the FOPH tables, the standard premium for an adult varies by 24 to 32% between the lowest and the highest premium in the same canton (CHF 300 deductible, with accident cover, all premium regions of the canton). The choice of insurer matters almost as much as the canton.
            </p>
            <div className="grille">
              <div>
                <figure className="graphe" style={{ "--ch": "25.7%" } as React.CSSProperties}>
                  <ul className="g-liste">
                    {PRIMES.map((p) => (
                      <li className="g-row" key={p.canton}>
                        <span className="g-nom">{p.canton}</span>
                        <span className="g-piste" aria-hidden="true">
                          <i className="g-seg" style={{ left: `${p.g26}%`, width: `${p.w}%` }} />
                          <i className="g-26" style={{ left: `${p.g26}%` }} />
                          <i className="g-27" style={{ left: `${(p.g26 + p.w).toFixed(1)}%` }} />
                        </span>
                        <span className="g-val">
                          {p.moy} <em>{p.hausse}</em>
                          <span className="sr"> (2026: {p.avant})</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <figcaption className="g-leg">
                    <span className="g-k" />
                    2026 <span className="g-k g-k27" />
                    2027 <span className="g-kch" />
                    Swiss average 2027 (487.60). Average adult premium, CHF per month.
                  </figcaption>
                </figure>
              <p className="primes-lien">
                <a className="bouton second" href={OUTILS_EN.comparateur}>
                  See the premiums for your municipality
                  <Fleche />
                </a>
              </p>
              </div>
              <table>
                <caption>Monthly basic health insurance premiums, adult, in CHF (FOPH, 2027 premiums)</caption>
                <thead>
                  <tr>
                    <th scope="col">Canton</th>
                    <th scope="col" className="num">Average 2027</th>
                    <th scope="col" className="num">Increase</th>
                    <th scope="col" className="num">Standard, CHF 300 deductible</th>
                  </tr>
                </thead>
                <tbody>
                  {PRIMES.map((p) => (
                    <tr key={p.canton}>
                      <th scope="row">{p.canton}</th>
                      <td className="num">{p.moy}</td>
                      <td className="num">{p.hausse}</td>
                      <td className="num">
                        {p.std}
                        <span className="fourchette">
                          {p.min} to {p.max}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="note-donnees">
              The average includes all deductibles and all models, which is why it is lower; it is an FOPH estimate. The “Standard” column gives the median of the insurers in the canton (standard model, with accident cover), then the lowest and the highest; Guide Assurance calculated it from the FOPH premium tables of 22.10.2026, rounded to 10 centimes. Premiums for each insurer are in our comparison tool and on priminfo.admin.ch.
            </p>
          </div>
        </section>

        <section className="itineraires" id="itineraires" aria-labelledby="itin-titre">
          <div className="wrap">
            <h2 className="titre" id="itin-titre">Where can you find the rules for your situation?</h2>
            <p className="texte">The guides below set them out situation by situation. Each one shows its update date and sources, and we review it when premiums or the law change.</p>
            <table>
              <thead>
                <tr>
                  <th scope="col">Guide</th>
                  <th scope="col">For</th>
                  <th scope="col" className="num">Reading</th>
                </tr>
              </thead>
              <tbody>
                {GUIDES.map((g) => (
                  <tr key={g.href}>
                    <td>
                      <a href={g.href}>{g.titre}</a>
                    </td>
                    <td className="pour">{g.pour}</td>
                    <td className="num">{g.lecture}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <SiteFooter locale="en" altPath="/" note="Premiums: FOPH." />
    </>
  );
}
