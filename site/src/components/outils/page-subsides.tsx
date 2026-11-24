import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { PartagerOutil } from "@/components/site/partager-outil";
import { Subsides } from "@/components/outils/subsides";
import { CtaOffres } from "@/components/outils/cta-offres";
import { Alert } from "@/components/ui/alert";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DONNEES as D, CANTONS, type Canton } from "@/lib/engines/subsides";
import { NOMS, TRANSPARENCE_VD } from "@/lib/subsides";
import { lienDemande } from "@/lib/demande";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { DATE_PAGE } from "@/lib/donnees";
import { dateLongue } from "@/lib/i18n";
import { OUTILS, OUTILS_EN, PAGES_DONNEES, PAGES_DONNEES_EN } from "@/lib/nav";
import type { Locale } from "@/lib/i18n";
import { nombre, ESPACE_FINE as N } from "@/lib/nombres";

/* Page « Subsides d'assurance maladie 2027 » (FR et EN). Les fichiers de route ne font qu'appeler ces fonctions.
   Tout ce qui est quoté (paragraphe et tableau de chaque canton) est dans le HTML statique, sans JavaScript. */
const K = D.cantons;
const LE = dateLongue(D.releve_le, "fr");
const LE_EN = dateLongue(D.releve_le, "en");

type Faq = { q: string; a: string };

const TEXTE = {
  fr: {
    path: OUTILS.subsides,
    alt: OUTILS_EN.subsides,
    titre: `Subsides assurance maladie 2027 par canton romand`,
    description: `Subsides d’assurance maladie 2027 à Genève, Vaud, Fribourg, Neuchâtel et Jura${N}: limites de revenu officielles, montants mensuels et prime après subside.`,
    h1: `Subsides d’assurance maladie 2027${N}: montants et limites de revenu par canton`,
    intro: `Chaque canton romand fixe ses propres limites de revenu et ses montants de subside. Cette page reprend les barèmes officiels 2027 de Genève, Vaud, Fribourg, Neuchâtel et du Jura, lus dans les textes des offices cantonaux le ${LE}, et estime votre subside et la prime qui reste à votre charge. Le Valais n’a pas encore publié son barème 2027 : aucun montant n’est donné pour lui.`,
    miettes: [{ name: "Accueil", href: "/" }, { name: "Assurance maladie", href: "/assurance-maladie/" }, { name: "Subsides 2027" }] as Miette[],
    appli: "Subsides d’assurance maladie 2027",
    partage: "Limites de revenu et montants officiels des subsides d’assurance maladie 2027 en Suisse romande, avec une estimation.",
    hBaremes: `Les barèmes officiels 2027, canton par canton`,
    baremesIntro: `Chaque tableau reprend le barème publié par le canton, sans arrondi ni correction. La source et la date de lecture sont indiquées sous chacun. Le revenu déterminant n’a pas la même définition d’un canton à l’autre : on ne peut pas comparer les limites telles quelles.`,
    source: "Source",
    lu: (d: string) => `relevé le ${d}`,
    liens: `Pour aller plus loin`,
    footer: "Ces montants sont indicatifs. Seule la décision de l’office cantonal fait foi.",
    maj: `Barèmes lus le ${LE} dans les textes officiels des cantons. Primes moyennes : OFSP, 2027.`,
    oui: "oui",
    non: "non",
  },
  en: {
    path: OUTILS_EN.subsides,
    alt: OUTILS.subsides,
    titre: `Health insurance subsidies 2027 by Swiss canton`,
    description: `2027 health insurance subsidies in Geneva, Vaud, Fribourg, Neuchâtel and Jura: official income limits, monthly amounts and your premium after subsidy.`,
    h1: `2027 health insurance subsidies: amounts and income limits by canton`,
    intro: `Each French-speaking canton sets its own income limits and subsidy amounts. This page reproduces the official 2027 scales of Geneva, Vaud, Fribourg, Neuchâtel and Jura, read in the cantonal offices’ texts on ${LE_EN}, and estimates your subsidy and the premium left to pay. Valais has not yet published its 2027 scale, so no amount is given for it.`,
    miettes: [{ name: "Home", href: "/en/" }, { name: "Health insurance", href: "/en/health-insurance/" }, { name: "2027 subsidies" }] as Miette[],
    appli: "2027 health insurance subsidies",
    partage: "Official income limits and amounts of the 2027 health insurance subsidies in French-speaking Switzerland, with an estimate.",
    hBaremes: `The official 2027 scales, canton by canton`,
    baremesIntro: `Each table reproduces the scale published by the canton, without rounding or correction. The source and the date it was read are given under each one. The determining income is not defined the same way in every canton, so the limits cannot be compared as they stand.`,
    source: "Source",
    lu: (d: string) => `read on ${d}`,
    liens: `Going further`,
    footer: "These amounts are indicative. Only the cantonal office’s decision is binding.",
    maj: `Scales read on ${LE_EN} in the cantons’ official texts. Average premiums: FOPH, 2027.`,
    oui: "yes",
    non: "no",
  },
};

