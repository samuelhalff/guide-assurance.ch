import type { Metadata } from "next";
import { WidgetTaux3a } from "@/components/widget/widgets";
import { abs } from "@/lib/site";

const PATH = "/widget/taux-3a/";
export const metadata: Metadata = { title: { absolute: "Taux des comptes 3a (widget)" }, alternates: { canonical: abs(PATH) } };

export default function Page() {
  return <WidgetTaux3a l="fr" />;
}
