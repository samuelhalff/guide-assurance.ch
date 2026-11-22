import { GTM_ID, POSTHOG_TOKEN } from "@/lib/analytics";

/* Textes de la politique de confidentialité sur la mesure d'audience, choisis au build selon les outils réellement
   configurés : la page dit toujours ce que le site fait. */
const N = " ";
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
    desc: `Les outils calculent dans votre navigateur. ${ga ? "Les cookies de mesure peuvent être refusés" : "Aucun cookie de mesure n’est déposé"}, les journaux serveur omettent l’IP et la nLPD protège vos données.`,
    faq: ga
      ? "Oui, des cookies de mesure d’audience. En Suisse vous pouvez les refuser\u202f; depuis l’UE ou le Royaume-Uni, ils ne sont déposés qu’avec votre accord."
      : "Non. La mesure d’audience fonctionne sans cookie ni stockage sur votre appareil.",
    section: `<a id="mesure"></a>

## Comment l’audience est-elle mesurée${N}?

Nous comptons les pages lues et l’usage des outils pour savoir quels guides servent et les améliorer. Ce que vous saisissez dans les outils (nom, adresse, revenu, dates) n’est jamais envoyé.
${ph ? `
- Par défaut, un outil de mesure sans cookie (données hébergées dans l’Union européenne) compte les pages vues et quelques actions${N}: situation choisie sur l’accueil, simulateur utilisé, lettre imprimée ou copiée, outil partagé. Rien n’est stocké sur votre appareil, votre adresse IP n’est pas conservée et aucune session n’est enregistrée.` : ""}${ga ? `
- Un second outil de mesure d’audience dépose des cookies (jusqu’à 2 ans). En Suisse, ils sont actifs tant que vous ne les refusez pas. Depuis l’Union européenne ou le Royaume-Uni, ils ne sont déposés qu’après votre accord. Les signaux publicitaires restent désactivés sans votre accord. Son fournisseur peut traiter ces données aux États-Unis, dans le cadre du Swiss-U.S. Data Privacy Framework.${ph ? " Si vous acceptez, le premier outil peut aussi reconnaître votre appareil d’une visite à l’autre." : ""}
- Votre choix est enregistré dans votre navigateur. Il se modifie à tout moment avec le lien « Cookies » en bas de page.` : ""}
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
    desc: `The tools calculate in your browser. Analytics cookies ${ga ? "can be declined" : "are not used"}, server logs keep no IP addresses, and the Swiss nFADP protects your data.`,
    faq: ga ? "Yes, analytics cookies. In Switzerland you can decline them; from the EU or the UK they are only set with your consent." : "No. Audience measurement works without cookies or storage on your device.",
    section: `<a id="measurement"></a>

## How is traffic measured?

We count page views and tool use to learn which guides help and to improve them. What you type into the tools (name, address, income, dates) is never sent.
${ph ? `
- By default, a cookie-free measurement tool (data hosted in the European Union) counts page views and a few actions: situation chosen on the home page, calculator used, letter printed or copied, tool shared. Nothing is stored on your device, your IP address is not kept and no session is recorded.` : ""}${ga ? `
- A second analytics tool sets cookies (up to 2 years). In Switzerland they are active unless you decline them. From the European Union or the United Kingdom, they are only set after you accept. Advertising signals stay off without your consent. Its provider may process this data in the United States under the Swiss-U.S. Data Privacy Framework.${ph ? " If you accept, the first tool can also recognise your device from one visit to the next." : ""}
- Your choice is stored in your browser and can be changed at any time with the "Cookies" link at the bottom of the page.` : ""}
`,
  },
};

export function remplacementsMesure(locale: "fr" | "en"): Record<string, string> {
  const t = (locale === "fr" ? FR : EN)[ph || ga ? "actif" : "aucun"];
  return { "{{MESURE_DESCRIPTION}}": t.desc, "{{MESURE_FAQ}}": t.faq, "{{MESURE_SECTION}}": t.section };
}
