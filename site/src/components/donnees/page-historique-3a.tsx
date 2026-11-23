import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { AppelRappel, Faqs, N, Telechargement, nombre, type Faq } from "@/components/donnees/commun";
import * as H from "@/lib/engines/historique-3a";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { DATE_PAGE_DONNEES, LICENCE_DONNEES } from "@/lib/donnees";
import { dateLongue, type Locale } from "@/lib/i18n";
import { OUTILS, OUTILS_EN, PAGES_DONNEES, PAGES_DONNEES_EN } from "@/lib/nav";
import { Alert } from "@/components/ui/alert";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/* Historique des taux des comptes 3a (idée 2 du rapport 08) : un relevé chaque lundi depuis le 22.11.2026,
   moyenne et médiane par date, graphique SVG (le tableau reste la source), CSV, notes datées aux décisions de la
   BNS (seulement avec un relevé de part et d'autre). Aucune banque mise en avant : tri par taux, puis par nom. */

const CSV = "/data/taux-3a-historique.csv";
const DERNIER = H.SERIE[H.SERIE.length - 1];
const PREMIER = H.SERIE[0];
const NB = DERNIER.n;
const t2 = (x: number, l: Locale) => (l === "fr" ? `${nombre(x, "fr", 2)}${N}%` : `${nombre(x, "en", 2)}%`);
const t3 = (x: number, l: Locale) => (l === "fr" ? `${nombre(x, "fr", 3).replace(/0$/, "")}${N}%` : `${nombre(x, "en", 3).replace(/0$/, "")}%`);
const dc = (iso: string) => iso.split("-").reverse().join(".");

/* Comptes du dernier relevé, avec leur taux au premier relevé. */
const PREMIERS = new Map(H.RELEVES[0].comptes.map((c) => [c.id, c.taux]));
const COMPTES = [...H.RELEVES[H.RELEVES.length - 1].comptes].sort((a, b) => b.taux - a.taux || a.banque.localeCompare(b.banque, "fr"));
const NB_CHANGES = COMPTES.filter((c) => PREMIERS.has(c.id) && PREMIERS.get(c.id) !== c.taux).length;

