import type { Metadata } from "next";
import { WidgetDelai } from "@/components/widget/widgets";
import { abs } from "@/lib/site";

const PATH = "/widget/delai-resiliation/";
export const metadata: Metadata = { title: { absolute: "Délai de résiliation LAMal (widget)" }, alternates: { canonical: abs(PATH) } };

export default function Page() {
  return <WidgetDelai l="fr" aujourdhuiIso={new Date().toISOString().slice(0, 10)} />;
}
