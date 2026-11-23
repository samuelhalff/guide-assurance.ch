import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuidePage } from "@/components/site/guide-page";
import { pageMetadata } from "@/lib/metadata";
import { OUTILS } from "@/lib/nav";
import { autreLangue, pageParSlug, toutesLesPages } from "@/lib/content/pages";
import { porteDePage } from "@/lib/demande";
import { CorpsAvecAppel } from "@/components/demande/corps-avec-appel";
import { PRODUITS_LIES, rubriqueDePage } from "@/lib/landing";

const RUBRIQUES = { particuliers: "Particuliers", entreprises: "Entreprises", situations: "Situations", legal: "Informations" } as const;
const OUTILS_LIES: Record<string, { href: string; titre: string; detail: string }> = {
  "simulateur-frontalier": { href: OUTILS.simulateur, titre: "Frontalier : LAMal ou assurance française ?", detail: "Simulateur, primes 2027" },
  "comparateur-primes": { href: OUTILS.comparateur, titre: "Comparer les primes LAMal 2027", detail: "Primes approuvées, de la plus basse à la plus haute" },
  "lettre-resiliation": { href: OUTILS.lettre, titre: "Lettre de résiliation", detail: "Date limite et lettre prête à imprimer" },
  "taux-3a": { href: OUTILS.taux3a, titre: "Comptes 3a : taux d’intérêt", detail: "17 banques, taux relevés sur leurs pages" },
  "economie-impot-3a": { href: OUTILS.impot3a, titre: "Économie d’impôt 3a", detail: "Suisse romande, barèmes 2026" },
  "somme-menage": { href: OUTILS.sommeMenage, titre: "Calculer la somme d’assurance ménage", detail: "Trois questions, méthodes Baloise et Zurich" },
  "garanties-pj": { href: OUTILS.garantiesPj, titre: "Protection juridique : ce que couvrent les contrats", detail: "12 contrats lus dans leurs CGA, sans classement" },
};

type Params = { slug: string[] };
const versSlug = (p: string[]) => `/${p.join("/")}/`;

export const dynamicParams = false;
export function generateStaticParams(): Params[] {
  return toutesLesPages().map((p) => ({ slug: p.slug.split("/").filter(Boolean) }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = pageParSlug(versSlug((await params).slug));
  if (!p) return {};
  const t = `${p.title} | Guide Assurance`;
  return pageMetadata({ title: t.length <= 60 ? t : p.title, description: p.description, path: p.slug });
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const p = pageParSlug(versSlug((await params).slug));
  if (!p) notFound();
  const parent = p.slug.startsWith("/entreprises/") && p.slug !== "/entreprises/" ? { name: "Entreprises", href: "/entreprises/" }
    : p.slug === "/assurance-maladie/primes/" ? { name: "Assurance maladie", href: "/assurance-maladie/" }
    : p.rubrique === "legal" ? null : { name: "Guides", href: "/guides/" };
  return (
    <GuidePage
      path={p.slug}
      titre={p.title}
      h1={p.h1}
      description={p.description}
      miettes={[{ name: "Accueil", href: "/" }, ...(parent ? [parent] : []), { name: p.h1 }]}
      majIso={p.updated}
      sources={p.sources.map((s) => ({ label: s.label, href: s.url }))}
      outilsLies={p.outils.map((o) => OUTILS_LIES[o]).filter(Boolean)}
      faq={p.faq}
      type={p.rubrique === "legal" ? "WebPage" : "Article"}
      rubrique={p.rubrique === "legal" ? undefined : rubriqueDePage(p.slug) ?? "guides"}
      porte={porteDePage(p.slug)}
      landing={p.landing}
      produitsLies={(p.landing ? (PRODUITS_LIES[p.slug] ?? []) : [])
        .map((s) => pageParSlug(s))
        .filter((x) => x !== undefined)
        .map((x) => ({ href: x.slug, titre: x.landing?.service ?? x.title }))}
      altPath={autreLangue(p.slug, "fr")}
      noteFooter={p.rubrique === "legal" ? undefined : `Information générale, ${RUBRIQUES[p.rubrique].toLowerCase()}. Votre contrat et la loi font foi.`}
    >
      <CorpsAvecAppel html={p.html} porte={porteDePage(p.slug)} locale="fr" />
    </GuidePage>
  );
}
