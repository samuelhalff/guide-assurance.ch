"use client";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { chargerApresAffichage } from "@/lib/charge-differee";
import { GTM_ID, MESURE_ACTIVE, memoriserAttribution, memoriserUtm } from "@/lib/analytics";
import { utmDepuis } from "@/lib/mesure-regles";

type Props = { locale?: "fr" | "en"; rouvrir?: boolean };

/* La mesure d'audience (bandeau, écouteurs GA4, Web Vitals) n'a rien à afficher dans le HTML initial : son code se
   charge une fois la page affichée (load, puis moment libre du navigateur, 3 s au plus), comme GTM et PostHog.
   Ce qui part tout de suite, à l'hydratation, sans attendre ce moment :
   - l'attribution au premier contact (arrivée, référent, UTM, gclid : écritures dans sessionStorage, sans réseau) ;
   - le lien « Cookies » du pied de page : un appui avant l'arrivée du code le charge aussitôt et le panneau s'ouvre dès
     qu'il est prêt.
   Les événements des outils (suivre) ne dépendent pas de ce module : ils attendent dans la file de lib/analytics.ts. */
export function MesureDiffere({ locale = "fr" }: { locale?: "fr" | "en" }) {
  const [Mesure, setMesure] = useState<ComponentType<Props> | null>(null);
  const [rouvrir, setRouvrir] = useState(false);
  const charger = useRef<() => void>(() => {});
  useEffect(() => {
    if (MESURE_ACTIVE) {
      memoriserAttribution();
      if (GTM_ID) memoriserUtm(utmDepuis(window.location.search));
    }
    charger.current = () => void import("@/components/site/mesure").then((m) => setMesure(() => m.Mesure));
    const surRouvrir = () => {
      setRouvrir(true);
      charger.current();
    };
    window.addEventListener("mesure:rouvrir", surRouvrir);
    const nettoyer = chargerApresAffichage(() => charger.current());
    return () => {
      window.removeEventListener("mesure:rouvrir", surRouvrir);
      nettoyer();
    };
  }, []);
  return Mesure ? <Mesure locale={locale} rouvrir={rouvrir} /> : null;
}
