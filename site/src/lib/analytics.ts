/* Mesure d'audience (Google Consent Mode v2 ; règles dans lib/mesure-regles.ts). Décision de Sam du 23.11.2026, prise en
   connaissance du risque RGPD pour l'UE : partout, la mesure est accordée d'office (signaux publicitaires refusés tant qu'il n'y a pas de publicité, 24.11.2026) ; ignorer le
   bandeau vaut acceptation, seul « Refuser » change cela. Un choix enregistré l'emporte toujours. GTM (GTM_ID) porte les
   balises Google ; il se charge d'office et respecte l'état de consentement. PostHog (EU) : persistant et avec
   enregistrement de session sauf refus ; en mémoire, sans enregistrement, après un refus.
   Jamais de valeur saisie, jamais de contenu de l'assistant, jamais d'enregistrement sur le formulaire de demande. */
import { apresChargement, chargerApresAffichage } from "@/lib/charge-differee";
export { apresChargement };
import { ACCORDE, CLE_INTERNE, REFUSE, attributionDepuis, attributionLue, persistantParDefaut, proprietesConversion, replayAutorise, scriptAmorce, type Choix } from "@/lib/mesure-regles";
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "";
export const POSTHOG_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_TOKEN ?? "";
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
export const MESURE_ACTIVE = Boolean(GTM_ID || POSTHOG_TOKEN);
/* Le bandeau existe dès que des cookies Google peuvent être déposés. */
export const CONSENTEMENT_REQUIS = Boolean(GTM_ID);

export const CLE = "ga-consentement";

/* Script en ligne du <head> : voir scriptAmorce. */
export function amorceGTM(): string {
  return scriptAmorce(GTM_ID, CLE);
}

export type Evenement =
  | "situation_choisie"
  | "simulateur_utilise"
  | "lettre_copiee"
  | "lettre_imprimee"
  | "comparateur_utilise"
  /* Calculateur « Économie d'impôt 3a » : une fois, au premier résultat, sans aucune valeur saisie. */
  | "impot3a_utilise"
  /* Liste « Taux des comptes de libre passage » : premier changement de tri ou premier avoir saisi (une fois par page), sans aucune valeur. */
  | "taux_libre_passage_utilise"
  /* Formulaire de l'accueil (NPA + année) envoyé vers le comparateur, sans aucune valeur saisie. */
  /* Calculateur de la somme d'assurance ménage : une fois, au premier changement de réponse ; « Affiner » ouvert. Aucune valeur saisie. */
  | "somme_menage_utilise"
  /* Primes UE/AELE/UK : une fois, au premier changement de choix. Aucune valeur choisie n'est envoyée. */
  | "primes_ue_utilise"
  /* Subsides d'assurance maladie : une fois, au premier changement de réponse. Aucune valeur saisie n'est envoyée. */
  | "subsides_utilise"
  | "somme_menage_affiner"
  /* Tableau des garanties de protection juridique : un domaine choisi dans le filtre (une fois par page), sans autre donnée. */
  | "garanties_pj_filtre"
  /* Tableau « Caisses maladie en chiffres » : premier changement de canton ou de tri (une fois par page), sans autre donnée. */
  | "caisses_chiffres_utilise"
  | "comparateur_accueil"
  /* Même formulaire en tête d'une page produit (assurance maladie, primes, nouveaux arrivants), sans aucune valeur saisie. */
  | "comparateur_produit"
  | "outil_partage"
  /* Fichier d'agenda .ics créé dans le navigateur ({ type: lamal | semestre | 3a | echeances | lettre_lamal | lettre_lca | contrats }), aucune date ni valeur saisie. */
  | "ics_telecharge"
  /* Tunnel de demande (PostHog seulement, jamais de valeur saisie) : voir FUNNEL_EVENTS (shared/demande). */
  | "demande_ouverte"
  | "demande_etape"
  | "demande_envoyee"
  /* Clic sur un appel « Être rappelé » ({ emplacement: tete | accueil | guide | comparateur | produit | outil3a | libre_passage | lettre | frontalier | rappels | barometre | kit_rh | donnees | actualite | outils }), avant le formulaire court. */
  | "rappel_ouvert"
  /* Appel « Être rappelé » vu à l'écran ({ emplacement }), une fois par emplacement et par page, sans aucune valeur saisie. */
  | "rappel_vu"
  /* Bloc « Recevoir des offres pour ce profil » du comparateur : vu (une fois par page) ; demande envoyée ({ porte }). Aucune valeur saisie. */
  | "offre_comparateur_vue"
  | "offre_comparateur_envoyee"
  /* Assistant (PostHog seulement, jamais de contenu de la conversation ni de dataLayer). */
  | "assistant_ouvert"
  | "assistant_message"
  | "assistant_vers_demande"
  /* Bloc de demande en ligne dans l'assistant : vu, demande envoyée ({ porte: "rappel" }). PostHog seulement, aucune valeur ni contenu. */
  | "assistant_offre_vue"
  | "assistant_offre_envoyee"
  /* Nom recommandé par GA4 pour une demande envoyée ({ porte, utm_* de la session }), sur la page de remerciement seulement : voir mesurerLead. */
  | "generate_lead"
  /* GA4 seulement (versGA), noms standard : profondeur de lecture { percent_scrolled: 25 | 50 | 75 | 90 } ;
     lien sortant { link_domain, link_url, outbound } ; fichier { file_extension, file_name, link_url } ;
     outil utilisé { content_type: "outil", content_id: <événement de l'outil> } ; résultats du comparateur
     { item_list_name, item_count } (nombre seulement) ; Core Web Vitals { value, metric_id, metric_value, metric_delta, metric_rating }. */
  | "scroll"
  | "click"
  | "file_download"
  | "select_content"
  | "view_item_list"
  | "LCP"
  | "INP"
  | "CLS"
  /* Question de FAQ ouverte ({ question_index, page }). */
  | "faq_ouverte"
  /* Code d'intégration d'un widget copié ({ widget, methode: bouton | manuel }). */
  | "code_integration_copie";

