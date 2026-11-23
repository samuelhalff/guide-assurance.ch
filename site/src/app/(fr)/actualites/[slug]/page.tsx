import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageActualite, metadataArticle } from "@/components/actualites/page-actualite";
import { articlePublie, articlesPublies, VIDE } from "@/lib/actualites";

type Params = { slug: string };
export const dynamicParams = false;
/* Articles publiés seulement. L'export statique refuse une liste vide : paramètre factice sans page (404). */
export function generateStaticParams(): Params[] {
  const xs = articlesPublies("fr").map((a) => ({ slug: a.slug }));
  return xs.length ? xs : [{ slug: VIDE }];
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const a = articlePublie("fr", (await params).slug);
  return a ? metadataArticle(a) : { robots: { index: false, follow: false } };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const a = articlePublie("fr", (await params).slug);
  if (!a) notFound();
  return <PageActualite a={a} />;
}
