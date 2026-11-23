import { notFound } from "next/navigation";
import { PageBarometre, metadataBarometre } from "@/components/barometre/page-barometre";
import { CANTONS_BAROMETRE, cantonParSlug, slugCanton } from "@/lib/barometre";

export const dynamicParams = false;
export const generateStaticParams = () => CANTONS_BAROMETRE.map((c) => ({ canton: slugCanton(c.code, "fr") }));

export async function generateMetadata({ params }: { params: Promise<{ canton: string }> }) {
  const c = cantonParSlug((await params).canton, "fr");
  return c ? metadataBarometre("fr", c.code) : {};
}

export default async function Page({ params }: { params: Promise<{ canton: string }> }) {
  const c = cantonParSlug((await params).canton, "fr");
  if (!c) notFound();
  return <PageBarometre l="fr" code={c.code} />;
}
