/* « Chiffres clés 2027 » (idée 3 du rapport 08) : une phrase par fait, avec une ancre stable, une validité, une
   source et la façon dont le chiffre a été obtenu. Tout vient des fichiers de données du site : moyennes cantonales
   de l'OFSP (data/primes-2027-romandie.json, reprises telles quelles), offres 2027 par région (regions-primes.ts),
   plafonds 3a (impots-2026.json, OFAS), taux 3a (historique), économie d'impôt par commune (communes-3a.ts).
   Aucun assureur ni aucune banque n'est nommé. Rendu par la page et repris dans llms-full.txt. */
import OFSP from "../../../data/primes-2027-romandie.json" with { type: "json" };
import * as R from "@/lib/engines/regions-primes";
import * as I from "@/lib/engines/impot3a";
import * as C from "@/lib/engines/communes-3a";
import * as H from "@/lib/engines/historique-3a";
import { PUBLIE_LE_SNB, SNB_3A, SOURCE_SNB, decimalesSnb, moisTexte, reperes as reperesSnb } from "@/lib/engines/taux-snb";
import { DATE_PRIMES } from "@/lib/date-primes";
import { abs } from "@/lib/site";
import { OUTILS, OUTILS_EN, PAGES_DONNEES, PAGES_DONNEES_EN } from "@/lib/nav";
import type { Locale } from "@/lib/i18n";
import { chf, pct, ESPACE_FINE as N } from "@/lib/nombres";

const dc = (iso: string) => iso.split("-").reverse().join(".");

export type Source = { label: string; url: string };
export type Fait = { id: string; texte: string; validite: string; sources: Source[]; methode: string };
export type Groupe = { id: string; question: string; reponse: string; faits: Fait[] };

const S = {
  ofspMoyennes: (l: Locale): Source => ({
    label: l === "fr" ? "OFSP, primes moyennes cantonales 2026 et 2027 (PDF)" : "FOPH, average cantonal premiums 2026 and 2027 (PDF)",
    url: OFSP.source.urls[0],
  }),
  ofspCommunique: (l: Locale): Source => ({ label: l === "fr" ? "OFSP, communiqué du 29.09.2026" : "FOPH, press release of 29.09.2026", url: OFSP.source.urls[2] }),
  priminfo: (l: Locale): Source => ({ label: l === "fr" ? "Priminfo (OFSP), primes 2027 approuvées" : "Priminfo (FOPH), approved 2027 premiums", url: "https://www.priminfo.admin.ch/" }),
  regions: (l: Locale): Source => ({ label: l === "fr" ? "OFSP, régions de primes 2027" : "FOPH, 2027 premium regions", url: R.SOURCE_REGIONS.url }),
  ofas: (l: Locale): Source => ({
    label: l === "fr" ? "OFAS, montants valables dès le 1er janvier 2027 (PDF)" : "FSIO, amounts valid from 1 January 2027 (PDF)",
    url: "https://cms.news.admin.ch/fileservice/sdweb-docs-prod-nsbcch-files/files/2026/10/02/541161b3-a24c-412e-aa24-7f5955a910fc.pdf",
  }),
  opp3: (): Source => ({ label: "Art. 7 OPP 3 (Fedlex)", url: "https://www.fedlex.admin.ch/eli/cc/1985/1778_1778_1778/fr#art_7" }),
  lamal7: (): Source => ({ label: "Art. 7 LAMal (Fedlex)", url: "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_7" }),
  lamal3: (): Source => ({ label: "Art. 3 LAMal (Fedlex)", url: "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_3" }),
  lamal5: (): Source => ({ label: "Art. 5 LAMal (Fedlex)", url: "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_5" }),
  lca35a: (): Source => ({ label: "Art. 35a LCA (Fedlex)", url: "https://www.fedlex.admin.ch/eli/cc/24/719_735_717/fr#art_35_a" }),
  cleiss: (l: Locale): Source => ({ label: l === "fr" ? "CLEISS, droit d’option des frontaliers France-Suisse" : "CLEISS, right of option for France-Switzerland cross-border workers", url: "https://www.cleiss.fr/faq/droit_d_option_des_frontaliers_france-suisse.html" }),
  geDeduction: (l: Locale): Source => ({ label: l === "fr" ? "État de Genève, déduction des cotisations au 3e pilier" : "State of Geneva, pillar 3a deduction", url: "https://www.ge.ch/taux-donnees-fiscales/deduction-cotisations-au-3e-pilier" }),
  banques: (l: Locale): Source => ({ label: l === "fr" ? "Pages officielles des banques (liste et liens sur la page des taux 3a)" : "Banks’ official pages (list and links on the 3a rates page)", url: abs(l === "fr" ? OUTILS.taux3a : OUTILS_EN.taux3a) }),
  bns: (l: Locale): Source => ({
    label: l === "fr" ? `BNS, portail de données, ${SOURCE_SNB.titre_fr.toLowerCase()} (cube ${SOURCE_SNB.cube})` : `SNB data portal, ${SOURCE_SNB.titre_en.toLowerCase()} (cube ${SOURCE_SNB.cube})`,
    url: l === "fr" ? SOURCE_SNB.page_fr : SOURCE_SNB.page_en,
  }),
  afc: (l: Locale): Source => ({ label: l === "fr" ? "AFC et administrations fiscales cantonales, barèmes 2026" : "Federal Tax Administration and cantonal tax administrations, 2026 scales", url: "https://swisstaxcalculator.estv.admin.ch/" }),
};

