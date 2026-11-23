import type { Metadata } from "next";
import { WidgetPrime } from "@/components/widget/widgets";
import { abs } from "@/lib/site";

const PATH = "/widget/en/average-premium/";
export const metadata: Metadata = { title: { absolute: "Average health premium by canton (widget)" }, alternates: { canonical: abs(PATH) } };

export default function Page() {
  return <WidgetPrime l="en" />;
}
