import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { PartagerOutil } from "@/components/site/partager-outil";
import { RappelsEcheances } from "@/components/outils/rappels-echeances";
import { IconeTelephone, LienRappel } from "@/components/demande/lien-rappel";
import { FaqSections, faqOutilLd, type FaqOutil } from "@/components/site/faq-sections";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { dateLongue, type Locale } from "@/lib/i18n";
import { MAJ_IDEES, ROUTES_IDEES } from "@/lib/pages-idees";
import { OUTILS, OUTILS_EN } from "@/lib/nav";

/* Page « Rappels d'échéance » (idée 1 du rapport 08) : fichier .ics créé dans le navigateur, sans e-mail ni serveur. */
const T = " ";
const LAMAL = "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_7";
const LCA = "https://www.fedlex.admin.ch/eli/cc/24/719_735_717/fr#art_35a";
const LCA42 = "https://www.fedlex.admin.ch/eli/cc/24/719_735_717/fr#art_42";

const TXT = {
  fr: {
    titre: "Rappels d’échéance d’assurance dans votre agenda",
    description: "Un fichier d’agenda avec le 30 novembre (LAMal), le 31 décembre (3a) et l’échéance de vos contrats, créé dans votre navigateur, sans adresse e-mail.",
    h1: "Vos échéances d’assurance dans votre agenda",
    intro: "Les dates de résiliation reviennent chaque année et passent vite. Cette page crée un fichier d’agenda (.ics) avec les échéances fixées par la loi, celles de vos contrats et une alerte quelques semaines avant chacune.",
    prive: "Le fichier est créé dans votre navigateur. Nous ne recevons ni vos dates ni le nom de vos contrats, et aucune adresse e-mail n’est demandée.",
    miettes: [{ name: "Accueil", href: "/" }, { name: "Rappels d’échéance" }] as Miette[],
    partageTitre: "Rappels d’échéance d’assurance",
    partageTexte: "Ajouter à son agenda le 30 novembre, le 31 décembre et l’échéance de ses contrats d’assurance, sans donner son e-mail.",
    rappel: "Une échéance approche et vous voulez comparer avant de résilier ? Un conseiller peut vous rappeler. ",
    lettre: "Pour la lettre elle-même, ",
    lettreLien: "l’outil de résiliation calcule la date limite et rédige le texte",
    maj: `Mis à jour le ${dateLongue(MAJ_IDEES, "fr")}. Sources${T}: Fedlex (LAMal, LCA).`,
    note: "Cet outil donne une information générale ; votre contrat fait foi.",
  },
  en: {
    titre: "Insurance renewal reminders in your calendar (.ics)",
    description: "A calendar file with 30 November (LAMal), 31 December (pillar 3a) and the renewal dates of your contracts, created in your browser, with no e-mail needed.",
    h1: "Your insurance deadlines in your calendar",
    intro: "Cancellation dates come back every year and slip by quickly. This page creates a calendar file (.ics) with the deadlines set by law, those of your own contracts and an alert a few weeks before each one.",
    prive: "The file is created in your browser. We receive neither your dates nor the names of your contracts, and no e-mail address is asked for.",
    miettes: [{ name: "Home", href: "/en/" }, { name: "Renewal reminders" }] as Miette[],
    partageTitre: "Insurance renewal reminders",
    partageTexte: "Add 30 November, 31 December and your insurance renewal dates to your calendar, without giving your e-mail address.",
    rappel: "A deadline is coming up and you want to compare before cancelling? An adviser can call you back. ",
    lettre: "For the letter itself, ",
    lettreLien: "the cancellation tool calculates the deadline and drafts the text",
    maj: `Updated on ${dateLongue(MAJ_IDEES, "en")}. Sources: Fedlex (LAMal, LCA).`,
    note: "This tool gives general information; your contract prevails.",
  },
};