const CANTONS_OFSP = ["GE", "VD", "NE", "JU", "FR", "VS"] as const;
const NOM: Record<Locale, Record<string, string>> = {
  fr: { GE: "à Genève", VD: "dans le canton de Vaud", NE: "dans le canton de Neuchâtel", JU: "dans le canton du Jura", FR: "dans le canton de Fribourg", VS: "en Valais", BE: "dans le Jura bernois" },
  en: { GE: "in Geneva", VD: "in the canton of Vaud", NE: "in the canton of Neuchâtel", JU: "in the canton of Jura", FR: "in the canton of Fribourg", VS: "in Valais", BE: "in the Bernese Jura" },
};
const dansRegion = (r: R.Region, l: Locale) =>
  r.canton === "GE" || r.canton === "NE" || r.canton === "JU" || r.canton === "BE"
    ? NOM[l][r.canton]
    : l === "fr" ? `dans la région ${r.canton}${N}${r.region} (${r.chefLieu})` : `in region ${r.canton} ${r.region} (${r.chefLieu})`;

const P26 = I.PLAFONDS["2026"];
const P27 = I.PLAFONDS["2027"];
const T3A = H.SERIE[H.SERIE.length - 1];
const BNS3A = reperesSnb(SNB_3A.points);
const tb = (x: number, l: Locale) => (l === "fr" ? `${decimalesSnb(x).replace(".", ",")}${N}%` : `${decimalesSnb(x)}%`);
const PROFIL = C.PROFIL_TYPE;

