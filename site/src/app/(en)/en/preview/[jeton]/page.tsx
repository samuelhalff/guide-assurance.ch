import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageActualite, metadataApercu } from "@/components/actualites/page-actualite";
import { ListeActualites } from "@/components/actualites/liste-actualites";
import { apercus, brouillons, cheminApercu, VIDE } from "@/lib/actualites";

/* Aperçu des brouillons (jamais listé, noindex, interdit dans robots.txt). Adresse = jeton HMAC (lib/actualites.ts). */
type Params = { jeton: string };
export const dynamicParams = false;
export function generateStaticParams(): Params[] {
  const xs = apercus("en").map((x) => ({ jeton: x.jeton }));
  return xs.length ? xs : [{ jeton: VIDE }];
}
const trouver = (jeton: string) => apercus("en").find((x) => x.jeton === jeton);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const x = trouver((await params).jeton);
  return metadataApercu(x?.article?.title ?? "brouillons");
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const x = trouver((await params).jeton);
  if (!x) notFound();
  if (x.index) {
    const tous = [...brouillons("fr"), ...brouillons("en")];
    return <ListeActualites l="en" articles={tous} lien={(a) => cheminApercu(a.locale, a.slug)} apercu="Brouillons en attente de votre accord (FR et EN). Rien n’est publié ni indexé." />;
  }
  return <PageActualite a={x.article!} apercu />;
}
