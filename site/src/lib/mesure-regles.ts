/* Règles pures de la mesure d'audience (sans import : testées directement par tests/mesure.test.mts).
   Politique (décision de Sam, 23.11.2026, prise en connaissance du risque RGPD pour l'UE, docs/decisions.md) :
   partout, tout est accordé d'office ; ignorer le bandeau vaut acceptation, seul « Refuser » change cela.
   Un choix enregistré l'emporte toujours. Pour rétablir un opt-in régional (UE/EEE/RU), remplir REGIONS_OPT_IN
   (par exemple avec EEE_RU) : un défaut « tout refusé » limité à ces pays est alors posé avant le défaut général. */

export const EEE_RU = ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IS","IE","IT","LV","LI","LT","LU","MT","NL","NO","PL","PT","RO","SK","SI","ES","SE","GB"];

type Etat = "granted" | "denied";
export type Consentement = { ad_storage: Etat; analytics_storage: Etat; ad_user_data: Etat; ad_personalization: Etat };
export const REFUSE: Consentement = { ad_storage: "denied", analytics_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" };
export const ACCORDE: Consentement = { ad_storage: "granted", analytics_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" };

export const REGIONS_OPT_IN: string[] = [];

/* Commandes gtag('consent','default', …) dans l'ordre : la plus précise (region) l'emporte sur la valeur générale. */
export function consentementsParDefaut(regionsOptIn: string[] = REGIONS_OPT_IN): Record<string, unknown>[] {
  return [...(regionsOptIn.length ? [{ ...REFUSE, region: regionsOptIn, wait_for_update: 500 }] : []), { ...ACCORDE }];
}

export type Choix = "oui" | "non" | null;
/* PostHog persistant (localStorage+cookie) et enregistrement de session sauf refus explicite. */
export function persistantParDefaut(choix: Choix): boolean {
  return choix !== "non";
}

/* Jamais d'enregistrement de session sur le formulaire de demande (ni sur le rappel). */
export function replayAutorise(chemin: string): boolean {
  return !/^\/(demande|en\/request)(\/|$)/.test(chemin);
}

/* Assistant IA d'où vient le visiteur, d'après le référent ou utm_source. Fonction autonome (aucune référence
   extérieure) : son texte est injecté tel quel dans le script du <head> (amorceGTM). */
export function sourceIA(referent: string, utmSource: string | null | undefined): string | null {
  const table: [RegExp, string][] = [
    [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, "chatgpt"],
    [/(^|\.)perplexity\.ai$/, "perplexity"],
    [/(^|\.)claude\.ai$|(^|\.)anthropic\.com$/, "claude"],
    [/^copilot\.microsoft\.com$|(^|\.)copilot\.cloud\.microsoft$/, "copilot"],
    [/^gemini\.google\.com$|^bard\.google\.com$/, "gemini"],
    [/(^|\.)deepseek\.com$/, "deepseek"],
    [/(^|\.)mistral\.ai$/, "mistral"],
    [/(^|\.)you\.com$/, "you"],
    [/(^|\.)phind\.com$/, "phind"],
    [/(^|\.)poe\.com$/, "poe"],
    [/(^|\.)meta\.ai$/, "meta_ai"],
    [/(^|\.)grok\.com$|^x\.ai$/, "grok"],
  ];
  let hote = "";
  try {
    hote = referent ? new URL(referent).hostname.toLowerCase() : "";
  } catch {
    hote = "";
  }
  const u = (utmSource || "").toLowerCase().trim();
  for (let i = 0; i < table.length; i++) {
    if (hote && table[i][0].test(hote)) return table[i][1];
    if (u && (u === table[i][1] || table[i][0].test(u))) return table[i][1];
  }
  return null;
}

/* Paramètres UTM de l'adresse d'arrivée (valeurs de campagne posées par nous ou par le site d'origine, jamais saisies). */
export const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
export function utmDepuis(search: string): Record<string, string> | null {
  const q = new URLSearchParams(search);
  const r: Record<string, string> = {};
  for (const k of UTM) {
    const v = q.get(k);
    if (v) r[k] = v.slice(0, 100);
  }
  return Object.keys(r).length ? r : null;
}

/* Attribution au premier contact (décision du 23.11.2026, docs/decisions.md) : canal d'acquisition de la première page
   de la session, d'après le référent, les UTM et les identifiants de clic publicitaire de l'adresse d'arrivée.
   Jamais de valeur saisie : seulement le domaine d'origine, les paramètres de campagne et le chemin d'arrivée. */
export type Canal = "google" | "bing" | "autre_recherche" | "ia" | "reseau_social" | "referent" | "direct" | "payant";
export type Attribution = { canal: Canal; referent_domaine?: string; page_arrivee: string; ai_source?: string } & Partial<Record<(typeof UTM)[number], string>>;

const CLICS_PAYANTS = ["gclid", "gbraid", "wbraid", "dclid", "msclkid", "li_fat_id", "ttclid"];
const MEDIUM_PAYANT = /^(cpc|ppc|cpm|cpv|paid|paid[_-]?(search|social|media)|display|banner|sem|ads?)$/;
const RECHERCHE: [RegExp, Canal][] = [
  [/(^|\.)google\.[a-z.]+$|^com\.google\.android\.googlequicksearchbox$/, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)(duckduckgo\.com|ecosia\.org|qwant\.com|yahoo\.com|search\.yahoo\.[a-z.]+|yandex\.[a-z.]+|baidu\.com|startpage\.com|search\.brave\.com|search\.ch|swisscows\.com|lilo\.org|kagi\.com|ask\.com|aol\.com|seznam\.cz)$/, "autre_recherche"],
];
const SOCIAL = /(^|\.)(facebook\.com|fb\.com|fb\.me|instagram\.com|linkedin\.com|lnkd\.in|t\.co|twitter\.com|x\.com|reddit\.com|youtube\.com|youtu\.be|tiktok\.com|pinterest\.[a-z.]+|whatsapp\.com|wa\.me|telegram\.org|t\.me|threads\.net|threads\.com|snapchat\.com|bsky\.app|mastodon\.social|xing\.com)$/;
const SOURCE_SOCIALE = /^(facebook|fb|instagram|ig|linkedin|twitter|x|reddit|youtube|tiktok|pinterest|whatsapp|telegram|threads|snapchat|bluesky|xing)$/;

/* Domaine sans www., ou null (adresse illisible, vide ou de ce site). */
export function domaineReferent(referent: string, hoteSite: string): string | null {
  if (!referent) return null;
  try {
    const h = new URL(referent).hostname.toLowerCase().replace(/^www\./, "");
    if (!h || h === hoteSite.toLowerCase().replace(/^www\./, "")) return null;
    return h.slice(0, 100);
  } catch {
    return null;
  }
}

export function canalAcquisition(referent: string, search: string, hoteSite: string): Canal {
  const q = new URLSearchParams(search);
  const medium = (q.get("utm_medium") || "").toLowerCase().trim();
  const source = (q.get("utm_source") || "").toLowerCase().trim();
  if (CLICS_PAYANTS.some((k) => q.get(k)) || MEDIUM_PAYANT.test(medium)) return "payant";
  const dom = domaineReferent(referent, hoteSite);
  if (sourceIA(dom ? `https://${dom}/` : "", source)) return "ia";
  if (source) {
    for (const [re, c] of RECHERCHE) if (re.test(source) || source === c) return c;
    if (SOURCE_SOCIALE.test(source) || SOCIAL.test(source) || medium === "social") return "reseau_social";
  }
  if (dom) {
    for (const [re, c] of RECHERCHE) if (re.test(dom)) return c;
    if (SOCIAL.test(dom)) return "reseau_social";
    return "referent";
  }
  return source ? "referent" : "direct";
}

/* Attribution complète de la page d'arrivée. Propriétés plates (PostHog et GA4) ; valeurs de 100 caractères au plus. */
export function attributionDepuis(referent: string, search: string, chemin: string, hoteSite: string): Attribution {
  const dom = domaineReferent(referent, hoteSite);
  const a: Attribution = { canal: canalAcquisition(referent, search, hoteSite), page_arrivee: (chemin || "/").slice(0, 100), ...(utmDepuis(search) ?? {}) };
  if (dom) a.referent_domaine = dom;
  const ia = sourceIA(dom ? `https://${dom}/` : "", new URLSearchParams(search).get("utm_source"));
  if (ia) a.ai_source = ia;
  return a;
}

/* Lecture tolérante de l'attribution gardée en sessionStorage : seules les clés connues, en chaînes, sont reprises. */
const CLES_ATTRIBUTION = ["canal", "referent_domaine", "page_arrivee", "ai_source", ...UTM];
export function attributionLue(brut: string | null): Record<string, string> {
  try {
    const v = JSON.parse(brut ?? "null") as unknown;
    if (!v || typeof v !== "object") return {};
    const r: Record<string, string> = {};
    for (const k of CLES_ATTRIBUTION) {
      const x = (v as Record<string, unknown>)[k];
      if (typeof x === "string" && x) r[k] = x.slice(0, 100);
    }
    return r.canal ? r : {};
  } catch {
    return {};
  }
}

/* Événements de conversion qui portent l'attribution au premier contact. */
export const CONVERSIONS = ["demande_ouverte", "demande_etape", "demande_envoyee", "rappel_ouvert", "assistant_vers_demande", "generate_lead"] as const;
/* Propriétés d'un événement de conversion : attribution d'abord, propriétés propres à l'événement ensuite (elles l'emportent). */
export function proprietesConversion<P extends Record<string, string | number | boolean>>(evenement: string, props: P | undefined, attribution: Record<string, string>): P | Record<string, string | number | boolean> | undefined {
  if (!(CONVERSIONS as readonly string[]).includes(evenement) || !attribution.canal) return props;
  return { ...attribution, ...(props ?? {}) };
}

/* Fichiers téléchargeables suivis (file_download). */
export function extensionTelechargement(href: string): string | null {
  const m = /\.(pdf|csv|ics|xlsx?|zip|json)(?:[?#]|$)/i.exec(href);
  return m ? m[1].toLowerCase() : null;
}

/* Script en ligne du <head> : états de consentement par défaut et choix enregistré, posés tout de suite, avant
   gtm.js ; puis, à la première page de la session, la source IA (paramètre ai_source sur les événements de la page,
   page_view compris, et propriété utilisateur). Seule l'injection de gtm.js attend la fin du chargement de la page
   puis un moment libre (requestIdleCallback, 3 s au plus) ; les commandes poussées entre-temps restent dans
   dataLayer et GTM les lit à son arrivée. */
export function scriptAmorce(gtmId: string, cle: string): string {
  if (!gtmId) return "";
  const defauts = consentementsParDefaut().map((c) => `gtag('consent','default',${JSON.stringify(c)});`).join("\n");
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
${defauts}
gtag('set','ads_data_redaction',true);
try{var c=localStorage.getItem(${JSON.stringify(cle)});if(c==='oui')gtag('consent','update',${JSON.stringify(ACCORDE)});else if(c==='non')gtag('consent','update',${JSON.stringify(REFUSE)});}catch(e){}
try{if(!sessionStorage.getItem('ga-ia-vu')){sessionStorage.setItem('ga-ia-vu','1');var a=(${sourceIA.toString()})(document.referrer,new URLSearchParams(location.search).get('utm_source'));if(a){gtag('set','user_properties',{ai_source:a});gtag('set',{ai_source:a});dataLayer.push({ai_source:a});}}}catch(e){}
gtag('js',new Date());
(function(w,d,l,i){var go=function(){w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var j=d.createElement('script');j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;d.head.appendChild(j);};var later=function(){(w.requestIdleCallback||function(f){setTimeout(f,1)})(go,{timeout:3000});};if(d.readyState==='complete')later();else w.addEventListener('load',later,{once:true});})(window,document,'dataLayer',${JSON.stringify(gtmId)});`;
}
