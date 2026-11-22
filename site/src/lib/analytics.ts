/* Mesure d'audience, même modèle qu'ark-fid.ch (Google Consent Mode v2, valeurs par défaut par région) :
   - UE/EEE et Royaume-Uni : tout refusé tant que le visiteur n'a pas accepté (opt-in) ;
   - Suisse : mesure d'audience active d'office, signaux publicitaires refusés jusqu'à acceptation (opt-out) ;
   - reste du monde : accordé d'office, le visiteur peut refuser.
   Un choix enregistré l'emporte toujours. GTM (GTM_ID) porte les balises Google ; il se charge d'office et
   respecte l'état de consentement. PostHog (EU) reste sans cookie tant que le visiteur n'a pas accepté
   (la région n'est pas connue côté navigateur). Les événements ne portent jamais de donnée saisie. */
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "";
export const POSTHOG_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_TOKEN ?? "";
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
export const MESURE_ACTIVE = Boolean(GTM_ID || POSTHOG_TOKEN);
/* Le bandeau existe dès que des cookies Google peuvent être déposés. */
export const CONSENTEMENT_REQUIS = Boolean(GTM_ID);

export const CLE = "ga-consentement";

const EEE_RU = ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IS","IE","IT","LV","LI","LT","LU","MT","NL","NO","PL","PT","RO","SK","SI","ES","SE","GB"];

/* Script en ligne du <head> : états de consentement par défaut et choix enregistré, posés tout de suite, avant
   gtm.js. Seule l'injection de gtm.js attend la fin du chargement de la page puis un moment libre (requestIdleCallback,
   3 s au plus) ; les événements poussés entre-temps restent dans dataLayer et GTM les lit à son arrivée. */
