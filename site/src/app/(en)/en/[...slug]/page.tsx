import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuidePage } from "@/components/site/guide-page";
import { pageMetadata } from "@/lib/metadata";
import { OUTILS_EN } from "@/lib/nav";
import { autreLangue, equivalent, pageParSlug, toutesLesPages } from "@/lib/content/pages";
import { porteDePage } from "@/lib/demande";
import { PRODUITS_LIES, rubriqueDePage } from "@/lib/landing";

/* Guides in English (content/en/*.md), served under /en/. Each file names its French page (`fr`). */
const RUBRIQUES = { particuliers: "personal insurance", entreprises: "business insurance", situations: "situations", legal: "information" } as const;
const OUTILS_LIES: Record<string, { href: string; titre: string; detail: string }> = {
  "simulateur-frontalier": { href: OUTILS_EN.simulateur, titre: "Cross-border worker: LAMal or French health insurance?", detail: "Calculator, 2027 premiums" },
  "comparateur-primes": { href: OUTILS_EN.comparateur, titre: "Compare 2027 LAMal premiums", detail: "Approved premiums, lowest to highest" },
  "lettre-resiliation": { href: OUTILS_EN.lettre, titre: "Cancellation letter", detail: "Deadline and a letter ready to print" },
  "taux-3a": { href: OUTILS_EN.taux3a, titre: "Pillar 3a accounts: interest rates", detail: "17 banks, rates read on their own pages" },
  "economie-impot-3a": { href: OUTILS_EN.impot3a, titre: "Pillar 3a tax savings", detail: "French-speaking Switzerland, 2026 tax scales" },
};

type Params = { slug: string[] };
const versSlug = (p: string[]) => `/en/${p.join("/")}/`;

export const dynamicParams = false;
export function generateStaticParams(): Params[] {
  return toutesLesPages("en").map((p) => ({ slug: p.slug.replace(/^\/en\//, "").split("/").filter(Boolean) }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = pageParSlug(versSlug((await params).slug), "en");
  if (!p) return {};
  /* Brand suffix only while the whole title stays within 60 characters. */
  const title = `${p.title} | Guide Assurance`.length <= 60 ? `${p.title} | Guide Assurance` : p.title;
  return pageMetadata({ title, description: p.description, path: p.slug, locale: "en" });
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const p = pageParSlug(versSlug((await params).slug), "en");
  if (!p) notFound();
  const parent = p.slug.startsWith("/en/business/") && p.slug !== "/en/business/" ? { name: "Business", href: "/en/business/" }
    : p.slug === "/en/health-insurance/premiums/" ? { name: "Health insurance", href: "/en/health-insurance/" }
    : p.rubrique === "legal" ? null : { name: "Guides", href: "/en/guides/" };
  return (
    <GuidePage
      locale="en"
      path={p.slug}
      altPath={autreLangue(p.slug, "en")}
      titre={p.title}
      h1={p.h1}
      description={p.description}
      miettes={[{ name: "Home", href: "/en/" }, ...(parent ? [parent] : []), { name: p.h1 }]}
      majIso={p.updated}
      sources={p.sources.map((s) => ({ label: s.label, href: s.url }))}
      outilsLies={p.outils.map((o) => OUTILS_LIES[o]).filter(Boolean)}
      faq={p.faq}
      type={p.rubrique === "legal" ? "WebPage" : "Article"}
      rubrique={p.landing ? rubriqueDePage(p.fr) : undefined}
      porte={porteDePage(p.fr)}
      landing={p.landing}
      produitsLies={(p.landing && p.fr ? (PRODUITS_LIES[p.fr] ?? []) : [])
        .map((s) => equivalent(s, "fr"))
        .map((s) => (s ? pageParSlug(s, "en") : undefined))
        .filter((x) => x !== undefined)
        .map((x) => ({ href: x.slug, titre: x.landing?.service ?? x.title }))}
      noteFooter={p.rubrique === "legal" ? undefined : `General information, ${RUBRIQUES[p.rubrique]}. Your contract and the law prevail.`}
    >
      <div dangerouslySetInnerHTML={{ __html: p.html }} />
    </GuidePage>
  );
}
