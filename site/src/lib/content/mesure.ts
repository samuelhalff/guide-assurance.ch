import { GTM_ID, POSTHOG_TOKEN } from "@/lib/analytics";
import { ESPACE_FINE as N } from "../nombres.ts";

/* Textes de la politique de confidentialité sur la mesure d'audience, choisis au build selon les outils réellement
   configurés : la page dit toujours ce que le site fait. */
const ph = Boolean(POSTHOG_TOKEN);
const ga = Boolean(GTM_ID);

const FR = {
  aucun: {
    desc: "Les outils calculent dans votre navigateur, sans cookie ni mesure d’audience. Les journaux serveur ne gardent pas l’IP, et la nLPD protège vos données.",
    faq: "Non. guide-assurance.ch n’utilise ni cookies ni outil de mesure d’audience.",
    section: `<a id="mesure"></a>

## Le site utilise-t-il des cookies${N}?

Non. Le site n’utilise aucun cookie et aucun outil de mesure d’audience. Si cela change, cette page sera mise à jour avant, avec la date de la modification, et votre consentement sera demandé quand la loi l’exige.
`,
  },
  actif: {
    desc: `Les outils calculent dans votre navigateur. ${ga ? "Les cookies de mesure sont actifs sauf refus" : "Aucun cookie de mesure n’est déposé"}, les journaux serveur omettent l’IP et la nLPD protège vos données.`,
    faq: ga
      ? "Oui, des cookies de mesure d’audience. Ils sont actifs tant que vous ne cliquez pas sur « Refuser » dans le bandeau : ne rien choisir revient à accepter. Le lien « Cookies » en bas de page permet de changer d’avis."
      : "Non. La mesure d’audience fonctionne sans cookie ni stockage sur votre appareil.",
    section: `<a id="mesure"></a>

## Comment l’audience est-elle mesurée${N}?

Nous mesurons la lecture des pages et l’usage des outils pour savoir quels guides servent et les améliorer. Ce que vous saisissez dans les outils ou dans le formulaire de demande (nom, adresse, revenu, dates, santé) n’est jamais envoyé, et vos conversations avec l’assistant ne sont jamais enregistrées.

Nous relevons les pages vues et le temps passé, la profondeur de lecture, les clics (y compris l’endroit cliqué sur la page, pour des cartes de chaleur), les liens suivis vers d’autres sites, les fichiers téléchargés, les questions de FAQ ouvertes, l’usage des outils sans les valeurs saisies, le nombre de résultats du comparateur et la vitesse d’affichage. Nous notons aussi le site d’où vous venez, par exemple un assistant d’intelligence artificielle, et les paramètres de campagne du lien d’arrivée.
${ph ? `
- Un premier outil, dont les données sont hébergées dans l’Union européenne, peut aussi enregistrer le déroulement d’une visite (défilement, mouvements et clics) pour repérer ce qui gêne la lecture. Les champs de saisie et les résultats des outils sont masqués, la fenêtre de l’assistant est exclue et rien n’est enregistré sur le formulaire de demande ni sur la demande de rappel. Votre adresse IP n’est pas conservée. Les enregistrements sont effacés après 30 jours, les statistiques après un an.` : ""}${ga ? `
- Un second outil, chargé par un gestionnaire de balises, dépose des cookies de mesure d’audience (jusqu’à 2 ans) et garde les données 14 mois. Il ne relie pas vos visites d’un appareil à l’autre. Son fournisseur peut traiter ces données aux États-Unis, dans le cadre du Swiss-U.S. Data Privacy Framework et, pour les visiteurs de l’Union européenne, de l’EU-U.S. Data Privacy Framework.

### Votre choix

- Tout est actif d’office, d’où que vous consultiez le site. Si vous ne choisissez rien dans le bandeau, c’est comme si vous aviez accepté${N}: les cookies de mesure d’audience sont déposés${ph ? ", le premier outil garde un identifiant sur votre appareil (cookie et stockage local, 1 an) et peut enregistrer la visite" : ""}. Seul un clic sur «${N}Refuser${N}» change cela.
- Si vous refusez, plus aucun cookie de mesure n’est déposé et le second outil ne reçoit plus que des signaux sans cookie.${ph ? " Le premier outil cesse d’enregistrer la visite et ne garde plus rien sur votre appareil." : ""}
- Votre choix est enregistré dans votre navigateur. Vous pouvez le changer à tout moment avec le lien «${N}Cookies${N}» en bas de page.` : ""}
`,
  },
};

const EN = {
  aucun: {
    desc: "The tools calculate in your browser. No cookies or analytics tools are used, server logs keep no IP addresses, and the Swiss nFADP protects your data.",
    faq: "No. guide-assurance.ch uses no cookies and no audience measurement tool.",
    section: `<a id="measurement"></a>

## Does the site use cookies?

No. The site uses no cookies and no audience measurement tool. If this changes, we will update this page first, with the date of the change, and ask for your consent where the law requires it.
`,
  },
  actif: {
    desc: `The tools calculate in your browser. ${ga ? "Analytics cookies are on unless you decline" : "No analytics cookies are used"}, server logs keep no IP addresses, and the Swiss nFADP protects your data.`,
    faq: ga
      ? "Yes, analytics cookies. They are on unless you click \"Decline\" in the banner: making no choice counts as accepting. The \"Cookies\" link at the bottom of the page lets you change your mind."
      : "No. Audience measurement works without cookies or storage on your device.",
    section: `<a id="measurement"></a>

## How is traffic measured?

We measure how pages are read and how the tools are used, to learn which guides help and to improve them. What you type into the tools or the request form (name, address, income, dates, health) is never sent, and your conversations with the assistant are never recorded.

We record page views and time on page, how far you scroll, clicks (including where on the page you click, for heatmaps), links followed to other sites, files downloaded, FAQ questions opened, tool use without the values you enter, the number of comparison results and loading speed. We also note the site you came from, such as an AI assistant, and the campaign parameters of the link you arrived by.
${ph ? `
- A first tool, with data hosted in the European Union, can also record how a visit unfolds (scrolling, movements and clicks) to find what gets in the way of reading. Input fields and tool results are masked, the assistant window is excluded, and nothing is recorded on the request form or the call-back form. Your IP address is not kept. Recordings are deleted after 30 days, statistics after one year.` : ""}${ga ? `
- A second tool, loaded by a tag manager, sets analytics cookies (up to 2 years) and keeps the data for 14 months. It does not link your visits across devices. Its provider may process this data in the United States under the Swiss-U.S. Data Privacy Framework and, for visitors from the European Union, the EU-U.S. Data Privacy Framework.

### Your choice

- Everything is on by default, wherever you visit from. If you make no choice in the banner, it counts as accepting: analytics cookies are set${ph ? ", the first tool keeps an identifier on your device (cookie and local storage, 1 year) and may record the visit" : ""}. Only clicking "Decline" changes this.
- If you decline, no analytics cookie is set any more and the second tool only receives cookie-free signals.${ph ? " The first tool stops recording the visit and keeps nothing on your device." : ""}
- Your choice is stored in your browser and can be changed at any time with the "Cookies" link at the bottom of the page.` : ""}
`,
  },
};

export function remplacementsMesure(locale: "fr" | "en"): Record<string, string> {
  const t = (locale === "fr" ? FR : EN)[ph || ga ? "actif" : "aucun"];
  return { "{{MESURE_DESCRIPTION}}": t.desc, "{{MESURE_FAQ}}": t.faq, "{{MESURE_SECTION}}": t.section };
}