export function amorceGTM(): string {
  if (!GTM_ID) return "";
  const refuse = { ad_storage: "denied", analytics_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" };
  const accorde = { ad_storage: "granted", analytics_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" };
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',${JSON.stringify({ ...refuse, region: EEE_RU, wait_for_update: 500 })});
gtag('consent','default',${JSON.stringify({ ...refuse, analytics_storage: "granted", region: ["CH"] })});
gtag('consent','default',${JSON.stringify(accorde)});
gtag('set','ads_data_redaction',true);
try{var c=localStorage.getItem(${JSON.stringify(CLE)});if(c==='oui')gtag('consent','update',${JSON.stringify(accorde)});else if(c==='non')gtag('consent','update',${JSON.stringify(refuse)});}catch(e){}
gtag('js',new Date());
(function(w,d,l,i){var go=function(){w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var j=d.createElement('script');j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;d.head.appendChild(j);};var later=function(){(w.requestIdleCallback||function(f){setTimeout(f,1)})(go,{timeout:3000});};if(d.readyState==='complete')later();else w.addEventListener('load',later,{once:true});})(window,document,'dataLayer',${JSON.stringify(GTM_ID)});`;
}

export type Evenement =
  | "situation_choisie"
  | "simulateur_utilise"
  | "lettre_copiee"
  | "lettre_imprimee"
  | "comparateur_utilise"
  /* Calculateur « Économie d'impôt 3a » : une fois, au premier résultat, sans aucune valeur saisie. */
  | "impot3a_utilise"
  /* Formulaire de l'accueil (NPA + année) envoyé vers le comparateur, sans aucune valeur saisie. */
  | "comparateur_accueil"
  /* Même formulaire en tête d'une page produit (assurance maladie, primes, nouveaux arrivants), sans aucune valeur saisie. */
  | "comparateur_produit"
  | "outil_partage"
  /* Tunnel de demande (PostHog seulement, jamais de valeur saisie) : voir FUNNEL_EVENTS (shared/demande). */
  | "demande_ouverte"
  | "demande_etape"
  | "demande_envoyee"
  /* Clic sur un appel « Être rappelé » ({ emplacement: tete | accueil | guide | comparateur | produit | outil3a | lettre | frontalier }), avant le formulaire court. */
  | "rappel_ouvert"
  /* Appel « Être rappelé » vu à l'écran ({ emplacement }), une fois par emplacement et par page, sans aucune valeur saisie. */
  | "rappel_vu"
  /* Assistant (PostHog seulement, jamais de contenu de la conversation ni de dataLayer). */
  | "assistant_ouvert"
  | "assistant_message"
  | "assistant_vers_demande";

type Props = Record<string, string | number | boolean>;
type PH = {
  capture: (e: string, p?: Props, o?: { transport?: "sendBeacon"; send_instantly?: boolean }) => void;
  set_config: (c: Record<string, unknown>) => void;
};
type W = { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };

let ph: PH | null = null;
const file: [Evenement, Props | undefined][] = [];
/* Faux sur le formulaire de demande (mise en page (demande), sans GTM) : rien ne part vers le dataLayer. */
let versDataLayer = true;

export function suivre(e: Evenement, p?: Props, avantDepart = false) {
  if (!MESURE_ACTIVE || typeof window === "undefined") return;
  /* avantDepart : la page va changer, l'événement part tout de suite par sendBeacon. */
  if (ph) ph.capture(e, p, avantDepart ? { transport: "sendBeacon", send_instantly: true } : undefined);
  else if (POSTHOG_TOKEN) file.push([e, p]);
  if (versDataLayer && !e.startsWith("assistant_")) {
    const w = window as unknown as W;
    w.dataLayer?.push({ event: e, ...(p ?? {}) });
    /* Commande gtag : la balise Google chargée par GTM la transmet à GA4 sans balise d'événement à configurer dans GTM. */
    w.gtag?.("event", e, p ?? {});
  }
}

/* Formulaire de demande : PostHog seul, sans cookie (mémoire), et jamais de dataLayer. */
export function demarrerMesureDemande() {
  versDataLayer = false;
  void demarrerPostHog(false);
}

export type Choix = "oui" | "non" | null;
export function lireChoix(): Choix {
  try {
    const v = localStorage.getItem(CLE);
    return v === "oui" || v === "non" ? v : null;
  } catch {
    return null;
  }
}

/* Enregistre le choix et met à jour Google Consent Mode sans recharger la page. */
export function ecrireChoix(c: "oui" | "non") {
  try {
    localStorage.setItem(CLE, c);
  } catch {
    /* navigation privée : le choix vaut pour la page */
  }
  const v = c === "oui" ? "granted" : "denied";
  (window as unknown as W).gtag?.("consent", "update", { ad_storage: v, analytics_storage: v, ad_user_data: v, ad_personalization: v });
}

/* Après l'affichage : fin du chargement de la page, puis un moment libre (3 s au plus). Les événements attendent dans `file`. */
export function apresChargement(f: () => void) {
  if (typeof window === "undefined") return;
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  const plusTard = () => (w.requestIdleCallback ? w.requestIdleCallback(f, { timeout: 3000 }) : setTimeout(f, 1));
  if (document.readyState === "complete") plusTard();
  else window.addEventListener("load", plusTard, { once: true });
}

let persistanceVoulue: boolean | null = null;
let chargement: Promise<void> | null = null;

export async function demarrerPostHog(persistant: boolean) {
  if (!POSTHOG_TOKEN || typeof window === "undefined") return;
  persistanceVoulue = persistant;
  if (ph) {
    ph.set_config({ persistence: persistant ? "localStorage+cookie" : "memory" });
    return;
  }
  /* Un seul chargement même si le visiteur choisit pendant qu'il est en cours ; le dernier choix l'emporte. */
  if (!chargement) chargement = initPostHog(persistant);
  await chargement;
  const p = ph as PH | null;
  if (p && persistanceVoulue !== persistanceInit) {
    persistanceInit = persistanceVoulue;
    p.set_config({ persistence: persistanceVoulue ? "localStorage+cookie" : "memory" });
  }
}

let persistanceInit: boolean | null = null;
async function initPostHog(persistant: boolean) {
  persistanceInit = persistant;
  const { default: posthog } = await import("posthog-js");
  posthog.init(POSTHOG_TOKEN, {
    api_host: POSTHOG_HOST,
    ui_host: "https://eu.posthog.com",
    persistence: persistant ? "localStorage+cookie" : "memory",
    autocapture: false,
    capture_pageview: "history_change",
    capture_pageleave: true,
    disable_session_recording: true,
    disable_surveys: true,
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    property_denylist: ["$ip"],
    respect_dnt: true,
  });
  ph = posthog as unknown as PH;
  for (const [e, p] of file.splice(0)) ph.capture(e, p);
}