const FAQ: Record<Locale, FaqOutil[]> = {
  fr: [
    {
      q: `Comment ajouter le fichier à mon agenda${T}?`,
      a: ["Sur iPhone, touchez le fichier téléchargé, puis choisissez d’ajouter les événements au calendrier. Sur Android, ouvrez-le avec Google Agenda ou l’agenda de votre téléphone. Dans Outlook ou sur un ordinateur, un double-clic sur le fichier l’importe. Chaque date apparaît comme un événement d’une journée, avec ses alertes."],
    },
    {
      q: `Mes dates sont-elles enregistrées quelque part${T}?`,
      a: ["Non. Le fichier est créé par votre navigateur, sur votre appareil. Nous ne recevons ni les échéances ni les noms que vous donnez à vos contrats. Seul le téléchargement est compté, sans aucune date."],
    },
    {
      q: `Quel est le délai de préavis d’une assurance${T}?`,
      a: ["La loi permet de résilier un contrat d’assurance privée pour la fin de la troisième année, puis pour la fin de chaque année, avec un préavis de trois mois (art. 35a LCA). Beaucoup de contrats auto ou ménage prévoient une résiliation chaque année ; le délai exact figure dans votre police et vos conditions générales."],
    },
    {
      q: `Que se passe-t-il si l’échéance est dépassée${T}?`,
      a: [
        "En général, le contrat se renouvelle pour une année. Une résiliation reste possible après un sinistre (art. 42 LCA), ou après une hausse de prime si vos conditions générales le prévoient. Pour l’assurance de base, une lettre reçue après le 30 novembre vaut seulement pour l’année suivante (art. 7 LAMal).",
      ],
      src: (
        <>
          Textes : <a href={LAMAL}>art. 7 LAMal</a>, <a href={LCA}>art. 35a</a> et <a href={LCA42}>42 LCA</a>.
        </>
      ),
    },
  ],
  en: [
    {
      q: "How do I add the file to my calendar?",
      a: ["On an iPhone, tap the downloaded file, then choose to add the events to your calendar. On Android, open it with Google Calendar or your phone’s calendar app. In Outlook or on a computer, double-clicking the file imports it. Each date appears as a one-day event with its alerts."],
    },
    {
      q: "Are my dates stored anywhere?",
      a: ["No. The file is created by your browser, on your device. We receive neither the dates nor the names you give your contracts. Only the download itself is counted, without any date."],
    },
    {
      q: "What is the notice period for an insurance contract?",
      a: ["The law lets you cancel a private insurance contract for the end of the third year, then for the end of each following year, with three months’ notice (art. 35a LCA). Many car and household contracts allow cancellation every year; the exact period is in your policy and general terms and conditions."],
    },
    {
      q: "What happens if I miss the deadline?",
      a: [
        "The contract usually renews for a year. You can still cancel after a claim (art. 42 LCA), or after a premium increase if your general terms and conditions allow it. For basic health insurance, a letter received after 30 November only counts for the following year (art. 7 LAMal).",
      ],
      src: (
        <>
          Texts (in French): <a href={LAMAL}>art. 7 LAMal</a>, <a href={LCA}>art. 35a</a> and <a href={LCA42}>42 LCA</a>.
        </>
      ),
    },
  ],
};

export function metadataRappels(l: Locale): Metadata {
  const t = TXT[l];
  return pageMetadata({ title: t.titre, description: t.description, path: ROUTES_IDEES.rappels[l], locale: l, ...(l === "fr" ? { enPath: ROUTES_IDEES.rappels.en } : { frPath: ROUTES_IDEES.rappels.fr }) });
}

export function PageRappels({ l }: { l: Locale }) {
  const t = TXT[l];
  const fr = l === "fr";
  const path = ROUTES_IDEES.rappels[l];
  const autre = ROUTES_IDEES.rappels[fr ? "en" : "fr"];
  const URL_ = abs(path);
  const LD = graph(
    {
      "@type": "WebPage",
      "@id": `${URL_}#webpage`,
      url: URL_,
      name: t.titre,
      description: t.description,
      inLanguage: fr ? "fr-CH" : "en",
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORG_ID },
      datePublished: MAJ_IDEES,
      dateModified: MAJ_IDEES,
      breadcrumb: { "@id": `${URL_}#breadcrumb` },
      mainEntity: { "@id": `${URL_}#outil` },
      citation: [LAMAL, LCA, LCA42],
    },
    {
      "@type": "WebApplication",
      "@id": `${URL_}#outil`,
      name: t.h1,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      inLanguage: fr ? "fr-CH" : "en",
      isAccessibleForFree: true,
      provider: { "@id": ORG_ID },
    },
    breadcrumbLd(t.miettes, `${URL_}#breadcrumb`),
    { ...faqLd(faqOutilLd(FAQ[l])), "@id": `${URL_}#faq` },
  );
  return (
    <div className="page-outil page-rappels">
      <JsonLd data={LD} />
      <SiteHeader current="sante" locale={l} altPath={autre} />
      <main id="contenu">
        <div className="wrap">
          <Breadcrumbs items={t.miettes} locale={l} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>
          <p className="prive">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 9V6a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <rect x="3" y="9" width="14" height="10" rx="1.5" fill="currentColor" />
            </svg>
            {t.prive}
          </p>
          <PartagerOutil path={path} title={t.partageTitre} text={t.partageTexte} locale={l} />
          <RappelsEcheances locale={l} aujourdhuiIso={new Date().toISOString().slice(0, 10)} />
          <p className="note-outil lien-lettre">
            {t.lettre}
            <a href={fr ? OUTILS.lettre : OUTILS_EN.lettre}>{t.lettreLien}</a>.
          </p>
          <p className="rappel-liste">
            {t.rappel}
            <LienRappel locale={l} emplacement="rappels">
              <IconeTelephone size={16} />
              {fr ? "Être rappelé" : "Call me back"}
            </LienRappel>
          </p>
        </div>
        <div className="wrap faq">
          <FaqSections faq={FAQ[l]} />
          <p className="maj">{t.maj}</p>
        </div>
      </main>
      <SiteFooter locale={l} altPath={autre} note={t.note} />
    </div>
  );
}