type Props = Record<string, string | number | boolean>;
type PH = {
  capture: (e: string, p?: Props, o?: { transport?: "sendBeacon"; send_instantly?: boolean }) => void;
  set_config: (c: Record<string, unknown>) => void;
  startSessionRecording: (o?: boolean) => void;
  stopSessionRecording: () => void;
  get_distinct_id: () => string;
  get_session_id: () => string;
  register_for_session: (p: Props) => void;
  unregister_for_session: (k: string) => void;
};
type W = { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };

let ph: PH | null = null;
const file: [Evenement, Props | undefined][] = [];
/* Événements encore dans la file quand la page est quittée (PostHog, chargé après l'affichage, n'était pas prêt : appui
   sur un bouton d'appel dans la première seconde, par exemple) : gardés dans sessionStorage et envoyés par PostHog
   dès qu'il démarre sur la page suivante. Jamais après un refus ; aucune valeur saisie dans ces événements. */
const CLE_FILE = "ga-file-attente";
let gardeFile = false;
function garderFile() {
  if (gardeFile || typeof window === "undefined") return;
  gardeFile = true;
  window.addEventListener("pagehide", () => {
    if (!file.length || lireChoix() === "non") return;
    try {
      sessionStorage.setItem(CLE_FILE, JSON.stringify(file.slice(-20)));
    } catch {
      /* stockage refusé : ces événements sont perdus */
    }
  });
}
function reprendreFile() {
  try {
    const brut = sessionStorage.getItem(CLE_FILE);
    if (!brut) return;
    sessionStorage.removeItem(CLE_FILE);
    const v = JSON.parse(brut) as unknown;
    if (Array.isArray(v)) for (const x of v.slice(-20)) if (Array.isArray(x) && typeof x[0] === "string") file.unshift([x[0] as Evenement, x[1] && typeof x[1] === "object" ? (x[1] as Props) : undefined]);
  } catch {
    /* contenu illisible : ignoré */
  }
}
/* Faux sur le formulaire de demande (mise en page (demande), sans GTM) : rien ne part vers le dataLayer. */
let versDataLayer = true;