/* Graphique : moyenne, médiane et plage (du plus bas au plus haut) par relevé. */
function Graphique({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  const W = 640, Hh = 260, g = 44, d = 16, h = 16, b = 34;
  const xs = H.SERIE.map((p) => Date.parse(p.date));
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const ymax = Math.max(0.5, Math.ceil(Math.max(...H.SERIE.map((p) => p.max)) * 4 + 0.5) / 4);
  const X = (t: number) => (x1 === x0 ? (g + W - d) / 2 : g + ((t - x0) / (x1 - x0)) * (W - g - d));
  const Y = (v: number) => h + (1 - v / ymax) * (Hh - h - b);
  const pts = (k: "moyenne" | "mediane") => H.SERIE.map((p, i) => `${X(xs[i]).toFixed(1)},${Y(p[k]).toFixed(1)}`).join(" ");
  const bande = [...H.SERIE.map((p, i) => `${X(xs[i]).toFixed(1)},${Y(p.max).toFixed(1)}`), ...H.SERIE.map((p, i) => `${X(xs[i]).toFixed(1)},${Y(p.min).toFixed(1)}`).reverse()].join(" ");
  const graduations = Array.from({ length: Math.round(ymax / 0.25) + 1 }, (_, i) => i * 0.25);
  const titre = fr ? "Taux des comptes 3a à chaque relevé" : "Pillar 3a account rates at each survey";
  const desc = fr
    ? `Du ${dc(PREMIER.date)} au ${dc(DERNIER.date)}, le taux moyen passe de ${t3(PREMIER.moyenne, "fr")} à ${t3(DERNIER.moyenne, "fr")} et le taux médian de ${t2(PREMIER.mediane, "fr")} à ${t2(DERNIER.mediane, "fr")}. Les valeurs exactes sont dans le tableau qui suit.`
    : `From ${dc(PREMIER.date)} to ${dc(DERNIER.date)}, the mean rate goes from ${t3(PREMIER.moyenne, "en")} to ${t3(DERNIER.moyenne, "en")} and the median from ${t2(PREMIER.mediane, "en")} to ${t2(DERNIER.mediane, "en")}. The exact values are in the table below.`;
  return (
    <figure className="graphique-3a">
      <svg viewBox={`0 0 ${W} ${Hh}`} role="img" aria-labelledby="g3a-titre g3a-desc">
        <title id="g3a-titre">{titre}</title>
        <desc id="g3a-desc">{desc}</desc>
        {graduations.map((v) => (
          <g key={v}>
            <line className="grille" x1={g} x2={W - d} y1={Y(v)} y2={Y(v)} />
            <text className="axe" x={g - 6} y={Y(v) + 4} textAnchor="end">{fr ? nombre(v, "fr", 2) : nombre(v, "en", 2)}</text>
          </g>
        ))}
        <polygon className="bande" points={bande} />
        <polyline className="ligne moyenne" points={pts("moyenne")} />
        <polyline className="ligne mediane" points={pts("mediane")} />
        {H.SERIE.map((p, i) => (
          <g key={p.date}>
            <circle className="point moyenne" cx={X(xs[i])} cy={Y(p.moyenne)} r={4} />
            <circle className="point mediane" cx={X(xs[i])} cy={Y(p.mediane)} r={4} />
          </g>
        ))}
        {[0, H.SERIE.length - 1].filter((i, k, a) => a.indexOf(i) === k).map((i) => (
          <text key={i} className="axe" x={X(xs[i])} y={Hh - 10} textAnchor={H.SERIE.length === 1 ? "middle" : i === 0 ? "start" : "end"}>
            {dc(H.SERIE[i].date)}
          </text>
        ))}
        <text className="axe" x={g - 6} y={10} textAnchor="end">%</text>
      </svg>
      <figcaption>
        <span className="cle moyenne">{fr ? "Taux moyen" : "Mean rate"}</span>
        <span className="cle mediane">{fr ? "Taux médian" : "Median rate"}</span>
        <span className="cle bande">{fr ? "Du taux le plus bas au plus haut" : "Lowest to highest rate"}</span>
      </figcaption>
    </figure>
  );
}

const TXT = {
  fr: {
    path: PAGES_DONNEES.historique3a,
    alt: PAGES_DONNEES_EN.historique3a,
    titre: "Taux 3a : historique des relevés chaque lundi",
    description: `Taux des comptes 3a de ${NB} banques suisses relevés chaque lundi depuis le ${dc(PREMIER.date)}, avec moyenne, médiane, graphique et fichier CSV à télécharger.`,
    h1: "Historique des taux des comptes 3a",
    intro: `Au relevé du ${dc(DERNIER.date)}, le taux moyen des ${NB} comptes 3a suivis est de ${t3(DERNIER.moyenne, "fr")} et le taux médian de ${t2(DERNIER.mediane, "fr")}. Les taux sont lus chaque lundi sur les pages des banques depuis le ${dc(PREMIER.date)}, et chaque relevé reste dans l’historique.`,
    miettes: [{ name: "Accueil", href: "/" }, { name: "3e pilier", href: "/3e-pilier/" }, { name: "Taux des comptes 3a", href: OUTILS.taux3a }, { name: "Historique" }] as Miette[],
    evolTitre: `Comment le taux moyen a-t-il évolué depuis le début du relevé${N}?`,
    evol:
      H.SERIE.length < 2
        ? `Un seul relevé existe pour l’instant.`
        : PREMIER.moyenne === DERNIER.moyenne && PREMIER.mediane === DERNIER.mediane
          ? `Il n’a pas bougé : du ${dc(PREMIER.date)} au ${dc(DERNIER.date)}, la moyenne reste à ${t3(DERNIER.moyenne, "fr")} et la médiane à ${t2(DERNIER.mediane, "fr")}, sur ${H.SERIE.length} relevés. La série commence le ${dc(PREMIER.date)} ; elle s’allonge d’un point chaque semaine.`
          : `Du ${dc(PREMIER.date)} au ${dc(DERNIER.date)}, la moyenne passe de ${t3(PREMIER.moyenne, "fr")} à ${t3(DERNIER.moyenne, "fr")} et la médiane de ${t2(PREMIER.mediane, "fr")} à ${t2(DERNIER.mediane, "fr")}, sur ${H.SERIE.length} relevés.`,
    serieCaption: "Taux des comptes 3a à chaque relevé, en % par an",
    thDate: "Relevé",
    thN: "Comptes",
    thMoy: "Moyenne",
    thMed: "Médiane",
    thPlage: "Du plus bas au plus haut",
    plage: (a: number, b: number) => `${nombre(a, "fr", 2)} à ${nombre(b, "fr", 2)}`,
    banquesTitre: `Quelles banques ont changé leur taux depuis le premier relevé${N}?`,
    banques:
      NB_CHANGES === 0
        ? `Aucune pour l’instant. Le tableau donne le taux de chaque compte au premier et au dernier relevé, trié du taux le plus élevé au plus bas puis par nom ; la colonne « en vigueur depuis » reprend la date publiée par la banque.`
        : `${NB_CHANGES === 1 ? "Une banque a" : `${NB_CHANGES} banques ont`} changé leur taux. Le tableau donne le taux de chaque compte au premier et au dernier relevé, trié du taux le plus élevé au plus bas puis par nom.`,
    banquesCaption: `Taux de base des comptes 3a, en % par an`,
    thBanque: "Banque",
    thPremier: `Le ${dc(PREMIER.date)}`,
    thDernier: `Le ${dc(DERNIER.date)}`,
    thDepuis: "En vigueur depuis",
    bnsTitre: `Que change une décision de la Banque nationale${N}?`,
    bnsVide: `Aucune décision de politique monétaire de la BNS n’a encore eu lieu depuis le début du relevé. Après la prochaine, une note datée donnera ici le taux moyen et le taux médian du dernier relevé avant la décision et du premier relevé après, sans autre interprétation.`,
    bnsNote: (n: H.NoteBns) => {
      const a = H.pointDu(n.avant)!, p = H.pointDu(n.apres)!;
      return `Le ${dc(n.date)}, ${n.decision_fr} Le taux moyen des comptes 3a passe de ${t3(a.moyenne, "fr")} (relevé du ${dc(n.avant)}) à ${t3(p.moyenne, "fr")} (relevé du ${dc(n.apres)}), et le taux médian de ${t2(a.mediane, "fr")} à ${t2(p.mediane, "fr")}.`;
    },
    lienTaux: `Où en sont les taux aujourd’hui${N}?`,
    lienTauxTexte: "La liste complète, avec les conditions de chaque compte et le lien vers la page de la banque.",
    csv: "Télécharger l’historique (CSV)",
    csvDetail: `Une ligne par relevé et par compte : date, banque, taux, date d’entrée en vigueur. Licence CC${N}BY${N}4.0, en citant les pages des banques.`,
    rappelQ: `Une question sur votre 3e pilier${N}?`,
    faq: [
      {
        q: `Les taux 3a suivent-ils le taux directeur de la BNS${N}?`,
        a: `Chaque banque fixe elle-même le taux de son compte 3a. Le relevé commence le ${dc(PREMIER.date)} et ne couvre encore aucune décision de la Banque nationale suisse : il ne permet donc pas de mesurer ce lien. Après chaque décision, une note datée donnera ici la moyenne et la médiane du relevé d’avant et du relevé d’après.`,
      },
      {
        q: `Pourquoi donner une moyenne et une médiane${N}?`,
        a: `La moyenne réagit à chaque changement, y compris celui d’une seule banque qui s’écarte beaucoup des autres. La médiane donne le taux du compte du milieu de la liste et bouge seulement quand une bonne partie des banques change. Les deux sont calculées sans pondération : chaque compte compte pour un, quelle que soit la taille de la banque.`,
      },
      {
        q: `Comment les taux sont-ils relevés${N}?`,
        a: `Un script lit chaque lundi matin la page officielle ou la fiche de taux PDF de chacune des ${NB} banques, et jamais un comparateur. Si une page ne se lit plus ou si une valeur paraît invraisemblable, rien n’est publié et le relevé est vérifié à la main. Le relevé de chaque date reste tel quel dans l’historique.`,
      },
      {
        q: `Puis-je réutiliser ces données${N}?`,
        a: `Oui. Le fichier CSV est publié sous licence Creative Commons CC${N}BY${N}4.0 : il est possible de le reprendre, y compris dans un article ou une étude, en citant « Guide Assurance, d’après les pages des banques » et la date du relevé.`,
      },
    ] as Faq[],
    maj: `Dernier relevé le ${dateLongue(DERNIER.date, "fr")}, sur les pages des banques. Les taux sont variables et seul le site de la banque fait foi.`,
    footer: "Ces taux sont donnés à titre d’information. Les conditions de la banque font foi.",
  },
  en: {
    path: PAGES_DONNEES_EN.historique3a,
    alt: PAGES_DONNEES.historique3a,
    titre: "Pillar 3a interest rates: weekly history",
    description: `Pillar 3a account rates at ${NB} Swiss banks, read every Monday since ${dc(PREMIER.date)}, with mean, median, a chart and a CSV file to download.`,
    h1: "Pillar 3a interest rate history",
    intro: `In the survey of ${dc(DERNIER.date)}, the mean rate of the ${NB} pillar 3a accounts tracked is ${t3(DERNIER.moyenne, "en")} and the median ${t2(DERNIER.mediane, "en")}. Rates have been read every Monday on the banks’ own pages since ${dc(PREMIER.date)}, and every survey stays in the history.`,
    miettes: [{ name: "Home", href: "/en/" }, { name: "Pillar 3a", href: "/en/pillar-3a/" }, { name: "3a interest rates", href: OUTILS_EN.taux3a }, { name: "History" }] as Miette[],
    evolTitre: "How has the mean rate moved since the survey began?",
    evol:
      H.SERIE.length < 2
        ? "There is only one survey so far."
        : PREMIER.moyenne === DERNIER.moyenne && PREMIER.mediane === DERNIER.mediane
          ? `It has not moved: from ${dc(PREMIER.date)} to ${dc(DERNIER.date)}, the mean stays at ${t3(DERNIER.moyenne, "en")} and the median at ${t2(DERNIER.mediane, "en")}, over ${H.SERIE.length} surveys. The series starts on ${dc(PREMIER.date)} and gains one point a week.`
          : `From ${dc(PREMIER.date)} to ${dc(DERNIER.date)}, the mean goes from ${t3(PREMIER.moyenne, "en")} to ${t3(DERNIER.moyenne, "en")} and the median from ${t2(PREMIER.mediane, "en")} to ${t2(DERNIER.mediane, "en")}, over ${H.SERIE.length} surveys.`,
    serieCaption: "Pillar 3a account rates at each survey, in % a year",
    thDate: "Survey",
    thN: "Accounts",
    thMoy: "Mean",
    thMed: "Median",
    thPlage: "Lowest to highest",
    plage: (a: number, b: number) => `${nombre(a, "en", 2)} to ${nombre(b, "en", 2)}`,
    banquesTitre: "Which banks have changed their rate since the first survey?",
    banques:
      NB_CHANGES === 0
        ? "None so far. The table gives each account’s rate at the first and the latest survey, sorted from the highest rate to the lowest, then by name; the “in force since” column shows the date published by the bank."
        : `${NB_CHANGES === 1 ? "One bank has" : `${NB_CHANGES} banks have`} changed their rate. The table gives each account’s rate at the first and the latest survey, sorted from the highest rate to the lowest, then by name.`,
    banquesCaption: "Base rate of pillar 3a accounts, in % a year",
    thBanque: "Bank",
    thPremier: `On ${dc(PREMIER.date)}`,
    thDernier: `On ${dc(DERNIER.date)}`,
    thDepuis: "In force since",
    bnsTitre: "What does a Swiss National Bank decision change?",
    bnsVide: "The SNB has not taken a monetary policy decision since the survey began. After the next one, a dated note here will give the mean and median rate of the last survey before the decision and the first survey after it, with no further interpretation.",
    bnsNote: (n: H.NoteBns) => {
      const a = H.pointDu(n.avant)!, p = H.pointDu(n.apres)!;
      return `On ${dc(n.date)}, ${n.decision_en} The mean pillar 3a rate goes from ${t3(a.moyenne, "en")} (survey of ${dc(n.avant)}) to ${t3(p.moyenne, "en")} (survey of ${dc(n.apres)}), and the median from ${t2(a.mediane, "en")} to ${t2(p.mediane, "en")}.`;
    },
    lienTaux: "Where do rates stand today?",
    lienTauxTexte: "The full list, with each account’s conditions and a link to the bank’s page.",
    csv: "Download the history (CSV)",
    csvDetail: "One row per survey and account: date, bank, rate, date in force. Licence CC BY 4.0, citing the banks’ pages.",
    rappelQ: "A question about your pillar 3a?",
    faq: [
      {
        q: "Do pillar 3a rates follow the SNB policy rate?",
        a: `Each bank sets its own pillar 3a rate. The survey starts on ${dc(PREMIER.date)} and does not yet cover any Swiss National Bank decision, so it cannot measure that link yet. After each decision, a dated note here will give the mean and median of the survey before and the survey after.`,
      },
      {
        q: "Why give both a mean and a median?",
        a: "The mean reacts to every change, including one bank moving far from the others. The median is the rate of the account in the middle of the list and moves only when a good share of banks change. Both are unweighted: each account counts once, whatever the size of the bank.",
      },
      {
        q: "How are the rates collected?",
        a: `Every Monday morning a script reads the official page or PDF rate sheet of each of the ${NB} banks, never a comparison site. If a page can no longer be read or a value looks implausible, nothing is published and the survey is checked by hand. Each date’s survey stays as it is in the history.`,
      },
      {
        q: "Can I reuse this data?",
        a: "Yes. The CSV file is published under a Creative Commons CC BY 4.0 licence: you may reuse it, including in an article or a study, by citing “Guide Assurance, from the banks’ pages” and the survey date.",
      },
    ] as Faq[],
    maj: `Latest survey on ${dateLongue(DERNIER.date, "en")}, on the banks’ pages. Rates are variable, and the bank’s website is authoritative.`,
    footer: "These rates are for information only. The bank’s conditions are authoritative.",
  },
};

export const metaHistorique3a = (locale: Locale) => {
  const t = TXT[locale];
  return pageMetadata({ title: t.titre, description: t.description, path: t.path, locale, ...(locale === "fr" ? { enPath: t.alt } : { frPath: t.alt }) });
};

export function PageHistorique3a({ locale }: { locale: Locale }) {
  const t = TXT[locale];
  const fr = locale === "fr";
  const url = abs(t.path);
  const ld = graph(
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: t.titre,
      description: t.description,
      inLanguage: fr ? "fr-CH" : "en",
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORG_ID },
      datePublished: "2026-11-23",
      dateModified: DATE_PAGE_DONNEES.historique3a,
      breadcrumb: { "@id": `${url}#breadcrumb` },
      mainEntity: { "@id": `${url}#serie` },
    },
    {
      "@type": "Dataset",
      "@id": `${url}#serie`,
      name: fr ? "Historique des taux des comptes 3a en Suisse" : "Pillar 3a account interest rate history, Switzerland",
      description: t.description,
      inLanguage: fr ? "fr-CH" : "en",
      temporalCoverage: `${PREMIER.date}/..`,
      dateModified: DERNIER.date,
      isAccessibleForFree: true,
      license: LICENCE_DONNEES,
      creator: { "@id": ORG_ID },
      creditText: fr ? "Guide Assurance, d’après les pages officielles des banques" : "Guide Assurance, from the banks’ official pages",
      measurementTechnique: fr ? "Lecture hebdomadaire des pages officielles et fiches de taux des banques" : "Weekly reading of the banks’ official pages and rate sheets",
      variableMeasured: fr ? "Taux d’intérêt annuel de base du compte 3a (%)" : "Annual base interest rate of the pillar 3a account (%)",
      distribution: [{ "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: abs(CSV) }],
    },
    breadcrumbLd(t.miettes, `${url}#breadcrumb`),
    { ...faqLd(t.faq), "@id": `${url}#faq` },
  );
  return (
    <div className="page-outil page-donnees">
      <JsonLd data={ld} />
      <SiteHeader current="prevoyance" locale={locale} altPath={t.alt} />
      <main>
        <div className="wrap">
          <Breadcrumbs items={t.miettes} locale={locale} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>

          <section className="reperes-statiques">
            <h2>{t.evolTitre}</h2>
            <p>{t.evol}</p>
            <Graphique locale={locale} />
            <Table variant="chiffres" className="table-donnees">
              <TableCaption>{t.serieCaption}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t.thDate}</TableHead>
                  <TableHead scope="col">{t.thN}</TableHead>
                  <TableHead scope="col">{t.thMoy}</TableHead>
                  <TableHead scope="col">{t.thMed}</TableHead>
                  <TableHead scope="col">{t.thPlage}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...H.SERIE].reverse().map((p) => (
                  <TableRow key={p.date}>
                    <TableHead scope="row"><time dateTime={p.date}>{dc(p.date)}</time></TableHead>
                    <TableCell>{p.n}</TableCell>
                    <TableCell><b>{nombre(p.moyenne, locale, 3)}</b></TableCell>
                    <TableCell><b>{nombre(p.mediane, locale, 2)}</b></TableCell>
                    <TableCell>{t.plage(p.min, p.max)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Telechargement href={CSV} libelle={t.csv} detail={t.csvDetail} />
          </section>

          <section className="reperes-statiques" id="bns">
            <h2>{t.bnsTitre}</h2>
            {H.NOTES_BNS.length === 0 ? (
              <p>{t.bnsVide}</p>
            ) : (
              H.NOTES_BNS.map((n) => (
                <p key={n.date} id={`bns-${n.date}`}>
                  {t.bnsNote(n)}
                </p>
              ))
            )}
          </section>

          <section className="reperes-statiques">
            <h2>{t.banquesTitre}</h2>
            <p>{t.banques}</p>
            <Table variant="chiffres" className="table-donnees">
              <TableCaption>{t.banquesCaption}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t.thBanque}</TableHead>
                  <TableHead scope="col">{t.thPremier}</TableHead>
                  <TableHead scope="col">{t.thDernier}</TableHead>
                  <TableHead scope="col">{t.thDepuis}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMPTES.map((c) => (
                  <TableRow key={c.id}>
                    <TableHead scope="row">{c.banque}</TableHead>
                    <TableCell>{PREMIERS.has(c.id) ? nombre(PREMIERS.get(c.id)!, locale, 2) : ""}</TableCell>
                    <TableCell><b>{nombre(c.taux, locale, 2)}</b></TableCell>
                    <TableCell>{c.taux_valable_des ? dc(c.taux_valable_des) : fr ? "non publié" : "not published"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <Alert variant="info" className="lien-outil-3a">
            <p>
              <a href={fr ? OUTILS.taux3a : OUTILS_EN.taux3a}>{t.lienTaux}</a> {t.lienTauxTexte}
            </p>
          </Alert>
          <AppelRappel locale={locale} sujet="prevoyance" question={t.rappelQ} />
        </div>
        <Faqs faq={t.faq} maj={t.maj} />
      </main>
      <SiteFooter note={t.footer} locale={locale} altPath={t.alt} />
    </div>
  );
}
