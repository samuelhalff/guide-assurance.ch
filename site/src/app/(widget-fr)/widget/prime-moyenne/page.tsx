import type { Metadata } from "next";
import { WidgetPrime } from "@/components/widget/widgets";
import { abs } from "@/lib/site";

const PATH = "/widget/prime-moyenne/";
export const metadata: Metadata = { title: { absolute: "Prime maladie moyenne par canton (widget)" }, alternates: { canonical: abs(PATH) } };

export default function Page() {
  return <WidgetPrime l="fr" />;
}
