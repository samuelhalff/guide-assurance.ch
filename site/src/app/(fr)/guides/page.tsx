import type { Metadata } from "next";
import Link from "next/link";
import { GuidePage, type QuestionFaq } from "@/components/site/guide-page";
import { pageMetadata } from "@/lib/metadata";
import { dateIndexGuides, lecture, toutesLesPages, type Rubrique } from "@/lib/content/pages";
import { ESPACE_FINE as N } from "@/lib/nombres";

const PATH = "/guides/";
const TITRE = "Tous les guides d’assurance";
const DESCRIPTION = "Les guides datés et sourcés de Guide Assurance sur l’assurance maladie, l’accident, le 3e pilier, le ménage, l’auto, la LPP et les assurances d’entreprise.";
export const metadata: Metadata = pageMetadata({ title: `${TITRE} | Guide Assurance`, description: DESCRIPTION, path: PATH });


/* Questions fréquentes (affichées sous la liste et reprises telles quelles dans le nœud FAQPage par GuidePage).
   Faits tirés des guides : assurance maladie, nouveaux arrivants, assurance accident, auto, bâtiment, ménage. */
const FAQ: QuestionFaq[] = [
  {
    q: `Les guides sont-ils à jour${N}?`,
    a: "Chaque guide indique en tête sa date de mise à jour, et nous le revoyons quand les primes ou la loi changent. Les montants portent leur année, comme les primes 2027 ou le plafond 3a 2027.",
  },
  {
    q: `D’où viennent les informations des guides${N}?`,
    a: "Elles viennent des textes et des chiffres officiels, surtout des lois fédérales publiées sur Fedlex, des données de l’OFSP et de l’OFAS et des lois cantonales. Chaque guide liste ses sources sous sa date de mise à jour, avec un lien vers chacune.",
  },
  {
    q: `Les guides recommandent-ils un assureur${N}?`,
    a: "Non, aucun guide ne recommande d’assureur ni de contrat. Ils expliquent les règles et les délais. Pour comparer des offres, le comparateur donne les primes LAMal 2027 de votre région, et un conseiller peut vous rappeler si vous le demandez.",
  },
  {
    q: `Quelles assurances sont obligatoires en Suisse${N}?`,
    a: "L’assurance maladie de base (LAMal) est obligatoire pour toute personne domiciliée en Suisse. Un salarié est assuré contre les accidents par son employeur (art. 1a LAA), et un véhicule à moteur doit être couvert par une responsabilité civile d’au moins 5\u00a0millions de francs par événement (art. 3 OAV). En Suisse romande, l’assurance du bâtiment est obligatoire à Vaud, à Fribourg, à Neuchâtel, dans le Jura et dans le Jura bernois, et celle du mobilier à Vaud, à Fribourg et dans le Jura.",
  },
  {
    q: `Quel guide lire en arrivant en Suisse${N}?`,
    a: `Le guide «${N}S’installer en Suisse${N}» réunit les assurances des premiers mois. L’assurance maladie de base se conclut dans les 3 mois qui suivent la prise de domicile (art. 3, al. 1, LAMal)${N}; dans ce délai, elle vous couvre depuis le jour de votre arrivée (art. 5, al. 1, LAMal).`,
  },
];

const GROUPES: { id: Rubrique; titre: string }[] = [
  { id: "particuliers", titre: "Particuliers" },
  { id: "situations", titre: "Situations" },
  { id: "entreprises", titre: "Entreprises" },
];

export default function Guides() {
  const pages = toutesLesPages();
  return (
    <GuidePage
      rubrique="guides"
      path={PATH}
      titre={TITRE}
      h1="Tous les guides"
      description={DESCRIPTION}
      chapo="Chaque guide indique sa date de mise à jour et ses sources officielles. Aucun ne recommande d’assureur."
      miettes={[{ name: "Accueil", href: "/" }, { name: "Guides" }]}
      faq={FAQ}
      majIso={dateIndexGuides("fr")}
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
