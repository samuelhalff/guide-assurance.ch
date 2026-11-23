import type { Metadata } from "next";
import { WidgetDelai } from "@/components/widget/widgets";
import { abs } from "@/lib/site";

const PATH = "/widget/en/cancellation-deadline/";
export const metadata: Metadata = { title: { absolute: "LAMal cancellation deadline (widget)" }, alternates: { canonical: abs(PATH) } };

export default function Page() {
  return <WidgetDelai l="en" aujourdhuiIso={new Date().toISOString().slice(0, 10)} />;
}
