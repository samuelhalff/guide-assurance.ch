import { notFound } from "next/navigation";
import { PageBarometre, metadataBarometre } from "@/components/barometre/page-barometre";
import { CANTONS_BAROMETRE, cantonParSlug, slugCanton } from "@/lib/barometre";

export const dynamicParams = false;
export const generateStaticParams = () => CANTONS_BAROMETRE.map((c) => ({ canton: slugCanton(c.code, "en") }));

export async function generateMetadata({ params }: { params: Promise<{ canton: string }> }) {
  const c = cantonParSlug((await params).canton, "en");
  return c ? metadataBarometre("en", c.code) : {};
}

export default async function Page({ params }: { params: Promise<{ canton: string }> }) {
  const c = cantonParSlug((await params).canton, "en");
  if (!c) notFound();
  return <PageBarometre l="en" code={c.code} />;
}
