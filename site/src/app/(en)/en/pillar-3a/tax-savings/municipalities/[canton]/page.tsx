import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CANTONS_3A, PageCanton3a, cantonDuSlug, metaCanton3a } from "@/components/donnees/page-communes-3a";
import { SLUG_CANTON_3A } from "@/lib/nav";

export const dynamicParams = false;
export function generateStaticParams() {
  return CANTONS_3A.map((c) => ({ canton: SLUG_CANTON_3A.en[c] }));
}

export async function generateMetadata({ params }: { params: Promise<{ canton: string }> }): Promise<Metadata> {
  const c = cantonDuSlug((await params).canton, "en");
  return c ? metaCanton3a(c, "en") : {};
}

export default async function Page({ params }: { params: Promise<{ canton: string }> }) {
  const c = cantonDuSlug((await params).canton, "en");
  if (!c) notFound();
  return <PageCanton3a canton={c} locale="en" />;
}