/* ---------- tableaux ---------- */
/* `empile` : sur téléphone, chaque ligne devient un bloc (le libellé de colonne passe devant la valeur) ; dès 720 px, tableau ordinaire. */
/* `serre` : marges de cellule réduites sur téléphone, pour les tableaux à peine trop larges. */
type Tab = { cap: string; tete: string[]; lignes: (string | number)[][]; empile?: boolean; serre?: boolean };
function Tableau({ cap, tete, lignes, empile, serre }: Tab) {
  return (
    <Table variant="chiffres" className={empile ? "tableau-empile tableau-empile-2" : serre ? "max-[719px]:[&_:is(th,td)]:px-1.5" : undefined}>
      <TableCaption className="text-left">{cap}</TableCaption>
      <TableHeader>
        <TableRow>{tete.map((h) => <TableHead key={h} scope="col">{h}</TableHead>)}</TableRow>
      </TableHeader>
      <TableBody>
        {lignes.map((l, i) => (
          <TableRow key={i}>
            {l.map((c, j) => (j === 0 ? <TableHead key={j} scope="row" data-label={empile ? tete[0] : undefined}>{c}</TableHead> : <TableCell key={j} data-label={empile ? tete[j] : undefined}>{c}</TableCell>))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const T = (l: Locale) => (x: number | null | undefined) => (x == null ? "–" : nombre(x, 0, l));

function tablesGE(l: Locale): Tab[] {
  const g = K.GE.tables, n = T(l);
  const fr = l === "fr";
  const grp = Array.from({ length: 9 }, (_, i) => i);
  const charges = [0, 1, 2, 3, 4];
  const th = (s: string) => (fr ? (s === "0" || s === "1" ? `${s} charge` : `${s} charges`) : (s === "1" ? `${s} dependant` : `${s} dependants`));
  return [
    { cap: fr ? "Subside mensuel 2027 par personne, en francs, selon le groupe" : "2027 monthly subsidy per person, in francs, by group", tete: [fr ? "Groupe" : "Group", fr ? "Adulte" : "Adult", fr ? "Jeune adulte (19 à 25 ans)" : "Young adult (19 to 25)", fr ? "Enfant" : "Child"], lignes: grp.map((i) => [i + 1, n(g.montants.adulte[i]), n(g.montants.jeuneAdulte[i]), n(g.montants.enfant[i])]) },
    { cap: fr ? "Revenu déterminant (RDU) maximal par groupe, personne seule, selon le nombre de charges légales" : "Maximum RDU per group, single person, by number of legal dependants", tete: [fr ? "Groupe" : "Group", ...charges.map((c) => th(String(c)))], empile: true, lignes: grp.map((i) => [i + 1, ...charges.map((c) => n(g.limites.seul[String(c) as "0"][i]))]) },
    { cap: fr ? "Revenu déterminant (RDU) maximal par groupe, couple, selon le nombre de charges légales" : "Maximum RDU per group, couple, by number of legal dependants", tete: [fr ? "Groupe" : "Group", ...charges.map((c) => th(String(c)))], empile: true, lignes: grp.map((i) => [i + 1, ...charges.map((c) => n(g.limites.couple[String(c) as "0"][i]))]) },
  ];
}

function tablesVD(l: Locale): Tab[] {
  const fr = l === "fr", n = T(l);
  const p = K.VD.tables.params;
  const r = (a: number, b: number) => `${n(a)} – ${n(b)}`;
  const gamme = (a: number, b: number) => `${n(a)} → ${n(b)}`;
  const adulteSeul = fr ? "Adulte de 26 ans et plus, seul" : "Adult aged 26 and over, living alone";
  const adulteFam = fr ? "Adulte de 26 ans et plus, avec enfant(s)" : "Adult aged 26 and over, with child(ren)";
  const couple = fr ? "Adulte en couple sans enfant" : "Adult in a couple without children";
  const enf = fr ? "Enfant de 0 à 18 ans" : "Child aged 0 to 18";
  return [
    {
      cap: fr ? "Subside ordinaire mensuel 2027, en francs, selon le revenu déterminant OVAM (RDU moins la déduction pour enfants)" : "2027 monthly ordinary subsidy, in francs, by OVAM determining income (RDU minus the child deduction)",
      tete: [fr ? "Catégorie" : "Category", fr ? "Revenu OVAM" : "OVAM income", fr ? "Subside par mois" : "Subsidy per month"],
      lignes: [
        [adulteSeul, r(0, p.seul26.C), n(p.seul26.F)],
        [adulteSeul, r(p.seul26.C + 1, p.seul26.A), gamme(p.seul26.F, p.seul26.E)],
        [adulteSeul, r(p.seul26.A + 1, p.seul26.B), n(p.seul26.E)],
        [adulteFam, r(0, p.famille26.C), gamme(p.famille26.D, p.famille26.F)],
        [adulteFam, r(p.famille26.C + 1, p.famille26.A), gamme(p.famille26.F, p.famille26.E)],
        [adulteFam, r(p.famille26.A + 1, p.famille26.B), n(p.famille26.E)],
        [couple, r(0, p.couple26.C), gamme(p.couple26.D, p.couple26.F)],
        [couple, r(p.couple26.C + 1, p.couple26.A), gamme(p.couple26.F, p.couple26.E)],
        [couple, r(p.couple26.A + 1, p.couple26.B), n(p.couple26.E)],
        [enf, r(0, p.enfant.B), n(p.enfant.F)],
      ],
    },
    {
      cap: fr ? "Prime de référence mensuelle 2027 du subside spécifique, en francs (RDU de 0 à 62 500 pour une personne seule, de 0 à 86 300 pour un ménage)" : "2027 monthly reference premium for the specific subsidy, in francs (RDU from 0 to 62,500 for a single person, 0 to 86,300 for a household)",
      tete: [fr ? "Région" : "Region", fr ? "Adulte" : "Adult", fr ? "Enfant" : "Child"],
      lignes: (["1", "2"] as const).map((g) => [g, n(K.VD.tables.primes_reference.famille.adulte[g][0]), n(K.VD.tables.primes_reference.famille.enfant[g][0])]),
    },
  ];
}

function tablesFR(l: Locale): Tab[] {
  const fr = l === "fr", n = T(l), L = K.FR.tables.limites, pm = K.FR.tables.prime_moyenne;
  const e = Array.from({ length: 7 }, (_, i) => i);
  return [
    {
      cap: fr ? "Limite légale de revenu déterminant 2027, en francs" : "2027 legal determining-income limit, in francs",
      tete: [fr ? "Enfants à charge" : "Dependent children", fr ? "Personne seule" : "Single person", fr ? "Couple marié" : "Married couple"],
      lignes: e.map((c) => [c, n(c === 0 ? L.seul_sans_enfant : L.seul_avec_enfant + L.par_enfant * c), n(L.couple + L.par_enfant * c)]),
    },
    {
      cap: fr ? "Prime moyenne régionale 2027 servant de base à la réduction, en francs par mois" : "2027 regional average premium used as the basis of the reduction, in francs per month",
      tete: [fr ? "Catégorie" : "Category", fr ? "Sarine (région 1)" : "Sarine (region 1)", fr ? "Autres districts (région 2)" : "Other districts (region 2)"],
      lignes: [[fr ? "Adulte" : "Adult", n(pm["1"].adulte), n(pm["2"].adulte)], [fr ? "Jeune adulte (19 à 25 ans)" : "Young adult (19 to 25)", n(pm["1"].jeuneAdulte), n(pm["2"].jeuneAdulte)], [fr ? "Enfant" : "Child", n(pm["1"].enfant), n(pm["2"].enfant)]],
    },
  ];
}

function tablesVS(l: Locale): Tab[] {
  const fr = l === "fr", n = T(l), v = K.VS.tables.echelle_2026;
  return [{
    cap: fr ? "Échelle 2026 (et non 2027) : revenu déterminant maximal selon le taux de la subvention, en francs" : "2026 scale (not 2027): maximum determining income by subsidy rate, in francs",
    tete: [fr ? "Taux de la subvention 2026" : "2026 subsidy rate", fr ? "Personne seule sans enfant" : "Single person, no children", fr ? "Couple sans enfant" : "Couple, no children"],
    lignes: v.taux.map((t, i) => [`${t}${l === "fr" ? N : ""}%`, n(v.seul_sans_enfant[i]), n(v.couple_sans_enfant[i])]),
  }];
}

function tablesNE(l: Locale): Tab[] {
  const fr = l === "fr", n = T(l), g = K.NE.tables;
  const cell = (b: number[] | null) => (b ? n(b[1]) : "–");
  const cl = Array.from({ length: 15 }, (_, i) => i);
  const col = [fr ? "Classe" : "Class", fr ? "Sans enfant" : "No child", fr ? "1 enfant" : "1 child", fr ? "2 enfants" : "2 children", fr ? "3 enfants" : "3 children"];
  return [
    { cap: fr ? "Subside mensuel maximal 2027 par personne, en francs, selon la classification" : "2027 maximum monthly subsidy per person, in francs, by classification", tete: [fr ? "Classe" : "Class", fr ? "Adulte (26 ans et plus)" : "Adult (26 and over)", fr ? "Enfant mineur" : "Minor child"], lignes: cl.map((i) => [`S${i + 1}`, n(g.montants[i].adulte), n(g.montants[i].enfant)]) },
    { cap: fr ? "Revenu déterminant maximal de chaque classe (inclus ; la classe commence un franc au-dessus de la précédente), adulte seul, selon le nombre d’enfants mineurs" : "Maximum determining income of each class (inclusive; a class starts one franc above the previous one), single adult, by number of minor children", tete: col, empile: true, lignes: cl.map((i) => [`S${i + 1}`, ...[0, 1, 2, 3].map((e) => cell((g.seul as (number[] | null)[][])[i][e]))]) },
    { cap: fr ? "Revenu déterminant maximal de chaque classe (inclus ; la classe commence un franc au-dessus de la précédente), couple d’adultes, selon le nombre d’enfants mineurs" : "Maximum determining income of each class (inclusive; a class starts one franc above the previous one), couple of adults, by number of minor children", tete: col, empile: true, lignes: cl.map((i) => [`S${i + 1}`, ...[0, 1, 2, 3].map((e) => cell((g.couple as (number[] | null)[][])[i][e]))]) },
  ];
}

function tablesJU(l: Locale): Tab[] {
  const fr = l === "fr", n = T(l), g = K.JU.tables;
  const palier = (i: number) => (i === 0 ? (fr ? "Inférieur à 0" : "Below 0") : `${n((i - 1) * 1000)} – ${n((i - 1) * 1000 + 999)}`);
  const sup = (i: number) => (g.supplement[i] as number | undefined) ?? 0;
  return [
    {
      cap: fr ? "Réduction mensuelle 2027, en francs, selon le revenu déterminant (adulte : 28 paliers jusqu’à 26 999)" : "2027 monthly reduction, in francs, by determining income (adult: 28 steps up to 26,999)",
      tete: [fr ? "Revenu déterminant" : "Determining income", fr ? "Adulte" : "Adult", fr ? "Jeune adulte en formation" : "Young adult in training", fr ? "Enfant (moins de 18 ans)" : "Child (under 18)"],
      serre: true,
      lignes: [...g.adulte.map((a, i) => [palier(i), n(a), n(g.jeune_adulte_formation), n(g.enfant)]), [fr ? "27 000 et plus" : "27,000 and over", "0", fr ? "204 jusqu’à 52 999" : "204 up to 52,999", fr ? "108 jusqu’à 52 999" : "108 up to 52,999"]],
    },
    {
      cap: fr ? "Supplément famille mensuel 2027 par parent, en francs (activité professionnelle, enfant à charge)" : "2027 monthly family supplement per parent, in francs (paid work, dependent child)",
      tete: [fr ? "Revenu déterminant" : "Determining income", fr ? "Supplément" : "Supplement"],
      lignes: [...g.supplement.map((s, i) => [palier(i), n(s)]), [fr ? "18 000 et plus" : "18,000 and over", n(sup(99))]],
    },
  ];
}

const TABLES: Record<Canton, (l: Locale) => Tab[]> = { GE: tablesGE, VD: tablesVD, FR: tablesFR, VS: tablesVS, NE: tablesNE, JU: tablesJU };

/* ---------- paragraphes par canton ---------- */
function para(c: Canton, l: Locale): string {
  const n = T(l);
  const fr = l === "fr";
  const g = K.GE.tables, p = K.VD.tables.params, F = K.FR.tables, ju = K.JU.tables, ne = K.NE.tables;
  const nb = (x: number) => n(x);
  if (c === "GE")
    return fr
      ? `À Genève, le Service de l’assurance-maladie (SAM) range chaque ménage dans l’un des neuf groupes du barème 2027 d’après son revenu déterminant unifié (RDU), sa composition et le nombre de charges légales. Le subside mensuel d’un adulte va de ${nb(g.montants.adulte[0]!)} francs (groupe 1) à ${nb(g.montants.adulte[7]!)} francs (groupe 8), celui d’un jeune adulte de ${nb(g.montants.jeuneAdulte[0])} à ${nb(g.montants.jeuneAdulte[8])} francs et celui d’un enfant de ${nb(g.montants.enfant[0])} à ${nb(g.montants.enfant[8])} francs. Une personne seule sans charge a droit à un subside jusqu’à un RDU de ${nb(g.limites.seul["0"][7]!)} francs, un couple sans charge jusqu’à ${nb(g.limites.couple["0"][7]!)} francs. Le subside ne peut pas dépasser la prime effective. Au-delà de 200${N}000 francs de revenu brut ou de 250${N}000 francs de fortune brute, le revenu déterminant se calcule ainsi : revenu brut 2025 × 0,95 + fortune brute 2025 ÷ 15, et il faut déposer une demande.`
      : `In Geneva, the Health Insurance Service (SAM) places each household in one of nine groups of the 2027 scale according to its unified determining income (RDU), its make-up and its number of legal dependants. An adult’s monthly subsidy runs from CHF ${nb(g.montants.adulte[0]!)} (group 1) to CHF ${nb(g.montants.adulte[7]!)} (group 8), a young adult’s from CHF ${nb(g.montants.jeuneAdulte[0])} to CHF ${nb(g.montants.jeuneAdulte[8])} and a child’s from CHF ${nb(g.montants.enfant[0])} to CHF ${nb(g.montants.enfant[8])}. A single person without dependants is entitled to a subsidy up to an RDU of CHF ${nb(g.limites.seul["0"][7]!)}, a couple without dependants up to CHF ${nb(g.limites.couple["0"][7]!)}. The subsidy cannot exceed the actual premium. Above CHF 200,000 gross income or CHF 250,000 gross wealth, the determining income is worked out as 2025 gross income × 0.95 + 2025 gross wealth ÷ 15, and you must apply.`;
  if (c === "VD")
    return fr
      ? `Dans le canton de Vaud, l’Office vaudois de l’assurance-maladie (OVAM) calcule un subside ordinaire avec les formules du règlement, dont l’arrêté du 7 octobre 2026 fixe les paramètres 2027. Un adulte de 26 ans et plus qui vit seul reçoit ${nb(p.seul26.F)} francs par mois jusqu’à un revenu déterminant de ${nb(p.seul26.C)} francs, puis un montant dégressif jusqu’à ${nb(p.seul26.E)} francs à ${nb(p.seul26.A)} francs, et plus rien au-delà de ${nb(p.seul26.B)} francs. Pour un enfant, le subside est de ${nb(p.enfant.F)} francs par mois jusqu’à ${nb(p.enfant.B)} francs. Une déduction de 6${N}000 francs pour le premier enfant, puis de 7${N}000 francs par enfant en plus, est retirée du revenu avant le calcul. Si les primes, plafonnées à une prime de référence, dépassent 10${N}% du revenu déterminant unifié après le subside ordinaire, un subside spécifique s’y ajoute. Pour le revenu déterminant unifié, l’outil le calcule à partir de la décision de taxation (revenu net code 650, primes d’assurance-maladie déduites code 300, rachats du 2e pilier code 320 et versements au 3e pilier A code 310), pour un ménage sans bien immobilier, sans fortune commerciale et sans fortune au-delà de 60${N}000 francs (120${N}000 francs pour un couple) ; sinon il faut saisir le RDU de la décision de l’OVAM. Le subside est refusé si la fortune mobilière dépasse 130${N}000 francs (260${N}000 francs pour un couple).`
      : `In the canton of Vaud, the Vaud health insurance office (OVAM) works out an ordinary subsidy with the formulas of the regulation, whose 2027 parameters are set by the order of 7 October 2026. An adult aged 26 or over living alone receives CHF ${nb(p.seul26.F)} a month up to a determining income of CHF ${nb(p.seul26.C)}, then a falling amount down to CHF ${nb(p.seul26.E)} at CHF ${nb(p.seul26.A)}, and nothing above CHF ${nb(p.seul26.B)}. For a child the subsidy is CHF ${nb(p.enfant.F)} a month up to CHF ${nb(p.enfant.B)}. A deduction of CHF 6,000 for the first child, then CHF 7,000 for each further child, is taken off the income before the calculation. If premiums, capped at a reference premium, exceed 10% of the unified determining income after the ordinary subsidy, a specific subsidy is added. For the unified determining income, the tool works it out from the tax assessment (net income code 650, health insurance premiums deducted code 300, second-pillar buy-ins code 320 and pillar 3a payments code 310), for a household with no property, no business wealth and no wealth above CHF 60,000 (CHF 120,000 for a couple); otherwise you need to enter the RDU from the OVAM decision. The subsidy is refused if movable wealth exceeds CHF 130,000 (CHF 260,000 for a couple).`;
  if (c === "FR")
    return fr
      ? `À Fribourg, la Caisse cantonale de compensation AVS accorde une réduction de primes aux personnes dont le revenu déterminant reste sous une limite qui dépend de la situation familiale : ${nb(F.limites.seul_sans_enfant)} francs pour une personne seule sans enfant, ${nb(F.limites.couple)} francs pour un couple marié, plus ${nb(F.limites.par_enfant)} francs par enfant à charge. La réduction est un pourcentage de la prime moyenne régionale 2027 (${nb(F.prime_moyenne["1"].adulte)} francs par mois pour un adulte dans la Sarine, ${nb(F.prime_moyenne["2"].adulte)} francs ailleurs). Pour un adulte, ce pourcentage va de 1${N}% à 65${N}% selon l’écart entre le revenu déterminant et la limite, d’après un tableau de 60 paliers ; pour un enfant, il est d’au moins 80${N}%, pour un jeune adulte en formation d’au moins 50${N}%. Exemple de la Caisse : une limite de 93${N}000 francs (couple avec deux enfants) et un revenu déterminant de 62${N}000 francs donnent un écart de 33,33${N}% et une réduction de 35,71${N}% pour les parents.`
      : `In Fribourg, the cantonal AVS compensation office grants a premium reduction to people whose determining income stays below a limit that depends on the family situation: CHF ${nb(F.limites.seul_sans_enfant)} for a single person without children, CHF ${nb(F.limites.couple)} for a married couple, plus CHF ${nb(F.limites.par_enfant)} per dependent child. The reduction is a percentage of the 2027 regional average premium (CHF ${nb(F.prime_moyenne["1"].adulte)} a month for an adult in the Sarine, CHF ${nb(F.prime_moyenne["2"].adulte)} elsewhere). For an adult the percentage runs from 1% to 65% depending on the gap between the determining income and the limit, according to a 60-step table; for a child it is at least 80%, for a young adult in training at least 50%. The office’s example: a limit of CHF 93,000 (couple with two children) and a determining income of CHF 62,000 give a gap of 33.33% and a reduction of 35.71% for the parents.`;
  if (c === "VS")
    return fr
      ? `En Valais, la Caisse cantonale de compensation détermine le droit à la réduction de primes d’office, à partir des données fiscales. Au ${LE}, elle n’avait pas publié l’échelle 2027 : la seule échelle en ligne est celle de 2026, et elle ne vaut pas pour 2027. Nous n’affichons donc aucun montant de subside pour le Valais en 2027. À titre de repère, l’échelle 2026 accorde entre 5${N}% et 70${N}% de la prime moyenne régionale (80${N}% pour les enfants) et n’ouvre aucun droit si la fortune revalorisée brute dépasse 1 million de francs.`
      : `In Valais, the cantonal compensation office determines entitlement to the premium reduction automatically, from tax data. On ${LE_EN} it had not published the 2027 scale: the only scale online is the 2026 one, and it does not apply to 2027. We therefore show no subsidy amount for Valais in 2027. For reference, the 2026 scale grants between 5% and 70% of the regional average premium (80% for children) and gives no entitlement if gross revalued wealth exceeds CHF 1 million.`;
  if (c === "NE")
    return fr
      ? `Dans le canton de Neuchâtel, le revenu déterminant range chaque adulte, couple ou famille dans l’une des classifications S1 à S15 du barème 2027, et la classification fixe le subside mensuel maximal : de ${nb(ne.montants[0].adulte)} francs (S1) à ${nb(ne.montants[14].adulte)} francs (S15) pour un adulte, ${nb(ne.montants[0].enfant)} francs pour un enfant mineur. Pour une personne seule sans enfant, S1 va jusqu’à ${nb(ne.seul[0][0]![1])} francs de revenu déterminant et le droit s’arrête à ${nb(ne.seul[9][0]![1])} francs ; pour un couple sans enfant, S1 va jusqu’à ${nb(ne.couple[0][0]![1])} francs et le droit s’arrête à ${nb(ne.couple[9][0]![1])} francs. Les montants sont ceux de la franchise ordinaire : ils baissent dans la même mesure que les rabais des assureurs pour une franchise à option ou un modèle alternatif.`
      : `In the canton of Neuchâtel, the determining income places each adult, couple or family in one of the classifications S1 to S15 of the 2027 scale, and the classification sets the maximum monthly subsidy: from CHF ${nb(ne.montants[0].adulte)} (S1) to CHF ${nb(ne.montants[14].adulte)} (S15) for an adult, CHF ${nb(ne.montants[0].enfant)} for a minor child. For a single person without children, S1 goes up to a determining income of CHF ${nb(ne.seul[0][0]![1])} and entitlement stops at CHF ${nb(ne.seul[9][0]![1])}; for a couple without children, S1 goes up to CHF ${nb(ne.couple[0][0]![1])} and entitlement stops at CHF ${nb(ne.couple[9][0]![1])}. The amounts are those for the standard deductible: they fall by the same amount as the insurers’ discounts for a higher deductible or an alternative model.`;
  return fr
    ? `Dans le Jura, l’arrêté du 20 octobre 2026 fixe pour 2027 un tableau par tranche de 1${N}000 francs de revenu déterminant : un adulte reçoit de ${nb(ju.adulte[0])} à ${nb(ju.adulte[27])} francs par mois jusqu’à ${nb(ju.limite_adulte)} francs, un enfant ${nb(ju.enfant)} francs et un jeune adulte en formation ${nb(ju.jeune_adulte_formation)} francs jusqu’à ${nb(ju.limite_enfant)} francs. Un supplément famille de ${nb(ju.supplement[0])} francs au plus par parent s’y ajoute pour les parents qui exercent une activité professionnelle et dont le revenu déterminant est inférieur à 18${N}000 francs. La fortune disponible doit rester sous ${nb(ju.fortune_max)} francs, selon les conditions que l’ECAS dit identiques à celles de 2026.`
    : `In Jura, the order of 20 October 2026 sets a table for 2027 in steps of CHF 1,000 of determining income: an adult receives CHF ${nb(ju.adulte[0])} down to CHF ${nb(ju.adulte[27])} a month up to CHF ${nb(ju.limite_adulte)}, a child CHF ${nb(ju.enfant)} and a young adult in training CHF ${nb(ju.jeune_adulte_formation)} up to CHF ${nb(ju.limite_enfant)}. A family supplement of up to CHF ${nb(ju.supplement[0])} per parent is added for parents in paid work whose determining income is below CHF 18,000. Available wealth must stay below CHF ${nb(ju.fortune_max)}, under conditions the ECAS says are the same as in 2026.`;
}

function SectionCanton({ c, l }: { c: Canton; l: Locale }) {
  const fr = l === "fr";
  const k = K[c];
  const h = fr
    ? c === "VS" ? "Valais : barème 2027 pas encore publié" : `Subside d’assurance maladie ${c === "VD" || c === "JU" ? "dans le canton de " : "à "}${NOMS[c].fr}${c === "VD" || c === "JU" ? "" : ""} en 2027`
    : c === "VS" ? "Valais: 2027 scale not yet published" : `Health insurance subsidy in ${NOMS[c].en} in 2027`;
  return (
    <section className="subsides-canton" id={c.toLowerCase()}>
      <h2>{fr && (c === "VD" || c === "JU") ? `Subside d’assurance maladie ${c === "VD" ? "à Vaud" : "dans le Jura"} en 2027` : h}</h2>
      <p>{para(c, l)}</p>
      {c === "VD" ? <p>{TRANSPARENCE_VD[l]}</p> : null}
      {TABLES[c](l).map((tab) => <Tableau key={tab.cap} {...tab} />)}
      <p className="source-outil">{fr ? `Le barème vient des textes officiels suivants, lus le ${LE}.` : `The scale comes from the following official texts, read on ${LE_EN}.`}</p>
      <ul className="liens-source">
        {k.sources.slice(0, 2).map((s) => (
          <li key={s.url}><a className="lien-tap" href={s.url} rel="noopener">{s.titre}</a></li>
        ))}
        <li><a className="lien-tap" href={k.autorite.url} rel="noopener">{k.autorite.nom}</a></li>
      </ul>
    </section>
  );
}

/* ---------- FAQ ---------- */
function faq(l: Locale): Faq[] {
  const fr = l === "fr";
  const n = T(l);
  const ge = K.GE.tables, vd = K.VD.tables.params, F = K.FR.tables, ne = K.NE.tables, ju = K.JU.tables;
  return fr
    ? [
        { q: `Qui a droit à un subside d’assurance maladie${N}?`, a: `Les cantons accordent une réduction de primes aux assurés de condition économique modeste (art. 65, al. 1, LAMal) et doivent réduire d’au moins 80${N}% les primes des enfants et d’au moins 50${N}% celles des jeunes adultes en formation pour les bas et moyens revenus (art. 65, al. 1bis). Le reste dépend du canton de domicile : il fixe la définition du revenu déterminant, les limites et les montants. Le droit s’apprécie sur la taxation d’il y a deux ans à Genève, Fribourg et dans le Jura (taxation 2025 pour 2027), et sur la taxation 2026 à Neuchâtel.` },
        { q: `Quelle est la limite de revenu pour un subside en 2027${N}?`, a: `Cela dépend du canton et de la composition du ménage. Pour une personne seule sans enfant, le dernier subside est versé jusqu’à ${n(ge.limites.seul["0"][7])} francs de RDU à Genève, ${n(vd.seul26.B)} francs de revenu déterminant à Vaud (subside ordinaire), ${n(F.limites.seul_sans_enfant - 1)} francs à Fribourg, ${n(ne.seul[9][0]![1])} francs à Neuchâtel et ${n(ju.limite_adulte)} francs dans le Jura. Pour un couple sans enfant : ${n(ge.limites.couple["0"][7])} francs à Genève, ${n(K.VD.tables.params.couple26.B)} francs à Vaud, ${n(F.limites.couple - 1)} francs à Fribourg et ${n(ne.couple[9][0]![1])} francs à Neuchâtel. Ces limites ne se comparent pas : chaque canton définit son revenu déterminant. Le Valais n’a pas publié sa limite 2027.` },
        { q: `Le subside est-il versé automatiquement${N}?`, a: `Pas partout. À Genève, il est en principe accordé d’office, mais certaines personnes doivent déposer une demande avant le 30 novembre 2027 (jeunes adultes, personnes imposées à la source, nouveaux arrivants). Dans le Jura, l’ECAS informe d’office les personnes taxées pour 2025. À Neuchâtel, le droit est calculé d’après la taxation et un coupon-réponse est à renvoyer dans les 30 jours. À Vaud, il faut déposer une demande en ligne ou auprès de l’agence d’assurances sociales. À Fribourg, la demande est à déposer au plus tard le 31 août 2027, sauf pour les personnes qui avaient déjà une réduction à fin 2026.` },
        { q: `Le subside est-il versé à moi ou à ma caisse${N}?`, a: `À votre caisse. Selon l’art. 65, al. 1, LAMal, les cantons versent directement le montant correspondant aux assureurs concernés, qui le déduisent de votre prime. Vous payez la différence entre la prime facturée et le subside.` },
        { q: `Puis-je changer de caisse si je reçois un subside${N}?`, a: `Oui, le subside n’est pas lié à un assureur. À Vaud et dans le Jura, il n’y a rien à annoncer à l’office, car l’assureur le communique ; à Genève, la loi demande d’indiquer le nom du nouvel assureur au SAM au plus tard à la fin de l’année civile. À Genève, le subside ne dépend que du RDU et du ménage, pas de la prime : une prime plus basse réduit donc directement ce que vous payez. L’office vaudois encourage lui aussi les bénéficiaires à adapter leur police.` },
        { q: `Que faire si ma situation change en cours d’année${N}?`, a: `La LAMal demande aux cantons de tenir compte des circonstances économiques et familiales les plus récentes (art. 65, al. 3). Concrètement, à Vaud, une variation de revenu de 20${N}% ou plus doit être annoncée à l’agence d’assurances sociales ; à Genève, une baisse de revenu s’annonce au SAM avec le formulaire de changement de situation, alors qu’une hausse n’est prise en compte qu’avec la taxation suivante. À Fribourg, un changement économique n’est pas pris en compte en cours d’année et un changement d’état civil l’est dès le 1er janvier suivant.` },
      ]
    : [
        { q: `Who is entitled to a health insurance subsidy?`, a: `Cantons grant a premium reduction to insured people of modest means (art. 65, para. 1, KVG/LAMal) and must cut the premiums of children by at least 80% and those of young adults in training by at least 50% for low and middle incomes (art. 65, para. 1bis). The rest depends on the canton of residence, which sets the definition of determining income, the limits and the amounts. Entitlement is assessed on the tax assessment of two years earlier in Geneva, Fribourg and Jura (2025 assessment for 2027), and on the 2026 assessment in Neuchâtel.` },
        { q: `What is the income limit for a subsidy in 2027?`, a: `It depends on the canton and the household. For a single person without children, the last subsidy is paid up to an RDU of CHF ${n(ge.limites.seul["0"][7])} in Geneva, CHF ${n(vd.seul26.B)} of determining income in Vaud (ordinary subsidy), CHF ${n(F.limites.seul_sans_enfant - 1)} in Fribourg, CHF ${n(ne.seul[9][0]![1])} in Neuchâtel and CHF ${n(ju.limite_adulte)} in Jura. For a couple without children: CHF ${n(ge.limites.couple["0"][7])} in Geneva, CHF ${n(K.VD.tables.params.couple26.B)} in Vaud, CHF ${n(F.limites.couple - 1)} in Fribourg and CHF ${n(ne.couple[9][0]![1])} in Neuchâtel. These limits cannot be compared, since each canton defines its own determining income. Valais has not published its 2027 limit.` },
        { q: `Is the subsidy paid automatically?`, a: `Not everywhere. In Geneva it is normally granted automatically, but some people must apply before 30 November 2027 (young adults, people taxed at source, newcomers). In Jura the ECAS informs people with a 2025 assessment automatically. In Neuchâtel entitlement is calculated from the assessment and a reply slip must be returned within 30 days. In Vaud you must apply online or at the social insurance agency. In Fribourg you apply by 31 August 2027 at the latest, except if you already had a reduction at the end of 2026.` },
        { q: `Is the subsidy paid to me or to my insurer?`, a: `To your insurer. Under art. 65, para. 1, LAMal, cantons pay the corresponding amount directly to the insurers concerned, who deduct it from your premium. You pay the difference between the billed premium and the subsidy.` },
        { q: `Can I change insurer if I receive a subsidy?`, a: `Yes, the subsidy is not tied to an insurer. In Vaud and Jura there is nothing to report to the office, because the insurer passes it on; in Geneva the law asks you to give the new insurer’s name to the SAM by the end of the calendar year at the latest. In Geneva the subsidy depends only on the RDU and the household, not on the premium, so a lower premium directly lowers what you pay. The Vaud office likewise encourages recipients to adapt their policy.` },
        { q: `What if my situation changes during the year?`, a: `The LAMal asks cantons to take the most recent economic and family circumstances into account (art. 65, para. 3). In practice, in Vaud a change in income of 20% or more must be reported to the social insurance agency; in Geneva a drop in income is reported to the SAM with the change-of-situation form, whereas a rise is only taken into account with the next assessment. In Fribourg an economic change is not taken into account during the year and a change of civil status applies from 1 January of the following year.` },
      ];
}

/* ---------- métadonnées et page ---------- */
export const metaSubsides = (locale: Locale) => {
  const t = TEXTE[locale];
  return pageMetadata({ title: t.titre, description: t.description, path: t.path, locale, ...(locale === "fr" ? { enPath: t.alt } : { frPath: t.alt }) });
};

export function PageSubsides({ locale }: { locale: Locale }) {
  const t = TEXTE[locale], fr = locale === "fr";
  const url = abs(t.path);
  const f = faq(locale);
  const calcules = CANTONS.filter((c) => K[c].calcul);
  const ld = graph(
    {
      "@type": "WebPage", "@id": `${url}#webpage`, url, name: t.titre, description: t.description, inLanguage: fr ? "fr-CH" : "en",
      isPartOf: { "@id": WEBSITE_ID }, publisher: { "@id": ORG_ID }, datePublished: D.releve_le, dateModified: DATE_PAGE.subsides,
      breadcrumb: { "@id": `${url}#breadcrumb` }, mainEntity: { "@id": `${url}#subsides` },
      citation: CANTONS.flatMap((c) => K[c].sources.map((s) => s.url)),
    },
    {
      "@type": "WebApplication", "@id": `${url}#outil`, name: t.appli, url, applicationCategory: "FinanceApplication", operatingSystem: "Any", inLanguage: fr ? "fr-CH" : "en",
      description: t.description, isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "CHF" }, publisher: { "@id": ORG_ID },
    },
    {
      "@type": "Dataset", "@id": `${url}#subsides`, name: t.appli, description: t.description, inLanguage: fr ? "fr-CH" : "en",
      dateModified: D.releve_le, temporalCoverage: "2027", spatialCoverage: calcules.map((c) => NOMS[c][locale]).join(", "), isAccessibleForFree: true, creator: { "@id": ORG_ID },
      variableMeasured: fr ? ["Subside mensuel d’assurance maladie (CHF)", "Limite de revenu déterminant (CHF)"] : ["Monthly health insurance subsidy (CHF)", "Determining-income limit (CHF)"],
    },
    breadcrumbLd(t.miettes, `${url}#breadcrumb`),
    { ...faqLd(f), "@id": `${url}#faq` },
  );
  const lien = (href: string, label: string, texte: string): ReactNode => (
    <Alert variant="info" className="lien-outil-3a"><p><a href={href}>{label}</a> {texte}</p></Alert>
  );
  const o = fr ? OUTILS : OUTILS_EN;
  return (
    <div className="page-outil">
      <JsonLd data={ld} />
      <SiteHeader current="sante" locale={locale} altPath={t.alt} />
      <main id="contenu">
        <div className="wrap">
          <Breadcrumbs items={t.miettes} locale={locale} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>
          <div data-cta-subsides>
            <CtaOffres locale={locale} href={lienDemande(locale, "sante")} />
          </div>
          <PartagerOutil path={t.path} title={t.appli} text={t.partage} locale={locale} />
          <Subsides locale={locale} />
          <h2 className="titre-section-3a" id="baremes">{t.hBaremes}</h2>
          <p className="intro-section-3a">{t.baremesIntro}</p>
          {CANTONS.map((c) => <SectionCanton key={c} c={c} l={locale} />)}
          <h2 className="titre-section-3a">{t.liens}</h2>
          {lien(o.comparateur, fr ? "Comparer les primes 2027 selon votre NPA" : "Compare 2027 premiums for your postcode", fr ? "Le subside se déduit de la prime : la prime la plus basse de votre région dépend de votre franchise et de votre modèle." : "The subsidy comes off the premium: the lowest premium in your region depends on your deductible and model.")}
          {lien(o.lettre, fr ? "Lettre de résiliation de l’assurance maladie" : "Health insurance cancellation letter", fr ? "Pour changer d’assureur, la lettre doit être reçue à temps." : "To change insurer, the letter must arrive in time.")}
          {lien(fr ? PAGES_DONNEES.chiffres : PAGES_DONNEES_EN.chiffres, fr ? "Chiffres clés 2027" : "Key figures 2027", fr ? "Les primes moyennes cantonales de l’OFSP et les autres chiffres de l’année." : "The FOPH average cantonal premiums and the year’s other figures.")}
          {lien(fr ? "/assurance-maladie/" : "/en/health-insurance/", fr ? "Le guide de l’assurance maladie" : "The health insurance guide", fr ? "Franchise, modèles, délais et droits expliqués." : "Deductible, models, deadlines and rights explained.")}
        </div>
        <div className="wrap faq">
          {f.map((x) => (
            <section key={x.q}>
              <h2>{x.q}</h2>
              <p>{x.a}</p>
            </section>
          ))}
          <p className="maj">{t.maj}</p>
        </div>
      </main>
      <SiteFooter note={t.footer} locale={locale} altPath={t.alt} />
    </div>
  );
}
