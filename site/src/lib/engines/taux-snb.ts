/* Taux des comptes 3a et de libre passage selon la statistique mensuelle de la Banque nationale suisse
   (src/data/snb-taux-prevoyance.json : data/scripts/taux_prevoyance_snb.py, mis à jour par infra/refresh/tauxsnb.py).
   Cube zikrepro du portail data.snb.ch, « Taux d'intérêt publiés pour nouvelles opérations » : moyenne non pondérée,
   quartiles et médiane des taux publiés par les banques qui déclarent à la BNS, fin de mois. Valeurs reprises telles
   quelles : rien n'est recalculé ni interpolé ici, seuls les repères du commentaire (plus haut, plus bas, douze mois)
   sont tirés de la série. La série brute n'est pas republiée (conditions d'utilisation de la BNS, réutilisation
   « à des fins non commerciales ») : les pages renvoient au portail de la BNS pour la télécharger. Sans dépendance : testé par node (tests/taux-snb.test.mts). */
import D from "../../data/snb-taux-prevoyance.json" with { type: "json" };

export type PointSnb = { mois: string; moyenne: number; q25: number; mediane: number; q75: number };
export type CodeSnb = "GVG_S3A" | "GVG_F2S";
export type SerieSnb = { code: CodeSnb; libelle_fr: string; libelle_en: string; points: PointSnb[] };

export const SOURCE_SNB = D.source;
export const PUBLIE_LE_SNB: string = D.publie_le;

const serie = (code: CodeSnb): SerieSnb => {
  const s = (D.series as Record<CodeSnb, Omit<SerieSnb, "code">>)[code];
  return { code, ...s, points: [...s.points].sort((a, b) => a.mois.localeCompare(b.mois)) };
};
export const SNB_3A = serie("GVG_S3A");
export const SNB_LP = serie("GVG_F2S");

/* Mois « AAAA-MM » décalé de n mois. */
export const decalerMois = (mois: string, n: number) => {
  const [a, m] = mois.split("-").map(Number);
  const k = a * 12 + (m - 1) + n;
  return `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, "0")}`;
};

export type Reperes = {
  premier: PointSnb;
  dernier: PointSnb;
  /* Moyenne la plus haute et la plus basse de la série (premier mois atteint en cas d'égalité). */
  plusHaut: PointSnb;
  plusBas: PointSnb;
  /* Même mois un an plus tôt (absent si la BNS ne le donne pas) et écart de la moyenne, en points de %. */
  ilYa12Mois: PointSnb | null;
  ecart12Mois: number | null;
  /* Dernier mois publié de chaque année civile (décembre, ou le dernier mois de l'année en cours). */
  finsAnnee: PointSnb[];
};

export function reperes(points: readonly PointSnb[]): Reperes {
  if (!points.length) throw new Error("série BNS vide");
  const p = [...points].sort((a, b) => a.mois.localeCompare(b.mois));
  const dernier = p[p.length - 1];
  const plusHaut = p.reduce((a, b) => (b.moyenne > a.moyenne ? b : a));
  const plusBas = p.reduce((a, b) => (b.moyenne < a.moyenne ? b : a));
  const ilYa12Mois = p.find((x) => x.mois === decalerMois(dernier.mois, -12)) ?? null;
  const finsAnnee = p.filter((x, i) => i === p.length - 1 || p[i + 1].mois.slice(0, 4) !== x.mois.slice(0, 4));
  return {
    premier: p[0],
    dernier,
    plusHaut,
    plusBas,
    ilYa12Mois,
    ecart12Mois: ilYa12Mois ? Math.round((dernier.moyenne - ilYa12Mois.moyenne) * 1e4) / 1e4 : null,
    finsAnnee,
  };
}

/* Taux affiché : deux décimales, trois quand la troisième compte (0,199 %), comme les autres pages de taux. Même
   forme que valeur_page() dans infra/refresh/tauxsnb.py, qui vérifie la valeur en ligne. */
export const decimalesSnb = (x: number) => {
  const s = x.toFixed(3);
  return s.endsWith("0") ? s.slice(0, -1) : s;
};

const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/* « septembre 2026 », « September 2026 ». */
export const moisTexte = (mois: string, locale: "fr" | "en") => {
  const [a, m] = mois.split("-").map(Number);
  return `${(locale === "fr" ? MOIS_FR : MOIS_EN)[m - 1]} ${a}`;
};
