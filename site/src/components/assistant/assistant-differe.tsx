"use client";
import { useEffect, useState, type ComponentType } from "react";
import { chargerApresAffichage } from "@/lib/charge-differee";

/* L'assistant (panneau, formulaire de rappel, Turnstile : une trentaine de Ko compressés) n'a rien à afficher dans le
   HTML initial : son bouton n'apparaît qu'après le premier écran. Son code se charge donc une fois la page affichée
   (après l'événement load, quand le navigateur est au repos), ou tout de suite si le visiteur agit avant ou arrive
   avec #assistant. Le bouton est ensuite monté par le composant Assistant d'origine, sans changement. */
type Props = { locale?: "fr" | "en" };

export function AssistantDiffere({ locale = "fr" }: Props) {
  const [Assistant, setAssistant] = useState<ComponentType<Props> | null>(null);
  useEffect(
    () =>
      chargerApresAffichage(() => void import("@/components/assistant/assistant").then((m) => setAssistant(() => m.Assistant)), {
        interaction: true,
        immediat: window.location.hash === "#assistant",
      }),
    [],
  );
  return Assistant ? <Assistant locale={locale} /> : null;
}