/* Événements d'outil : chacun part aussi vers GA4 sous le nom standard select_content { content_type, content_id }. */
const OUTILS: readonly Evenement[] = ["situation_choisie", "simulateur_utilise", "lettre_copiee", "lettre_imprimee", "comparateur_utilise", "impot3a_utilise", "taux_libre_passage_utilise", "somme_menage_utilise", "primes_ue_utilise", "subsides_utilise", "somme_menage_affiner", "garanties_pj_filtre", "caisses_chiffres_utilise", "comparateur_accueil", "comparateur_produit", "outil_partage", "ics_telecharge"];

export function suivre(e: Evenement, p0?: Props, avantDepart = false) {
  if (!MESURE_ACTIVE || typeof window === "undefined") return;
  const p = proprietesConversion(e, p0, lireAttribution());
  if (avantDepart) memoriserIdentite();
  /* avantDepart : la page va changer, l'événement part tout de suite par sendBeacon. */
  if (ph) ph.capture(e, p, avantDepart ? { transport: "sendBeacon", send_instantly: true } : undefined);
  else if (POSTHOG_TOKEN) {
    file.push([e, p]);
    garderFile();
  }
  if (!e.startsWith("assistant_")) {
    versGA(e, p);
    if (OUTILS.includes(e)) versGA("select_content", { content_type: "outil", content_id: e });
  }
}

/* GA4 seulement (dataLayer + commande gtag), jamais sur le formulaire de demande. PostHog mesure de son côté
   défilement, clics, liens sortants et Web Vitals (autocapture, capture_performance). */
export function versGA(e: Evenement, p?: Props) {
  if (!GTM_ID || !versDataLayer || typeof window === "undefined") return;
  const w = window as unknown as W;
  w.dataLayer?.push({ event: e, ...(p ?? {}) });
  /* Commande gtag : la balise Google chargée par GTM la transmet à GA4 sans balise d'événement à configurer dans GTM. */
  w.gtag?.("event", e, p ?? {});
}

/* Conversion GA4 (rapport 09, G5). demande_envoyee part du formulaire, dont la mise en page n'a ni GTM ni dataLayer :
   GA4 ne la voit jamais. Le formulaire laisse donc la porte (constante du site, jamais une valeur saisie) dans
   sessionStorage juste avant d'ouvrir la page de remerciement, qui a GTM ; cette page la lit, l'efface et envoie
   generate_lead { porte, utm_* } au dataLayer seulement (PostHog a déjà demande_envoyee). Les utm_* sont ceux de
   l'adresse d'arrivée de la session (memoriserUtm). Une visite directe ou un rechargement de la page de remerciement
   ne trouve pas de marque et n'envoie rien. */
export const CLE_LEAD = "ga-demande-envoyee";
/* Attribution au premier contact (décision du 23.11.2026) : le formulaire de demande mesure sans cookie, son
   demande_envoyee arrivait donc dans une session anonyme neuve, comptée « directe ». À la première page de la session,
   sauf refus, le canal d'arrivée, le domaine d'origine, les UTM, le chemin d'arrivée et la source IA sont gardés dans
   sessionStorage (jamais un cookie, effacé à la fermeture de l'onglet, effacé par « Refuser ») ; les événements de
   conversion (CONVERSIONS) les portent, vers PostHog et GA4. Aucune valeur saisie. */
export const CLE_ATTRIBUTION = "ga-attribution";
/* Identifiant PostHog du visiteur et de la session (déjà gardés par PostHog sur le site, sauf refus), recopiés dans
   sessionStorage pour que le formulaire, en mémoire, rattache la demande à la même personne et à la même session. */
