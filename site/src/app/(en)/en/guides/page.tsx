import type { Metadata } from "next";
import Link from "next/link";
import { GuidePage } from "@/components/site/guide-page";
import { pageMetadata } from "@/lib/metadata";
import { MAJ_ISO } from "@/lib/site";
import { lecture, toutesLesPages, type Rubrique } from "@/lib/content/pages";

const PATH = "/en/guides/";
const TITRE = "All insurance guides";
const DESCRIPTION = "Dated, sourced guides from Guide Assurance on health, accident, pillar 3a, household, car, occupational pension and business insurance in Switzerland.";
export const metadata: Metadata = pageMetadata({ title: `${TITRE} | Guide Assurance`, description: DESCRIPTION, path: PATH, locale: "en" });

const GROUPES: { id: Rubrique; titre: string }[] = [
  { id: "particuliers", titre: "Personal insurance" },
  { id: "situations", titre: "Situations" },
  { id: "entreprises", titre: "Business" },
];

export default function Guides() {
  const pages = toutesLesPages("en");
  return (
    <GuidePage
      locale="en"
      path={PATH}
      altPath="/guides/"
      titre={TITRE}
      h1="All guides"
      description={DESCRIPTION}
      chapo="Each guide shows its update date and its official sources. None of them recommends an insurer."
      miettes={[{ name: "Home", href: "/en/" }, { name: "Guides" }]}
      majIso={MAJ_ISO}
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
