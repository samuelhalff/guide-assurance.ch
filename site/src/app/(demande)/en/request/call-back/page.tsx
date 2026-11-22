import type { Metadata } from "next";
import { FormulaireRappel } from "@/components/demande/formulaire-rappel";

export const metadata: Metadata = {
  title: { absolute: "Call me back | Guide Assurance" },
  description: "Leave your name and phone number, and an adviser from a partner broker will call you back to go through your situation, at no cost and with no commitment.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <FormulaireRappel locale="en" />;
}