export const CLE_IDENTITE = "ga-ph";
export function memoriserAttribution() {
  if (typeof window === "undefined" || lireChoix() === "non") return;
  try {
    if (sessionStorage.getItem(CLE_ATTRIBUTION)) return;
    const a = attributionDepuis(document.referrer, window.location.search, window.location.pathname, window.location.hostname);
    sessionStorage.setItem(CLE_ATTRIBUTION, JSON.stringify(a));
  } catch {
    /* stockage refusé : les événements partent sans attribution */
  }
}
export function lireAttribution(): Record<string, string> {
  if (typeof window === "undefined" || lireChoix() === "non") return {};
  try {
    return attributionLue(sessionStorage.getItem(CLE_ATTRIBUTION));
  } catch {
    return {};
  }
}
function oublierAttribution() {
  try {
    sessionStorage.removeItem(CLE_ATTRIBUTION);
    sessionStorage.removeItem(CLE_IDENTITE);
    sessionStorage.removeItem(CLE_UTM);
  } catch {
    /* rien à effacer */
  }
}
/* Seulement sur le site, en mode persistant (pas de refus) : le formulaire, lui, ne fait que relire. */
function memoriserIdentite() {
  if (!ph || !modeSite || persistanceAppliquee !== true || lireChoix() === "non") return;
  try {
    const d = ph.get_distinct_id();
    const s = ph.get_session_id();
    if (d) sessionStorage.setItem(CLE_IDENTITE, JSON.stringify({ d: String(d).slice(0, 200), s: String(s ?? "").slice(0, 200) }));
  } catch {
    /* stockage refusé */
  }
}
function lireIdentite(): { distinctID?: string; sessionID?: string } {
  if (lireChoix() === "non") return {};
  try {
    const v = JSON.parse(sessionStorage.getItem(CLE_IDENTITE) ?? "null") as { d?: unknown; s?: unknown } | null;
    if (!v || typeof v.d !== "string" || !/^[\w-]{1,200}$/.test(v.d)) return {};
    return { distinctID: v.d, ...(typeof v.s === "string" && /^[\w-]{1,200}$/.test(v.s) ? { sessionID: v.s } : {}) };
  } catch {
    return {};
  }
}
export const CLE_UTM = "ga-utm";
export function marquerLead(porte: string) {
  try {
    sessionStorage.setItem(CLE_LEAD, porte);
  } catch {
    /* stockage refusé : pas de conversion GA4, la demande part quand même */
  }
}
/* Garde les UTM de la première page de la session qui en porte (sessionStorage, effacé à la fermeture de l'onglet). */
export function memoriserUtm(utm: Record<string, string> | null) {
  if (!utm) return;
  try {
    if (!sessionStorage.getItem(CLE_UTM)) sessionStorage.setItem(CLE_UTM, JSON.stringify(utm));
  } catch {
    /* stockage refusé */
  }
}
function lireUtm(): Props {
  try {
    const v = JSON.parse(sessionStorage.getItem(CLE_UTM) ?? "null") as unknown;
    if (!v || typeof v !== "object") return {};
    const r: Props = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (k.startsWith("utm_") && typeof x === "string") r[k] = x.slice(0, 100);
    return r;
  } catch {
    return {};
  }
}
export function mesurerLead(portesValides: readonly string[]) {
  if (!GTM_ID || typeof window === "undefined") return;
  let porte: string | null = null;
  try {
    porte = sessionStorage.getItem(CLE_LEAD);
    sessionStorage.removeItem(CLE_LEAD);
  } catch {
    return;
  }
  if (!porte || !portesValides.includes(porte)) return;
  const p = { ...lireUtm(), ...lireAttribution(), porte };
  const w = window as unknown as W;
  w.dataLayer?.push({ event: "generate_lead", ...p });
  w.gtag?.("event", "generate_lead", p);
}