export function groupes(l: Locale): Groupe[] {
  const fr = l === "fr";
  const cantons = [...CANTONS_OFSP].sort((a, b) => OFSP.cantons[b].adult_2027 - OFSP.cantons[a].adult_2027);
  const bas = cantons[cantons.length - 1];
  const haut = cantons[0];
  const adulte = (r: R.Region) => r.profils.find((p) => p.id === "a300a")!;
  const regionsParEcart = [...R.REGIONS].sort((a, b) => adulte(b).ecartPct - adulte(a).ecartPct);
  const tabs = I.CANTONS.map((c) => C.table(c));
  const validite2027 = fr ? "Valable pour l’année 2027." : "Valid for 2027.";
  const methodePrimes = (r: R.Region) =>
    fr
      ? `Calcul Guide Assurance sur les ${adulte(r).n} offres 2027 de la région pour ce profil, relevées sur Priminfo le ${dc(DATE_PRIMES)}.`
      : `Calculated by Guide Assurance from the region’s ${adulte(r).n} offers for this profile in 2027, retrieved from Priminfo on ${dc(DATE_PRIMES)}.`;

  return [
    {
      id: "primes-moyennes",
      question: fr ? `Combien coûte l’assurance de base en 2027 dans chaque canton romand${N}?` : "How much does basic health insurance cost in 2027 in each French-speaking canton?",
      reponse: fr
        ? `La prime mensuelle moyenne d’un adulte va de ${chf(OFSP.cantons[bas].adult_2027, l, 2)} ${NOM.fr[bas]} à ${chf(OFSP.cantons[haut].adult_2027, l, 2)} ${NOM.fr[haut]}, pour une moyenne suisse de ${chf(OFSP.national.adult_2027, l, 2)}, en hausse de ${pct(OFSP.national.change_pct, l, 1)} (OFSP).`
        : `The average monthly premium for an adult ranges from ${chf(OFSP.cantons[bas].adult_2027, l, 2)} ${NOM.en[bas]} to ${chf(OFSP.cantons[haut].adult_2027, l, 2)} ${NOM.en[haut]}, against a Swiss average of ${chf(OFSP.national.adult_2027, l, 2)}, up ${pct(OFSP.national.change_pct, l, 1)} (FOPH).`,
      faits: [
        ...cantons.map((c) => {
          const o = OFSP.cantons[c];
          return {
            id: `prime-moyenne-${c.toLowerCase()}`,
            texte: fr
              ? `En 2027, la prime mensuelle moyenne d’un adulte (26 ans et plus) ${NOM.fr[c]} est de ${chf(o.adult_2027, l, 2)}, en hausse de ${pct(o.change_pct, l, 1)} par rapport à 2026 (${chf(o.adult_2026, l, 2)}).`
              : `In 2027 the average monthly premium for an adult (26 and over) ${NOM.en[c]} is ${chf(o.adult_2027, l, 2)}, up ${pct(o.change_pct, l, 1)} on 2026 (${chf(o.adult_2026, l, 2)}).`,
            validite: validite2027,
            sources: [S.ofspMoyennes(l)],
            methode: fr
              ? "Chiffre de l’OFSP repris tel quel : moyenne de toutes les franchises et de tous les modèles, avec accident."
              : "FOPH figure taken as published: average across all deductibles and models, with accident cover.",
          };
        }),
        {
          id: "prime-moyenne-suisse",
          texte: fr
            ? `La prime mensuelle moyenne d’un adulte en Suisse est de ${chf(OFSP.national.adult_2027, l, 2)} en 2027, contre ${chf(OFSP.national.adult_2026, l, 2)} en 2026, soit ${pct(OFSP.national.change_pct, l, 1)} de plus.`
            : `The average monthly premium for an adult in Switzerland is ${chf(OFSP.national.adult_2027, l, 2)} in 2027, against ${chf(OFSP.national.adult_2026, l, 2)} in 2026, or ${pct(OFSP.national.change_pct, l, 1)} more.`,
          validite: validite2027,
          sources: [S.ofspCommunique(l), S.ofspMoyennes(l)],
          methode: fr ? "Chiffre de l’OFSP repris tel quel." : "FOPH figure taken as published.",
        },
        ...R.REGIONS.filter((r) => r.canton === "BE").map((r) => ({
          id: "prime-moyenne-jura-bernois",
          texte: fr
            ? `Dans la région bernoise 2, dont fait partie le Jura bernois, l’OFSP estime la prime mensuelle moyenne d’un adulte à ${chf(r.primeMoyenneOfsp.adulte, l, 2)} en 2027.`
            : `In Bern region 2, which includes the Bernese Jura, the FOPH estimates the average monthly premium for an adult at ${chf(r.primeMoyenneOfsp.adulte, l, 2)} in 2027.`,
          validite: validite2027,
          sources: [S.regions(l)],
          methode: fr ? "Estimation de l’OFSP publiée avec la liste des régions de primes (feuille D_PRIM), reprise telle quelle." : "FOPH estimate published with the list of premium regions (sheet D_PRIM), taken as published.",
        })),
      ],
    },
    {
      id: "ecart-offres",
      question: fr ? `Quel écart sépare l’offre la plus basse de la plus haute pour un même profil${N}?` : "How far apart are the lowest and highest offers for the same profile?",
      reponse: fr
        ? `Pour un adulte avec une franchise de 300${N}CHF et la couverture accident, l’offre la plus haute coûte de ${pct(adulte(regionsParEcart[regionsParEcart.length - 1]).ecartPct, l)} à ${pct(adulte(regionsParEcart[0]).ecartPct, l)} de plus que la plus basse, selon la région de prime.`
        : `For an adult with a CHF 300 deductible and accident cover, the highest offer costs ${pct(adulte(regionsParEcart[regionsParEcart.length - 1]).ecartPct, l)} to ${pct(adulte(regionsParEcart[0]).ecartPct, l)} more than the lowest, depending on the premium region.`,
      faits: R.REGIONS.map((r) => {
        const a = adulte(r);
        return {
          id: `ecart-${r.cle}`,
          texte: fr
            ? `${dansRegion(r, "fr").replace(/^./, (x) => x.toUpperCase())}, l’offre la plus haute pour un adulte (franchise 300${N}CHF, accident compris) coûte ${pct(a.ecartPct, l)} de plus que la plus basse en 2027, soit ${chf(a.ecartAnnuel, l)} de plus par an ; la prime médiane est de ${chf(a.mediane, l, 2)} par mois.`
            : `${dansRegion(r, "en").replace(/^./, (x) => x.toUpperCase())}, the highest offer for an adult (CHF 300 deductible, accident cover included) costs ${pct(a.ecartPct, l)} more than the lowest in 2027, or ${chf(a.ecartAnnuel, l)} more a year; the median premium is ${chf(a.mediane, l, 2)} a month.`,
          validite: validite2027,
          sources: [S.priminfo(l), S.regions(l)],
          methode: methodePrimes(r),
        };
      }),
    },
    {
      id: "plafonds-3a",
      question: fr ? `Combien peut-on verser sur le 3e pilier en 2027${N}?` : "How much can you pay into pillar 3a in 2027?",
      reponse: fr
        ? `En 2027, le versement 3a déductible est plafonné à ${chf(P27.avecLPP, l)} pour une personne affiliée à une caisse de pension, et à 20${N}% du revenu d’activité, au plus ${chf(P27.sansLPP, l)}, sans caisse de pension.`
        : `In 2027 the deductible 3a payment is capped at ${chf(P27.avecLPP, l)} for someone in a pension fund, and at 20% of earned income, up to ${chf(P27.sansLPP, l)}, without one.`,
      faits: [
        {
          id: "plafond-3a-2027",
          texte: fr
            ? `Le plafond du versement 3a passe de ${chf(P26.avecLPP, l)} en 2026 à ${chf(P27.avecLPP, l)} en 2027 pour une personne affiliée à une caisse de pension (LPP).`
            : `The pillar 3a cap rises from ${chf(P26.avecLPP, l)} in 2026 to ${chf(P27.avecLPP, l)} in 2027 for someone in a pension fund (BVG/LPP).`,
          validite: fr ? "Valable pour les versements de l’année 2027." : "Valid for payments made in 2027.",
          sources: [S.ofas(l), S.opp3()],
          methode: fr ? "Montant fixé par le Conseil fédéral et publié par l’OFAS, repris tel quel." : "Amount set by the Federal Council and published by the FSIO, taken as published.",
        },
        {
          id: "plafond-3a-2027-sans-lpp",
          texte: fr
            ? `Sans caisse de pension, le versement 3a est limité à 20${N}% du revenu d’activité, au plus ${chf(P27.sansLPP, l)} en 2027 (${chf(P26.sansLPP, l)} en 2026).`
            : `Without a pension fund, the 3a payment is limited to 20% of earned income, up to ${chf(P27.sansLPP, l)} in 2027 (${chf(P26.sansLPP, l)} in 2026).`,
          validite: fr ? "Valable pour les versements de l’année 2027." : "Valid for payments made in 2027.",
          sources: [S.ofas(l), S.opp3()],
          methode: fr ? "Montant fixé par le Conseil fédéral et publié par l’OFAS, repris tel quel." : "Amount set by the Federal Council and published by the FSIO, taken as published.",
        },
      ],
    },
    {
      id: "taux-3a",
      question: fr ? `Combien rapporte un compte 3a${N}?` : "What does a pillar 3a account pay?",
      reponse: fr
        ? `Au relevé du ${dc(T3A.date)}, les comptes 3a des ${T3A.n} banques suivies rapportent de ${pct(T3A.min, l, 2)} à ${pct(T3A.max, l, 2)} par an, avec un taux médian de ${pct(T3A.mediane, l, 2)}.`
        : `In the survey of ${dc(T3A.date)}, the pillar 3a accounts of the ${T3A.n} banks tracked pay ${pct(T3A.min, l, 2)} to ${pct(T3A.max, l, 2)} a year, with a median rate of ${pct(T3A.mediane, l, 2)}.`,
      faits: [
        {
          id: "taux-3a-fourchette",
          texte: fr
            ? `Le ${dc(T3A.date)}, le taux de base des comptes 3a va de ${pct(T3A.min, l, 2)} à ${pct(T3A.max, l, 2)} par an selon la banque, sur ${T3A.n} banques suivies.`
            : `On ${dc(T3A.date)}, the base rate of pillar 3a accounts ranges from ${pct(T3A.min, l, 2)} to ${pct(T3A.max, l, 2)} a year depending on the bank, across ${T3A.n} banks tracked.`,
          validite: fr ? `Au relevé du ${dc(T3A.date)} ; les taux sont variables et relevés chaque lundi.` : `As of the survey of ${dc(T3A.date)}; rates are variable and read every Monday.`,
          sources: [S.banques(l)],
          methode: fr ? "Taux lus sur la page officielle ou la fiche de taux de chaque banque." : "Rates read on each bank’s official page or rate sheet.",
        },
        {
          id: "taux-3a-median",
          texte: fr
            ? `Le taux médian des comptes 3a est de ${pct(T3A.mediane, l, 2)} et le taux moyen de ${pct(T3A.moyenne, l, 3).replace(/0(\D*)$/, "$1")} au relevé du ${dc(T3A.date)}.`
            : `The median pillar 3a rate is ${pct(T3A.mediane, l, 2)} and the mean ${pct(T3A.moyenne, l, 3).replace(/0(\D*)$/, "$1")} in the survey of ${dc(T3A.date)}.`,
          validite: fr ? `Au relevé du ${dc(T3A.date)}.` : `As of the survey of ${dc(T3A.date)}.`,
          sources: [S.banques(l), { label: fr ? "Historique des taux 3a (CSV)" : "Pillar 3a rate history (CSV)", url: abs("/data/taux-3a-historique.csv") }],
          methode: fr ? `Médiane et moyenne non pondérées des ${T3A.n} taux de base, calculées par Guide Assurance.` : `Unweighted median and mean of the ${T3A.n} base rates, calculated by Guide Assurance.`,
        },
        {
          id: "taux-3a-bns",
          texte: fr
            ? `Selon la Banque nationale suisse, le taux moyen des comptes 3a est de ${tb(BNS3A.dernier.moyenne, l)} en ${moisTexte(BNS3A.dernier.mois, "fr")}, contre ${tb(BNS3A.plusHaut.moyenne, l)} au plus haut de la série, en ${moisTexte(BNS3A.plusHaut.mois, "fr")}.`
            : `According to the Swiss National Bank, the mean pillar 3a account rate is ${tb(BNS3A.dernier.moyenne, l)} in ${moisTexte(BNS3A.dernier.mois, "en")}, against ${tb(BNS3A.plusHaut.moyenne, l)} at the series high, in ${moisTexte(BNS3A.plusHaut.mois, "en")}.`,
          validite: fr ? `Mois de ${moisTexte(BNS3A.dernier.mois, "fr")}, publié par la BNS le ${dc(PUBLIE_LE_SNB)} ; série mensuelle depuis ${moisTexte(BNS3A.premier.mois, "fr")}.` : `Month of ${moisTexte(BNS3A.dernier.mois, "en")}, released by the SNB on ${dc(PUBLIE_LE_SNB)}; monthly series since ${moisTexte(BNS3A.premier.mois, "en")}.`,
          sources: [S.bns(l)],
          methode: fr ? "Moyenne non pondérée des taux publiés par les banques qui les déclarent à la BNS, fin de mois, reprise telle quelle. Ce n’est pas le relevé de Guide Assurance." : "Unweighted average of the rates published by the banks that report them to the SNB, end of month, used as published. This is not Guide Assurance’s own survey.",
        },
      ],
    },
    {
      id: "economie-3a",
      question: fr ? `Combien d’impôt un versement 3a fait-il économiser selon la commune${N}?` : "How much tax does a pillar 3a payment save, by municipality?",
      reponse: fr
        ? `Pour une personne seule avec ${chf(PROFIL.revenu, l)} de revenu imposable qui verse ${chf(PROFIL.versement, l)}, l’économie d’impôt 2026 va de ${chf(Math.min(...tabs.map((t) => t.min.economie)), l)} à ${chf(Math.max(...tabs.map((t) => t.max.economie)), l)} selon la commune romande.`
        : `For a single person with ${chf(PROFIL.revenu, l)} of taxable income who pays in ${chf(PROFIL.versement, l)}, the 2026 tax saving ranges from ${chf(Math.min(...tabs.map((t) => t.min.economie)), l)} to ${chf(Math.max(...tabs.map((t) => t.max.economie)), l)} depending on the municipality in Romandy.`,
      faits: tabs.map((t) => ({
        id: `economie-3a-${t.canton.toLowerCase()}`,
        texte: fr
          ? `${NOM.fr[t.canton].replace(/^./, (x) => x.toUpperCase())}, un versement 3a de ${chf(PROFIL.versement, l)} fait économiser à une personne seule avec ${chf(PROFIL.revenu, l)} de revenu imposable de ${chf(t.min.economie, l)} (${t.min.commune}) à ${chf(t.max.economie, l)} (${t.max.commune}) d’impôt 2026, selon la commune.`
          : `${NOM.en[t.canton].replace(/^./, (x) => x.toUpperCase())}, a ${chf(PROFIL.versement, l)} pillar 3a payment saves a single person with ${chf(PROFIL.revenu, l)} of taxable income between ${chf(t.min.economie, l)} (${t.min.commune}) and ${chf(t.max.economie, l)} (${t.max.commune}) in 2026 tax, depending on the municipality.`,
        validite: fr ? "Valable pour l’année fiscale 2026." : "Valid for the 2026 tax year.",
        sources: [S.afc(l), { label: fr ? "Table complète par commune" : "Full table by municipality", url: abs(`${fr ? PAGES_DONNEES.communes3a : PAGES_DONNEES_EN.communes3a}`) }],
        methode: fr
          ? `Calcul Guide Assurance pour les ${t.lignes.length} communes avec les barèmes 2026 vérifiés sur les calculettes officielles : impôt fédéral, cantonal et communal, sans fortune ni impôt ecclésiastique.`
          : `Calculated by Guide Assurance for all ${t.lignes.length} municipalities with 2026 scales checked against the official calculators: federal, cantonal and municipal tax, no wealth or church tax.`,
      })),
    },
    {
      id: "delais",
      question: fr ? `Quels délais faut-il connaître pour 2027${N}?` : "Which deadlines matter for 2027?",
      reponse: fr
        ? `Pour changer d’assurance de base au 1er janvier 2027, la résiliation doit être reçue par l’assureur au plus tard le 30 novembre 2026 (art. 7, al. 2, LAMal). Les autres délais dépendent de la situation : complémentaire, frontalier, arrivée en Suisse ou versement 3a.`
        : "To switch basic health insurance on 1 January 2027, the insurer must receive the cancellation by 30 November 2026 at the latest (art. 7(2) LAMal). Other deadlines depend on the situation: supplementary insurance, cross-border work, moving to Switzerland or a 3a payment.",
      faits: [
        {
          id: "resiliation-lamal-30-novembre",
          texte: fr
            ? `Pour changer d’assurance de base au 1er janvier 2027, la lettre de résiliation doit parvenir à l’assureur au plus tard le 30 novembre 2026 (art. 7, al. 2, LAMal).`
            : "To switch basic health insurance on 1 January 2027, the cancellation letter must reach the insurer by 30 November 2026 at the latest (art. 7(2) LAMal).",
          validite: fr ? "Valable jusqu’au 30 novembre 2026, pour un changement au 1er janvier 2027." : "Valid until 30 November 2026, for a switch on 1 January 2027.",
          sources: [S.lamal7()],
          methode: fr ? "Délai légal ; la date de réception compte, pas celle de l’envoi." : "Statutory deadline; the date of receipt counts, not the date of posting.",
        },
        {
          id: "resiliation-lamal-30-juin",
          texte: fr
            ? `Avec la franchise de 300${N}CHF et le modèle standard, l’assurance de base peut aussi être résiliée pour le 30 juin, par une lettre reçue au plus tard le 31 mars (art. 7, al. 1, LAMal).`
            : "With the CHF 300 deductible and the standard model, basic insurance can also be cancelled for 30 June, by a letter received by 31 March at the latest (art. 7(1) LAMal).",
          validite: fr ? "Règle permanente ; prochaine échéance le 31 mars 2027 pour le 30 juin 2027." : "Permanent rule; next deadline 31 March 2027 for 30 June 2027.",
          sources: [S.lamal7()],
          methode: fr ? "Délai légal." : "Statutory deadline.",
        },
        {
          id: "complementaire-art-35a-lca",
          texte: fr
            ? `Une complémentaire santé peut être résiliée pour la fin de la 3e année du contrat, puis pour la fin de chaque année, avec un préavis de 3 mois (art. 35a, al. 1, LCA).`
            : "Supplementary health insurance can be cancelled for the end of the third year of the contract, then for the end of each year, with three months’ notice (art. 35a(1) LCA).",
          validite: fr ? "Règle permanente, sauf clause plus favorable du contrat." : "Permanent rule, unless the contract has a more favourable clause.",
          sources: [S.lca35a()],
          methode: fr ? "Délai légal." : "Statutory deadline.",
        },
        {
          id: "frontaliers-droit-option",
          texte: fr
            ? `Une personne qui vit en France et commence à travailler en Suisse a 3 mois dès le début de son activité pour choisir entre la LAMal et l’assurance maladie française (droit d’option).`
            : "A person living in France who starts working in Switzerland has three months from the start of work to choose between LAMal and French health insurance (right of option).",
          validite: fr ? "Règle permanente." : "Permanent rule.",
          sources: [S.cleiss(l), S.lamal3()],
          methode: fr ? "Délai fixé par l’accord sur la libre circulation, décrit par le CLEISS ; en principe irrévocable." : "Deadline set under the free movement agreement, as described by CLEISS; in principle irrevocable.",
        },
        {
          id: "nouveaux-arrivants-3-mois",
          texte: fr
            ? `Une personne qui s’installe en Suisse a 3 mois après sa prise de domicile pour conclure l’assurance de base, qui la couvre alors depuis son arrivée (art. 3, al. 1, et art. 5, al. 1, LAMal).`
            : "Someone who moves to Switzerland has three months after taking up residence to take out basic insurance, which then covers them from the day they arrived (art. 3(1) and art. 5(1) LAMal).",
          validite: fr ? "Règle permanente." : "Permanent rule.",
          sources: [S.lamal3(), S.lamal5()],
          methode: fr ? "Délai légal." : "Statutory deadline.",
        },
        {
          id: "versement-3a-31-decembre",
          texte: fr
            ? `Pour être déduit des revenus 2026, un versement 3a doit être crédité sur le compte au plus tard le 31 décembre 2026 ; les banques fixent souvent une date limite de virement quelques jours avant.`
            : "To be deducted from 2026 income, a pillar 3a payment must be credited to the account by 31 December 2026; banks often set a transfer cut-off a few days earlier.",
          validite: fr ? "Valable jusqu’au 31 décembre 2026, pour l’année fiscale 2026." : "Valid until 31 December 2026, for the 2026 tax year.",
          sources: [S.geDeduction(l), S.opp3()],
          methode: fr ? "Règle fiscale ; la date de crédit sur le compte compte." : "Tax rule; the date the money is credited counts.",
        },
      ],
    },
  ];
}

