import type { Metadata } from "next";
import Link from "next/link";
import { GuidePage, type QuestionFaq } from "@/components/site/guide-page";
import { pageMetadata } from "@/lib/metadata";
import { dateIndexGuides, lecture, toutesLesPages, type Rubrique } from "@/lib/content/pages";

const PATH = "/en/guides/";
const TITRE = "All insurance guides";
const DESCRIPTION = "Dated, sourced guides from Guide Assurance on health, accident, pillar 3a, household, car, occupational pension and business insurance in Switzerland.";
export const metadata: Metadata = pageMetadata({ title: `${TITRE} | Guide Assurance`, description: DESCRIPTION, path: PATH, locale: "en" });

/* Frequently asked questions (shown under the list and repeated word for word in the FAQPage node by GuidePage). */
const FAQ: QuestionFaq[] = [
  {
    q: "Are the guides up to date?",
    a: "Each guide shows its update date at the top, and we review it when premiums or the law change. Amounts carry their year, such as the 2027 premiums or the 2027 pillar 3a limit.",
  },
  {
    q: "Where does the information in the guides come from?",
    a: "It comes from official texts and figures, mainly federal laws published on Fedlex, FOPH and FSIO data, and cantonal laws. Each guide lists its sources under its update date, with a link to each one.",
  },
  {
    q: "Do the guides recommend an insurer?",
    a: "No guide recommends an insurer or a policy. They explain the rules and the deadlines. To compare offers, the comparison tool gives the 2027 LAMal premiums for your region, and an adviser can call you back if you ask.",
  },
  {
    q: "Which insurance is compulsory in Switzerland?",
    a: "Basic health insurance (LAMal) is compulsory for everyone living in Switzerland. Employees are insured against accidents by their employer (art. 1a LAA), and a motor vehicle must carry liability cover of at least CHF 5 million per event (art. 3 OAV). In French-speaking Switzerland, building insurance is compulsory in Vaud, Fribourg, Neuchâtel, Jura and the Bernese Jura, and contents insurance in Vaud, Fribourg and Jura.",
  },
  {
    q: "Which guide should I read when moving to Switzerland?",
    a: "The guide “Moving to Switzerland: your insurance in the first three months” covers the first deadlines. Basic health insurance must be taken out within 3 months of taking up residence (art. 3 para. 1 LAMal); within that period, it covers you from the day you arrived (art. 5 para. 1 LAMal).",
  },
];

const GROUPES: { id: Rubrique; titre: string }[] = [
  { id: "particuliers", titre: "Personal insurance" },
  { id: "situations", titre: "Situations" },
  { id: "entreprises", titre: "Business" },
];

export default function Guides() {
  const pages = toutesLesPages("en");
  return (
    <GuidePage
      rubrique="guides"
      locale="en"
      path={PATH}
      altPath="/guides/"
      titre={TITRE}
      h1="All guides"
      description={DESCRIPTION}
      chapo="Each guide shows its update date and its official sources. None of them recommends an insurer."
      miettes={[{ name: "Home", href: "/en/" }, { name: "Guides" }]}
      faq={FAQ}
      majIso={dateIndexGuides("en")}
    >
      {GROUPES.map((g) => (
        <section key={g.id} aria-labelledby={`g-${g.id}`} className="liste-guides">
          <h2 id={`g-${g.id}`}>{g.titre}</h2>
          <ul>
            {pages.filter((p) => p.rubrique === g.id).map((p) => (
              <li key={p.slug}>
                <Link href={p.slug}>{p.h1}</Link> <small>{lecture(p.mots)}</small>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </GuidePage>
  );
}