/* Formulaire de demande : PostHog seul, sans cookie (mémoire), sans autocapture ni enregistrement, et jamais de dataLayer. */
export function demarrerMesureDemande() {
  versDataLayer = false;
  modeSite = false;
  /* Arrivée directe sur le formulaire (lien externe) : l'attribution se prend ici ; sinon celle du site est gardée. */
  memoriserAttribution();
  void demarrerPostHog(false);
}

export type { Choix };
export function lireChoix(): Choix {
  try {
    const v = localStorage.getItem(CLE);
    return v === "oui" || v === "non" ? v : null;
  } catch {
    return null;
  }
}

export const persistantNavigateur = () => persistantParDefaut(lireChoix());

/* Enregistre le choix et met à jour Google Consent Mode sans recharger la page. */
export function ecrireChoix(c: "oui" | "non") {
  try {
    localStorage.setItem(CLE, c);
  } catch {
    /* navigation privée : le choix vaut pour la page */
  }
  (window as unknown as W).gtag?.("consent", "update", c === "oui" ? ACCORDE : REFUSE);
  if (c === "non") {
    oublierAttribution();
    for (const k of ["canal", "ai_source"]) ph?.unregister_for_session(k);
  } else memoriserAttribution();
}

let modeSite = true;
let persistanceVoulue: boolean | null = null;
let persistanceAppliquee: boolean | null = null;
let chargement: Promise<void> | null = null;

/* persistant : localStorage+cookie et enregistrement de session (hors formulaire de demande) ; sinon mémoire, sans enregistrement. */
/* Appareil marqué interne (voir AMORCE_INTERNE) : aucune mesure. Relu ici quand GTM est absent. */
export function appareilInterne(): boolean {
  try {
    const q = new URLSearchParams(window.location.search).get("interne");
    if (q === "1") localStorage.setItem(CLE_INTERNE, "1");
    else if (q === "0") localStorage.removeItem(CLE_INTERNE);
    return localStorage.getItem(CLE_INTERNE) === "1";
  } catch {
    return false;
  }
}

export async function demarrerPostHog(persistant: boolean) {
  if (!POSTHOG_TOKEN || typeof window === "undefined" || appareilInterne()) return;
  persistanceVoulue = persistant;
  /* Un seul chargement même si le visiteur choisit pendant qu'il est en cours ; le dernier choix l'emporte. */
  if (!chargement) chargement = initPostHog(persistant);
  await chargement;
  if (ph && persistanceVoulue !== persistanceAppliquee) await appliquer(persistanceVoulue);
}

const replayVoulu = (persistant: boolean) => modeSite && persistant && replayAutorise(window.location.pathname);

async function appliquer(persistant: boolean) {
  const p = ph as PH;
  persistanceAppliquee = persistant;
  p.set_config({ persistence: persistant ? "localStorage+cookie" : "memory" });
  if (persistant) memoriserIdentite();
  if (replayVoulu(persistant)) {
    await import("posthog-js/dist/lazy-recorder");
    p.startSessionRecording(true);
  } else p.stopSessionRecording();
}

