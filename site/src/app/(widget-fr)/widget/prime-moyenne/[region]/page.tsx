import type { Metadata } from "next";
import { WidgetPrime, regionsWidget } from "@/components/widget/widgets";
import { abs } from "@/lib/site";

export const dynamicParams = false;
export const generateStaticParams = () => regionsWidget().map((x) => ({ region: x.cle }));

export async function generateMetadata({ params }: { params: Promise<{ region: string }> }): Promise<Metadata> {
  const { region } = await params;
  return { title: { absolute: "Prime maladie médiane de la région (widget)" }, alternates: { canonical: abs(`/widget/prime-moyenne/${region}/`) } };
}

export default async function Page({ params }: { params: Promise<{ region: string }> }) {
  return <WidgetPrime l="fr" cle={(await params).region} />;
}
