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