async function initPostHog(persistant: boolean) {
  const site = modeSite;
  const [{ default: posthog }] = await Promise.all([
    import("posthog-js"),
    /* Extensions groupées dans le bundle du site (disable_external_dependency_loading : aucun script tiers chargé). */
    ...(site ? [import("posthog-js/dist/web-vitals"), import("posthog-js/dist/dead-clicks-autocapture")] : []),
  ]);
  persistanceAppliquee = persistant;
  const identite = site ? {} : lireIdentite();
  /* Configuration distante fournie d'avance : advanced_disable_flags coupe /flags et la configuration distante, sans
     laquelle l'enregistrement de session ne démarre jamais. Le site la déclare donc lui-même (aucune requête de plus,
     aucun script tiers). L'enregistrement reste coupé (disable_session_recording) tant qu'appliquer ne l'a pas lancé. */
  if (site) {
    const w = window as unknown as { _POSTHOG_REMOTE_CONFIG?: Record<string, { config: Record<string, unknown> }> };
    w._POSTHOG_REMOTE_CONFIG = {
      ...w._POSTHOG_REMOTE_CONFIG,
      [POSTHOG_TOKEN]: {
        config: {
          sessionRecording: { endpoint: "/s/", consoleLogRecordingEnabled: false, recordCanvas: false, networkPayloadCapture: null },
          heatmaps: true,
          capturePerformance: { web_vitals: true, network_timing: false },
          autocapture_opt_out: false,
          autocaptureExceptions: false,
          surveys: false,
          supportedCompression: ["gzip-js"],
        },
      },
    };
  }
  posthog.init(POSTHOG_TOKEN, {
    api_host: POSTHOG_HOST,
    ui_host: "https://eu.posthog.com",
    persistence: persistant ? "localStorage+cookie" : "memory",
    /* Clics et envois de formulaire, jamais de valeur de champ (PostHog ne lit pas les champs) ; le texte des outils
       (classe ph-sensitive) et l'assistant (ph-no-capture) sont exclus. */
    autocapture: site ? { dom_event_allowlist: ["click", "submit"], capture_copied_text: false } : false,
    mask_all_text: false,
    mask_all_element_attributes: false,
    rageclick: site,
    enable_heatmaps: site,
    capture_dead_clicks: site,
    capture_performance: site ? { web_vitals: true, network_timing: false } : false,
    capture_pageview: "history_change",
    capture_pageleave: true,
    /* Démarré à la main (appliquer) seulement pour un visiteur persistant, hors formulaire de demande. Champs masqués,
       texte des outils masqué (data-ph-mask), assistant bloqué (ph-no-capture : la conversation n'est jamais enregistrée). */
    disable_session_recording: true,
    session_recording: { maskAllInputs: true, maskTextSelector: "[data-ph-mask]", blockClass: "ph-no-capture", recordCrossOriginIframes: false },
    disable_surveys: true,
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    property_denylist: ["$ip"],
    respect_dnt: true,
    /* Formulaire de demande : reprend l'identifiant et la session du site (CLE_IDENTITE), sauf refus. */
    ...(!site && identite.distinctID ? { bootstrap: { distinctID: identite.distinctID, isIdentifiedID: false, ...(identite.sessionID ? { sessionID: identite.sessionID } : {}) } } : {}),
  });
  ph = posthog as unknown as PH;
  if (site && persistant) memoriserIdentite();
  /* Canal et source IA sur tous les événements de la session (pages vues comprises), pour les tunnels par canal. */
  const a = lireAttribution();
  if (a.canal) ph.register_for_session({ canal: a.canal, ...(a.ai_source ? { ai_source: a.ai_source } : {}) });
  /* L'enregistreur de session (rrweb, environ 160 Ko, une tâche d'une cinquantaine de ms sur un téléphone) ne démarre
     qu'au premier geste du visiteur (appui, touche, défilement) ou après 20 s : un visiteur qui n'agit pas n'a rien
     à rejouer, et la page n'est pas bloquée pendant son démarrage. L'instantané complet de la page est pris à ce moment. */
  if (replayVoulu(persistant)) planifierEnregistrement();
  if (lireChoix() !== "non") reprendreFile();
  for (const [e, p] of file.splice(0)) ph.capture(e, p);
}

let enregistrementPlanifie = false;
function planifierEnregistrement() {
  if (enregistrementPlanifie) return;
  enregistrementPlanifie = true;
  const demarrer = async () => {
    /* Le choix du visiteur a pu changer entre-temps : appliquer() gère alors lui-même l'enregistreur. */
    if (!ph || persistanceVoulue === null || !replayVoulu(persistanceVoulue)) return;
    await import("posthog-js/dist/lazy-recorder");
    if (ph && persistanceVoulue !== null && replayVoulu(persistanceVoulue)) ph.startSessionRecording(true);
  };
  chargerApresAffichage(() => void demarrer(), { interaction: true, delaiMax: 20000 });
}
