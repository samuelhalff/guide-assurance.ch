import type { Metadata } from "next";
import { WidgetTaux3a } from "@/components/widget/widgets";
import { abs } from "@/lib/site";

const PATH = "/widget/en/3a-rates/";
export const metadata: Metadata = { title: { absolute: "Pillar 3a interest rates (widget)" }, alternates: { canonical: abs(PATH) } };

export default function Page() {
  return <WidgetTaux3a l="en" />;
}
