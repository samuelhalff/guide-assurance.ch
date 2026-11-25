"use client";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { chargerApresAffichage } from "@/lib/charge-differee";
import { GTM_ID, MESURE_ACTIVE, memoriserAttribution, memoriserUtm, suivre, versGA } from "@/lib/analytics";
import { extensionTelechargement, utmDepuis } from "@/lib/mesure-regles";

type Props = { locale?: "fr" | "en"; rouvrir?: boolean };

/* La mesure d'audience (bandeau, écouteurs GA4, Web Vitals) n'a rien à afficher dans le HTML initial : son code se
   charge une fois la page affichée (load, puis moment libre du navigateur, 3 s au plus), comme GTM et PostHog.
   Ce qui part tout de suite, à l'hydratation, sans attendre ce moment :
   - l'attribution au premier contact (arrivée, référent, UTM, gclid : écritures dans sessionStorage, sans réseau) ;
   - le lien « Cookies » du pied de page : un appui avant l'arrivée du code le charge aussitôt et le panneau s'ouvre dès
     qu'il est prêt ;
   - les écouteurs délégués des liens sortants, téléchargements, questions de FAQ et copies de code (quelques lignes) :
     une interaction avant l'arrivée du module est mesurée comme les autres (dataLayer, file de lib/analytics.ts).
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
    const sansEcoute = MESURE_ACTIVE ? ecouterInteractions() : () => {};
    return () => {
      window.removeEventListener("mesure:rouvrir", surRouvrir);
      nettoyer();
      sansEcoute();
    };
  }, []);
  return Mesure ? <Mesure locale={locale} rouvrir={rouvrir} /> : null;
}

/* Liens sortants et téléchargements (GA4), questions de FAQ ouvertes et copie manuelle du code d'un widget : écouteurs
   délégués sur le document, posés une fois. Aucune valeur saisie : adresses de liens, index, identifiant du widget. */
function ecouterInteractions(): () => void {
  const clic = (e: MouseEvent) => {
    const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a) return;
    let u: URL;
    try {
      u = new URL(a.href, window.location.href);
    } catch {
      return;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") return;
    const ext = extensionTelechargement(u.pathname);
    if (ext) versGA("file_download", { file_extension: ext, file_name: u.pathname.split("/").pop() ?? "", link_url: u.origin + u.pathname });
    else if (u.hostname !== window.location.hostname) versGA("click", { link_domain: u.hostname, link_url: u.origin + u.pathname, outbound: true });
  };
  /* toggle ne remonte pas : écouté en phase de capture. */
  const ouverture = (e: Event) => {
    const d = e.target as HTMLDetailsElement;
    if (!(d instanceof HTMLDetailsElement) || !d.open) return;
    const bloc = d.closest(".guide-faq, .faq, [data-faq]");
    if (!bloc) return;
    const index = Array.from(bloc.querySelectorAll("details")).indexOf(d);
    suivre("faq_ouverte", { question_index: index + 1, page: window.location.pathname });
  };
  const copie = (e: ClipboardEvent) => {
    const c = (e.target as Element | null)?.closest?.(".code-widget") as HTMLTextAreaElement | null;
    if (c) suivre("code_integration_copie", { widget: c.id.replace(/^code-/, ""), methode: "manuel" });
  };
  document.addEventListener("click", clic, true);
  document.addEventListener("toggle", ouverture, true);
  document.addEventListener("copy", copie, true);
  return () => {
    document.removeEventListener("click", clic, true);
    document.removeEventListener("toggle", ouverture, true);
    document.removeEventListener("copy", copie, true);
  };
}
