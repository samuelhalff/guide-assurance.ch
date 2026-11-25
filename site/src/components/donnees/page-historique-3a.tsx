import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { AppelRappel, Faqs, N, Telechargement, nombre, type Faq } from "@/components/donnees/commun";
import * as H from "@/lib/engines/historique-3a";
import { PUBLIE_LE_SNB, SNB_3A, SOURCE_SNB, decimalesSnb, moisTexte, reperes } from "@/lib/engines/taux-snb";
import { SectionTauxBns } from "@/components/donnees/section-taux-bns";
import { CSV_ARCHIVES, SectionArchives3a } from "@/components/donnees/section-archives-3a";
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
/* Série mensuelle de la BNS (taux-snb.ts) : premier et dernier mois publiés. */
const BNS = reperes(SNB_3A.points);
/* Copies archivées des pages des banques (historique-3a.ts) : points et banques affichés. */
const ARCH = H.HISTORIQUE_ARCHIVES;
const ARCH_N = ARCH.banques.reduce((s, b) => s + b.points.length, 0);
const ARCH_DEBUT = ARCH.banques.map((b) => b.points[0].date_archive).reduce((a, b) => (b < a ? b : a));
const ARCH_FIN = ARCH.banques.map((b) => b.points[b.points.length - 1].date_archive).reduce((a, b) => (b > a ? b : a));
const tb = (x: number, l: Locale) => (l === "fr" ? `${decimalesSnb(x).replace(".", ",")}${N}%` : `${decimalesSnb(x)}%`);

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
    titre: `Taux 3a : historique depuis ${BNS.premier.mois.slice(0, 4)} (BNS) et relevés du lundi`,
    description: `Taux moyen des comptes 3a chaque mois depuis ${moisTexte(BNS.premier.mois, "fr")} selon la Banque nationale suisse, et taux de ${NB} banques relevés chaque lundi depuis le ${dc(PREMIER.date)} : graphiques et fichiers CSV.`,
    h1: "Historique des taux des comptes 3a",
    intro: `Selon la Banque nationale suisse, le taux moyen des comptes 3a était de ${tb(BNS.dernier.moyenne, "fr")} en ${moisTexte(BNS.dernier.mois, "fr")} ; sa série mensuelle commence en ${moisTexte(BNS.premier.mois, "fr")}. Nos propres relevés, faits chaque lundi depuis le ${dc(PREMIER.date)} sur les pages de ${NB} banques, donnent au ${dc(DERNIER.date)} un taux moyen de ${t3(DERNIER.moyenne, "fr")} et un taux médian de ${t2(DERNIER.mediane, "fr")}.`,
    bnsSerieTitre: `Comment les taux 3a ont-ils évolué depuis ${BNS.premier.mois.slice(0, 4)}${N}?`,
    bnsSerieNos: `La série de la BNS est la moyenne non pondérée des taux publiés par les banques qui les déclarent à la Banque nationale ; elle ne nomme aucune banque. Les relevés du lundi, plus bas, sont nos propres lectures des pages de ${NB} banques : les deux séries ne portent pas sur le même ensemble de banques et ne se comparent pas point par point.`,
    miettes: [{ name: "Accueil", href: "/" }, { name: "3e pilier", href: "/3e-pilier/" }, { name: "Taux des comptes 3a", href: OUTILS.taux3a }, { name: "Historique" }] as Miette[],
    archTitre: `Quel taux chaque banque servait-elle avant nos relevés${N}?`,
    archIntro: [
      `Relevés reconstitués à partir des copies archivées (Internet Archive) des pages officielles des banques, jamais d’un comparateur : ${ARCH_N} copies lisibles pour ${ARCH.banques.length} banques, du ${dc(ARCH_DEBUT)} au ${dc(ARCH_FIN)}. Chaque point donne le taux mentionné dans la copie archivée, à la date de cette copie, qui n’est pas la date du changement de taux. Quand la page indique une date de validité, la liste de la banque la donne, et un taux annoncé à l’avance («${N}valable dès…${N}») est placé à cette date.`,
      `Rien n’est interpolé ni prolongé sans preuve : un trait relie seulement deux copies successives qui montrent le même taux, à moins de ${H.ECART_MAX_MOIS} mois d’intervalle. Quand le taux change, l’ancien taux n’est prolongé que jusqu’à la date d’entrée en vigueur du nouveau, si la page la donne ; sinon, seuls les points sont dessinés. Les copies dont le taux ne s’attribue pas sans doute à une date ou au compte 3a de base sont écartées. Toutes les banques sont à la même échelle, avec la moyenne mensuelle de la BNS en pointillé ; certaines, notamment des banques en ligne, ont servi des taux nettement au-dessus de cette moyenne.`,
    ],
    evolTitre: `Comment le taux moyen a-t-il évolué depuis le début de nos relevés${N}?`,
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
        a: `Chaque banque fixe elle-même le taux de son compte 3a. La série mensuelle de la BNS montre l’évolution du taux moyen depuis ${moisTexte(BNS.premier.mois, "fr")}, mais cette page ne la met pas en regard du taux directeur. Nos relevés du lundi commencent le ${dc(PREMIER.date)} et ne couvrent encore aucune décision de la Banque nationale suisse. Après chaque décision, une note datée donnera ici la moyenne et la médiane du relevé d’avant et du relevé d’après.`,
      },
      {
        q: `D’où vient la série depuis ${BNS.premier.mois.slice(0, 4)}${N}?`,
        a: `De la statistique « ${SOURCE_SNB.titre_fr} » de la Banque nationale suisse (portail data.snb.ch, cube ${SOURCE_SNB.cube}), série « ${SNB_3A.libelle_fr} ». La BNS publie chaque mois la moyenne non pondérée, les quartiles et la médiane des taux annoncés par les banques. Les valeurs sont reprises telles quelles et mises à jour chaque mois après la publication de la BNS${N}; la série complète se télécharge sur le portail de la BNS.`,
      },
      {
        q: `Comment l’historique de chaque banque avant le ${dc(PREMIER.date)} est-il reconstitué${N}?`,
        a: `Les relevés sont reconstitués à partir des copies archivées (Internet Archive) des pages officielles des banques et de leurs fiches de taux, jamais d’un comparateur. Chaque taux renvoie à sa copie archivée et donne le taux mentionné à la date de cette copie, pas la date du changement de taux, sauf quand la page indique une date de validité. Les copies ambiguës sont écartées, rien n’est interpolé ni prolongé au-delà de ce que montrent les copies, et une banque n’a de graphique qu’avec au moins ${H.MIN_POINTS} copies lisibles.`,
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
        a: `Oui. Le fichier CSV de nos relevés est publié sous licence Creative Commons CC${N}BY${N}4.0 : il est possible de le reprendre, y compris dans un article ou une étude, en citant « Guide Assurance, d’après les pages des banques » et la date du relevé. La série de la BNS se cite « Banque nationale suisse (BNS), data.snb.ch », avec le mois et la date de publication ; elle reste soumise aux conditions d’utilisation de la BNS.`,
      },
    ] as Faq[],
    maj: `Dernier relevé le ${dateLongue(DERNIER.date, "fr")}, sur les pages des banques ; série de la BNS publiée le ${dateLongue(PUBLIE_LE_SNB, "fr")}. Les taux sont variables et seul le site de la banque fait foi.`,
    footer: "Ces taux sont donnés à titre d’information. Les conditions de la banque font foi.",
  },
  en: {
    path: PAGES_DONNEES_EN.historique3a,
    alt: PAGES_DONNEES.historique3a,
    titre: `Pillar 3a interest rates: history since ${BNS.premier.mois.slice(0, 4)} (SNB) and weekly surveys`,
    description: `Mean pillar 3a account rate every month since ${moisTexte(BNS.premier.mois, "en")} according to the Swiss National Bank, and the rates of ${NB} banks read every Monday since ${dc(PREMIER.date)}: charts and CSV files.`,
    h1: "Pillar 3a interest rate history",
    intro: `According to the Swiss National Bank, the mean pillar 3a account rate was ${tb(BNS.dernier.moyenne, "en")} in ${moisTexte(BNS.dernier.mois, "en")}; its monthly series starts in ${moisTexte(BNS.premier.mois, "en")}. Our own surveys, made every Monday since ${dc(PREMIER.date)} on the pages of ${NB} banks, give a mean rate of ${t3(DERNIER.moyenne, "en")} and a median of ${t2(DERNIER.mediane, "en")} on ${dc(DERNIER.date)}.`,
    bnsSerieTitre: `How have pillar 3a rates moved since ${BNS.premier.mois.slice(0, 4)}?`,
    bnsSerieNos: `The SNB series is the unweighted average of the rates published by the banks that report them to the Swiss National Bank; it names no bank. The Monday surveys below are our own readings of ${NB} banks’ pages: the two series do not cover the same set of banks and cannot be compared point by point.`,
    miettes: [{ name: "Home", href: "/en/" }, { name: "Pillar 3a", href: "/en/pillar-3a/" }, { name: "3a interest rates", href: OUTILS_EN.taux3a }, { name: "History" }] as Miette[],
    archTitre: "What rate did each bank pay before our surveys?",
    archIntro: [
      `Readings reconstructed from archived copies (Internet Archive) of the banks’ official pages, never from a comparison site: ${ARCH_N} readable copies for ${ARCH.banques.length} banks, from ${dc(ARCH_DEBUT)} to ${dc(ARCH_FIN)}. Each point is the rate stated in the archived copy, on the date of that copy, which is not the date the rate changed. When the page states a validity date, the bank’s list gives it, and a rate announced in advance (“valid from…”) is placed on that date.`,
      `Nothing is interpolated or extended without evidence: a line only joins two consecutive copies showing the same rate, less than ${H.ECART_MAX_MOIS} months apart. When the rate changes, the old rate is extended only up to the date the new one took effect, if the page gives it; otherwise only the points are drawn. Copies whose rate cannot be tied with certainty to a date or to the basic 3a account are left out. All banks share the same scale, with the SNB monthly average dotted; some, online banks in particular, paid rates well above that average.`,
    ],
    evolTitre: "How has the mean rate moved since our surveys began?",
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
        a: `Each bank sets its own pillar 3a rate. The SNB’s monthly series shows how the mean rate has moved since ${moisTexte(BNS.premier.mois, "en")}, but this page does not set it against the policy rate. Our Monday surveys start on ${dc(PREMIER.date)} and do not yet cover any Swiss National Bank decision. After each decision, a dated note here will give the mean and median of the survey before and the survey after.`,
      },
      {
        q: `Where does the series since ${BNS.premier.mois.slice(0, 4)} come from?`,
        a: `From the Swiss National Bank statistic “${SOURCE_SNB.titre_en}” (data.snb.ch portal, cube ${SOURCE_SNB.cube}), series “${SNB_3A.libelle_en}”. Each month the SNB publishes the unweighted average, the quartiles and the median of the rates reported by banks. The values are used as published and updated every month after the SNB release; the full series can be downloaded from the SNB data portal.`,
      },
      {
        q: `How is each bank’s history before ${dc(PREMIER.date)} reconstructed?`,
        a: `The readings are reconstructed from archived copies (Internet Archive) of the banks’ official pages and rate sheets, never from a comparison site. Each rate links to its archived copy and is the rate stated on the date of that copy, not the date the rate changed, unless the page states a validity date. Ambiguous copies are left out, nothing is interpolated or extended beyond what the copies show, and a bank gets a chart only with at least ${H.MIN_POINTS} readable copies.`,
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
        a: "Yes. The CSV file of our surveys is published under a Creative Commons CC BY 4.0 licence: you may reuse it, including in an article or a study, by citing “Guide Assurance, from the banks’ pages” and the survey date. The SNB series is cited as “Swiss National Bank (SNB), data.snb.ch”, with the month and release date; it remains subject to the SNB’s terms of use.",
      },
    ] as Faq[],
    maj: `Latest survey on ${dateLongue(DERNIER.date, "en")}, on the banks’ pages; SNB series released on ${dateLongue(PUBLIE_LE_SNB, "en")}. Rates are variable, and the bank’s website is authoritative.`,
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
      // Uniquement nos relevés hebdomadaires (licence CC BY) : la série BNS est décrite dans #serie-bns, sans licence.
      description: fr
        ? `Taux d’intérêt de base du compte 3a de ${NB} banques, relevés chaque lundi par Guide Assurance sur leurs pages officielles depuis le ${dc(PREMIER.date)}.`
        : `Base interest rate of the pillar 3a account at ${NB} banks, read every Monday by Guide Assurance on their official pages since ${dc(PREMIER.date)}.`,
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
    {
      "@type": "Dataset",
      "@id": `${url}#serie-bns`,
      name: fr ? "Taux d’intérêt des comptes 3a selon la Banque nationale suisse, chaque mois" : "Pillar 3a account interest rates according to the Swiss National Bank, monthly",
      description: fr
        ? `Moyenne non pondérée, quartiles et médiane des taux des comptes de prévoyance liée (pilier 3a) publiés par les banques, selon la statistique de la BNS « ${SOURCE_SNB.titre_fr} » (cube ${SOURCE_SNB.cube}), fin de mois, depuis ${moisTexte(BNS.premier.mois, "fr")}.`
        : `Unweighted average, quartiles and median of tied pension provision (pillar 3a) account rates published by banks, from the SNB statistic “${SOURCE_SNB.titre_en}” (cube ${SOURCE_SNB.cube}), end of month, since ${moisTexte(BNS.premier.mois, "en")}.`,
      inLanguage: fr ? "fr-CH" : "en",
      temporalCoverage: `${BNS.premier.mois}/${BNS.dernier.mois}`,
      dateModified: PUBLIE_LE_SNB,
      isAccessibleForFree: true,
      creator: { "@type": "Organization", name: fr ? SOURCE_SNB.organisme_fr : SOURCE_SNB.organisme_en, url: "https://www.snb.ch/" },
      url: fr ? SOURCE_SNB.page_fr : SOURCE_SNB.page_en,
      isBasedOn: fr ? SOURCE_SNB.page_fr : SOURCE_SNB.page_en,
      usageInfo: fr ? SOURCE_SNB.conditions_fr : SOURCE_SNB.conditions_en,
      creditText: fr ? "Banque nationale suisse (BNS), data.snb.ch" : "Swiss National Bank (SNB), data.snb.ch",
      variableMeasured: fr ? "Taux d’intérêt des comptes 3a (% par an) : moyenne, quartiles, médiane" : "Pillar 3a account interest rate (% a year): mean, quartiles, median",
    },
    {
      "@type": "Dataset",
      "@id": `${url}#archives`,
      name: fr ? "Taux des comptes 3a par banque d’après les copies archivées de leurs pages" : "Pillar 3a account rates by bank from archived copies of their pages",
      description: fr
        ? `Taux de base des comptes 3a de ${ARCH.banques.length} banques suisses, reconstitués à partir des copies archivées (Internet Archive) de leurs pages officielles, du ${dc(ARCH_DEBUT)} au ${dc(ARCH_FIN)}. Chaque ligne cite sa copie archivée.`
        : `Base rates of pillar 3a accounts at ${ARCH.banques.length} Swiss banks, reconstructed from archived copies (Internet Archive) of their official pages, from ${dc(ARCH_DEBUT)} to ${dc(ARCH_FIN)}. Each row cites its archived copy.`,
      inLanguage: fr ? "fr-CH" : "en",
      temporalCoverage: `${ARCH_DEBUT}/${ARCH_FIN}`,
      dateModified: H.ARCHIVES_GENERE_LE,
      isAccessibleForFree: true,
      license: LICENCE_DONNEES,
      creator: { "@id": ORG_ID },
      creditText: fr ? "Guide Assurance, d’après les copies archivées (Internet Archive) des pages des banques" : "Guide Assurance, from archived copies (Internet Archive) of the banks’ pages",
      measurementTechnique: fr ? "Lecture des copies archivées (Wayback Machine) des pages officielles et fiches de taux des banques" : "Reading of archived copies (Wayback Machine) of the banks’ official pages and rate sheets",
      variableMeasured: fr ? "Taux d’intérêt annuel de base du compte 3a (%)" : "Annual base interest rate of the pillar 3a account (%)",
      distribution: [{ "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: abs(CSV_ARCHIVES) }],
    },
    breadcrumbLd(t.miettes, `${url}#breadcrumb`),
    { ...faqLd(t.faq), "@id": `${url}#faq` },
  );
  return (
    <div className="page-outil page-donnees">
      <JsonLd data={ld} />
      <SiteHeader current="prevoyance" locale={locale} altPath={t.alt} />
      <main id="contenu">
        <div className="wrap">
          <Breadcrumbs items={t.miettes} locale={locale} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>

          <SectionTauxBns
            serie={SNB_3A}
            locale={locale}
            id="serie-bns"
            titre={t.bnsSerieTitre}
            produit={{ fr: "des comptes 3a", en: "on pillar 3a accounts" }}
            nosReleves={t.bnsSerieNos}
          />

          <SectionArchives3a locale={locale} titre={t.archTitre} intro={t.archIntro} />

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