export const toutesLesSources = (l: Locale) => [...new Map(groupes(l).flatMap((g) => g.faits.flatMap((f) => f.sources)).map((s) => [s.url, s])).values()];

/* Version Markdown pour llms-full.txt. */
export function chiffresClesMarkdown(l: Locale): string {
  const fr = l === "fr";
  const path = fr ? PAGES_DONNEES.chiffres : PAGES_DONNEES_EN.chiffres;
  const out = [
    `# ${fr ? "Chiffres clés 2027 : assurance maladie et 3e pilier en Suisse romande" : "2027 key figures: health insurance and pillar 3a in French-speaking Switzerland"}`,
    "",
    `${fr ? "Adresse" : "URL"}${fr ? N : ""}: ${abs(path)}`,
    "",
  ];
  for (const g of groupes(l)) {
    out.push(`## ${g.question}`, "", g.reponse, "");
    for (const f of g.faits) {
      out.push(`- ${f.texte} ${f.validite} ${f.methode} ${fr ? "Source" : "Source"}${fr ? N : ""}: ${f.sources.map((s) => `[${s.label}](${s.url})`).join(", ")}. ${fr ? "Lien" : "Link"}${fr ? N : ""}: ${abs(path)}#${f.id}`);
    }
    out.push("");
  }
  return out.join("\n");
}
