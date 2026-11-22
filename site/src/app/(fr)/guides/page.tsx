import type { Metadata } from "next";
import Link from "next/link";
import { GuidePage } from "@/components/site/guide-page";
import { pageMetadata } from "@/lib/metadata";
import { MAJ_ISO } from "@/lib/site";
import { lecture, toutesLesPages, type Rubrique } from "@/lib/content/pages";

const PATH = "/guides/";
const TITRE = "Tous les guides d’assurance";
const DESCRIPTION = "Les guides datés et sourcés de Guide Assurance sur l’assurance maladie, l’accident, le 3e pilier, le ménage, l’auto, la LPP et les assurances d’entreprise.";
export const metadata: Metadata = pageMetadata({ title: `${TITRE} | Guide Assurance`, description: DESCRIPTION, path: PATH });

const GROUPES: { id: Rubrique; titre: string }[] = [
  { id: "particuliers", titre: "Particuliers" },
  { id: "situations", titre: "Situations" },
  { id: "entreprises", titre: "Entreprises" },
];

export default function Guides() {
  const pages = toutesLesPages();
  return (
    <GuidePage
      path={PATH}
      titre={TITRE}
      h1="Tous les guides"
      description={DESCRIPTION}
      chapo="Chaque guide indique sa date de mise à jour et ses sources officielles. Aucun ne recommande d’assureur."
      miettes={[{ name: "Accueil", href: "/" }, { name: "Guides" }]}
      majIso={MAJ_ISO}
      altPath="/en/guides/"
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
