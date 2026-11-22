/* Économie d'impôt 3a : impôt sur le revenu 2026 (fédéral, cantonal, communal) pour Genève, Vaud, le Valais, Fribourg,
   Neuchâtel et le Jura bernois, avant et après un versement 3a, et impôt séparé sur un retrait en capital.
   Données : site/src/data/impots-2026.json, produit par data/scripts/build_impots_2026.py (barèmes 2026 de l'AFC et des
   cantons, coefficients communaux officiels). Vérifié sur les calculettes officielles de chaque canton et sur le
   calculateur de l'AFC (tests/impot3a.test.mts). Aucun appel réseau : tout se calcule
   dans le navigateur. Montants en CHF, arrondis aux 5 centimes comme les calculettes cantonales. */
import D from "../../data/impots-2026.json" with { type: "json" };

export type Canton = "GE" | "VD" | "VS" | "FR" | "NE" | "BE";
export type EtatCivil = "seul" | "marie" | "monoparental";
export type Ligne = [montant: number, impot: number, taux: number];

export const ANNEE_FISCALE = D.annee;
export const DONNEES = D;
export const CANTONS: Canton[] = ["GE", "VD", "VS", "FR", "NE", "BE"];
/* Berne : seulement les communes de l'arrondissement du Jura bernois. */
export const NOM_CANTON: Record<"fr" | "en", Record<Canton, string>> = {
  fr: { GE: "Genève", VD: "Vaud", VS: "Valais", FR: "Fribourg", NE: "Neuchâtel", BE: "Jura bernois" },
  en: { GE: "Geneva", VD: "Vaud", VS: "Valais", FR: "Fribourg", NE: "Neuchâtel", BE: "Bernese Jura" },
};
export const MAX_ENFANTS = 5;
/* Vaud : blocage du quotient relevé pour 1 à 3 enfants chez un parent seul (calculette ACI). */
export const maxEnfants = (canton: Canton, etat: EtatCivil) => (etat === "seul" ? 0 : canton === "VD" && etat === "monoparental" ? D.vd.blocage.monoparental.length : MAX_ENFANTS);

/* coefficient : GE et VD en centimes ou %, FR et NE en % de l'impôt de base, VS facteur (1 à 1,5), BE quotité
   (facteur). indexation : Valais seulement (indexation communale du barème, en %). */
export type Commune = { nom: string; bfs: number; coefficient: number; indexation?: number };
const lire = (rows: (string | number)[][]): Commune[] =>
  rows.map(([nom, bfs, c, ix]) => ({ nom: String(nom), bfs: Number(bfs), coefficient: Number(c), ...(ix !== undefined ? { indexation: Number(ix) } : {}) }));
export const COMMUNES: Record<Canton, Commune[]> = {
  GE: lire(D.ge.communes),
  VD: lire(D.vd.communes),
  VS: lire(D.vs.communes),
  FR: lire(D.fr.communes),
  NE: lire(D.ne.communes),
  BE: lire(D.be.communes),
};
export const COMMUNE_DEFAUT: Record<Canton, string> = { GE: "Genève", VD: "Lausanne", VS: "Sion", FR: "Fribourg", NE: "Neuchâtel", BE: "Saint-Imier" };
export const trouverCommune = (canton: Canton, nom: string) =>
  COMMUNES[canton].find((c) => c.nom.localeCompare(nom, "fr", { sensitivity: "base" }) === 0);

export type Profil = {
  canton: Canton;
  commune: string;
  etat: EtatCivil;
  enfants: number;
  /* Revenu imposable cantonal et communal (après déductions). */
  revenu: number;
  /* Revenu imposable pour l'impôt fédéral direct ; par défaut le même que le cantonal. */
  revenuIfd?: number;
};

export type Impots = { ifd: number; cantonal: number; communal: number; total: number };

const r05 = (x: number) => Math.round(x * 20 + 1e-9) / 20;
const plancher05 = (x: number) => Math.floor(x * 20 + 1e-9) / 20;
const cent = (x: number) => Math.floor(x / 100) * 100;

/* Lecture d'un barème « par tranches » de l'AFC : à `montant`, l'impôt vaut `impot` ; au-delà, `taux` % par franc. */
export function bareme(t: Ligne[], x: number): number {
  if (x <= 0) return 0;
  let l: Ligne | null = null;
  for (const row of t) if (x >= row[0]) l = row;
  return l ? l[1] + ((x - l[0]) * l[2]) / 100 : 0;
}

const famille = (etat: EtatCivil, enfants: number) => etat === "marie" || (etat === "monoparental" && enfants > 0);

/* Impôt fédéral direct (art. 36 LIFD) : barème de base ou barème parental, rabais de 263 CHF par enfant,
   revenu arrondi à la centaine inférieure, montant inférieur à 25 CHF non perçu. */
export function impotFederal(revenu: number, etat: EtatCivil, enfants: number): number {
  const fam = famille(etat, enfants);
  let t = bareme((fam ? D.ifd.famille : D.ifd.seul) as Ligne[], cent(revenu));
  t = Math.max(0, t - D.ifd.rabaisEnfant * (etat === "seul" ? 0 : enfants));
  t = plancher05(t);
  return t < D.ifd.minimum ? 0 : t;
}

/* Genève : impôt de base selon le barème (art. 41 LIPP), taux de la moitié du revenu pour les couples et les parents seuls
   (splitting) ; impôt cantonal = base + 47,5 % de centimes cantonaux, moins 12 % (loi du 26.09.1999), plus 1 % pour
   l'aide à domicile ; impôt communal = base x centimes de la commune (part privilégiée comprise). */
function baseGE(revenu: number, split: boolean): number {
  const t = D.ge.bareme as Ligne[];
  return split ? 2 * bareme(t, revenu / 2) : bareme(t, revenu);
}
function geMultiplie(base: number, coefCommune: number): { cantonal: number; communal: number } {
  const b = r05(base);
  const ca = r05((b * D.ge.centimesCantonaux) / 100);
  const cantonal = b - r05((b * D.ge.reduction) / 100) + ca + r05((b * D.ge.aideDomicile) / 100) - r05((ca * D.ge.reduction) / 100);
  return { cantonal: r05(cantonal), communal: r05((b * coefCommune) / 100) };
}

/* Vaud : taux du revenu déterminant (revenu / parts, quotient familial avec blocage pour les enfants), appliqué au revenu
   imposable arrondi à la centaine ; impôt cantonal = base moins 5 % (2026) x 155 % ; communal = base x coefficient ;
   cantonal + communal au plus 30 % du revenu imposable. */
export function revenuDeterminantVD(revenu: number, etat: EtatCivil, enfants: number): number {
  const p = D.vd.parts;
  const base = etat === "marie" ? p.marie : etat === "monoparental" && enfants > 0 ? p.monoparental : p.seul;
  const n = etat === "seul" ? 0 : enfants;
  let u = revenu / (base + p.enfant * n);
  if (n > 0) {
    const table = etat === "marie" ? D.vd.blocage.marie : D.vd.blocage.monoparental;
    const ded = table[Math.min(n, table.length) - 1];
    u = Math.max(u, revenu / base - ded);
  }
  return cent(u);
}
function tauxVD(u: number): number {
  if (u <= 0) return 0;
  const [seuil, au] = D.vd.auDela;
  const t = u > seuil ? bareme(D.vd.bareme as Ligne[], seuil) + ((u - seuil) * au) / 100 : bareme(D.vd.bareme as Ligne[], u);
  return t / u;
}
function vdMultiplie(base: number, coefCommune: number, revenuPlafond: number | null, reduction: number) {
  const b = r05(base);
  let cantonal = r05(((b - r05((b * reduction) / 100)) * D.vd.coefficientCantonal) / 100);
  let communal = r05((b * coefCommune) / 100);
  if (revenuPlafond !== null) {
    const plafond = (revenuPlafond * D.vd.plafond) / 100;
    if (cantonal + communal > plafond) {
      const f = plafond / (cantonal + communal);
      cantonal = r05(cantonal * f);
      communal = r05(communal * f);
    }
  }
  return { cantonal, communal };
}

export function impotRevenu(p: Profil): Impots {
  const c = trouverCommune(p.canton, p.commune) ?? trouverCommune(p.canton, COMMUNE_DEFAUT[p.canton])!;
  const revenu = Math.max(0, p.revenu);
  const enfants = p.etat === "seul" ? 0 : p.enfants;
  const ifd = impotFederal(Math.max(0, p.revenuIfd ?? revenu), p.etat, enfants);
  let icc: { cantonal: number; communal: number };
  const fam = famille(p.etat, enfants);
  if (p.canton === "GE") {
    icc = geMultiplie(baseGE(revenu, fam), c.coefficient);
  } else if (p.canton === "VD") {
    const r = cent(revenu);
    icc = vdMultiplie(tauxVD(revenuDeterminantVD(r, p.etat, enfants)) * r, c.coefficient, revenu, D.vd.reduction);
  } else if (p.canton === "VS") icc = revenuVS(revenu, fam, enfants, c);
  else if (p.canton === "FR") icc = revenuFR(revenu, fam, c);
  else if (p.canton === "NE") icc = revenuNE(revenu, fam, enfants, c);
  else icc = revenuBE(revenu, fam, c);
  return { ifd, ...icc, total: r05(ifd + icc.cantonal + icc.communal) };
}

type ICC = { cantonal: number; communal: number };

/* Valais (LF art. 32, 33b, 178) : le revenu arrondi à la centaine est « désindexé » (division par 1,10 par tranche de
   10 points d'indice, puis par 1 + reste, en francs entiers) pour lire le taux, arrondi à 4 décimales ; indice cantonal
   173, indice communal propre à chaque commune. Couple ou parent seul : réduction de 35 % (680 à 4 900 CHF) sur chaque
   impôt ; impôt cantonal moins 300 CHF par enfant, au moins 10 CHF. Communal = impôt simple x coefficient. */
type Echelon = number[];
function desindexe(r: number, indice: number): number {
  let d = r;
  for (let i = 0; i < Math.floor((indice - 100) / 10); i++) d = Math.floor((d * 100) / 110);
  const reste = (indice - 100) % 10;
  return reste ? Math.floor((d * 100) / (100 + reste)) : d;
}
/* Taux en dix-millièmes de %, barème [dès, taux, hausse par 100 CHF] (VS). */
function tauxVS(t: Echelon[], d: number): number {
  let l = t[0];
  for (const e of t) if (d > e[0] || e[0] === 0) l = e;
  if (d >= t[t.length - 1][0]) l = t[t.length - 1];
  return Math.round(l[1] * 1e4) + Math.floor(((d - l[0]) * Math.round(l[2] * 1e4) + 50) / 100);
}
const r05e = (dixMill: number) => Math.floor((dixMill + 250) / 500) / 20; // montant en 1/10 000 CHF, arrondi aux 5 ct
const cents = (x: number) => Math.round(x * 100 + 1e-7) / 100;
function reductionVS(brut: number): number {
  const r = D.vs.reduction;
  return Math.min(r05(brut), Math.max(r.min, Math.min(r.max, r05((brut * r.taux) / 100))));
}
function revenuVS(revenu: number, fam: boolean, enfants: number, c: Commune): ICC {
  const r = cent(revenu);
  const tc = tauxVS(D.vs.cantonal, desindexe(r, D.vs.indice));
  const brutC = (r / 100) * tc; // en 1/10 000 CHF
  let cantonal = r05e(brutC) - (fam ? reductionVS(brutC / 1e4) : 0) - D.vs.rabaisEnfant * enfants;
  cantonal = Math.max(D.vs.minimum, cents(cantonal));
  const tm = tauxVS(D.vs.communal, desindexe(r, c.indexation ?? 100));
  const brutM = cents(((r / 100) * tm) / 1e4) * c.coefficient;
  const communal = Math.max(0, cents(r05(brutM) - (fam ? reductionVS(brutM) : 0)));
  return { cantonal, communal };
}
function capitalVS(k: number, fam: boolean, c: Commune): ICC {
  const a = cent(k);
  const K = D.vs.capital;
  const rente = cent(a / K.diviseur);
  const tc = Math.min(K.tauxMax * 1e4, Math.max(K.tauxMin * 1e4, tauxVS(D.vs.cantonal, desindexe(rente, D.vs.indice))));
  const cant = r05e((a / 100) * tc);
  const tm = tauxVS(D.vs.communal, desindexe(rente, c.indexation ?? 100));
  const comm = r05(Math.min(cents(((a / 100) * tm) / 1e4) * c.coefficient, (a * K.tauxMax) / 100));
  const red = (x: number) => (fam ? Math.min(K.reductionFamille.max, r05((x * K.reductionFamille.taux) / 100)) : 0);
  return { cantonal: cents(cant - red(cant)), communal: cents(comm - red(comm)) };
}

/* Fribourg (LICD art. 37 et 39) : taux qui monte d'un pas fixe par 100 CHF dans chaque tranche ; couple ou parent seul
   au taux de la moitié du revenu (arrondie à la centaine), au moins 1 % dès 5 200 CHF ; cantonal = base x 96 %,
   communal = base x coefficient. Capital : 1 à 5 % par tranche de 50 000 CHF, 10 000 CHF déduits pour un couple ou un
   parent seul, rien sous 10 000 CHF ; coefficient cantonal non appliqué (taux fixes). */
function tauxFR(x: number): number {
  let l = D.fr.bareme[0];
  for (const e of D.fr.bareme) if (x >= e[0]) l = e;
  return l[1] + ((x - l[0]) / 100) * l[2];
}
function revenuFR(revenu: number, fam: boolean, c: Commune): ICC {
  const y = cent(revenu);
  if (y < 5200) return { cantonal: 0, communal: 0 };
  const taux = Math.max(1, tauxFR(fam ? cent(y * 0.5) : y));
  const base = r05((y * taux) / 100);
  return { cantonal: r05((base * D.fr.coefficientCantonal) / 100), communal: r05((base * c.coefficient) / 100) };
}
function tranches(t: number[][], x: number): number {
  let reste = x;
  let impot = 0;
  for (const [largeur, taux] of t) {
    if (reste <= 0) break;
    const d = Math.min(reste, largeur);
    impot += (d * taux) / 100;
    reste -= d;
  }
  return impot;
}
function capitalFR(k: number, fam: boolean, c: Commune): ICC {
  const K = D.fr.capital;
  const x = cent(Math.max(0, k - (fam ? K.deductionFamille : 0)));
  if (x < K.seuil) return { cantonal: 0, communal: 0 };
  const base = r05(tranches(K.tranches, x));
  return { cantonal: base, communal: r05((base * c.coefficient) / 100) };
}

/* Neuchâtel (LCdir art. 40bquater, 40c, 42) : barème à taux marginaux sur le revenu arrondi à la centaine ; couple ou
   parent seul au taux de 52 % du revenu ; cantonal = base x 124 % moins 200 CHF par enfant, communal = base x
   coefficient. Capital : quart du taux du barème, au moins 2,5 %. */
const marginal = (t: number[][], x: number) => {
  let impot = 0;
  let bas = 0;
  for (const [haut, taux] of t) {
    if (x <= bas) break;
    impot += ((Math.min(x, haut) - bas) * taux) / 100;
    bas = haut;
  }
  return impot;
};
function tauxNE(r: number, fam: boolean): number {
  const q = fam ? cent((r * D.ne.split) / 100) : r;
  return q > 0 ? marginal(D.ne.bareme, q) / q : 0;
}
function revenuNE(revenu: number, fam: boolean, enfants: number, c: Commune): ICC {
  const r = cent(revenu);
  const base = r * tauxNE(r, fam);
  return {
    cantonal: r05(Math.max(0, (base * D.ne.coefficientCantonal) / 100 - D.ne.rabaisEnfant * enfants)),
    communal: r05((base * c.coefficient) / 100),
  };
}
function capitalNE(k: number, fam: boolean, c: Commune): ICC {
  if (k <= 0) return { cantonal: 0, communal: 0 };
  const taux = Math.max(tauxNE(cent(k), fam) / D.ne.capital.fraction, D.ne.capital.tauxMin / 100);
  return { cantonal: r05(k * taux * (D.ne.coefficientCantonal / 100)), communal: r05((k * taux * c.coefficient) / 100) };
}

/* Jura bernois (LI BE art. 42 et 44) : impôt simple par tranches, barème famille pour un couple ou un parent seul ;
   cantonal = simple x 2,975, communal = simple x quotité. Capital : barème propre, rien sous 5 300 CHF. */
function revenuBE(revenu: number, fam: boolean, c: Commune): ICC {
  const s = tranches(fam ? D.be.famille : D.be.seul, cent(revenu));
  return { cantonal: r05(s * D.be.quotiteCantonale), communal: r05(s * c.coefficient) };
}
function capitalBE(k: number, fam: boolean, c: Commune): ICC {
  if (k < D.be.capitalSeuil) return { cantonal: 0, communal: 0 };
  const s = tranches(fam ? D.be.capitalFamille : D.be.capitalSeul, cent(k));
  return { cantonal: r05(s * D.be.quotiteCantonale), communal: r05(s * c.coefficient) };
}

export type Economie = { avant: Impots; apres: Impots; economie: Impots; part: number; versement: number };

/* Économie de l'année : impôt sur le revenu sans le versement, moins l'impôt avec le versement déduit des deux revenus. */
export function economie3a(p: Profil, versement: number): Economie {
  const v = Math.max(0, Math.min(versement, p.revenu));
  const avant = impotRevenu(p);
  const apres = impotRevenu({ ...p, revenu: p.revenu - v, revenuIfd: Math.max(0, (p.revenuIfd ?? p.revenu) - v) });
  const economie = {
    ifd: r05(avant.ifd - apres.ifd),
    cantonal: r05(avant.cantonal - apres.cantonal),
    communal: r05(avant.communal - apres.communal),
    total: r05(avant.total - apres.total),
  };
  return { avant, apres, economie, part: v > 0 ? economie.total / v : 0, versement: v };
}

/* Retrait en capital (3a ou 2e pilier), imposé à part de tout autre revenu :
   IFD 1/5 du barème (art. 38 LIFD) ; GE taux du cinquième du barème (art. 45 LIPP), mêmes centimes et réductions ;
   VD 1/5 du taux du barème avec la part 1,8 pour un couple et 1,3 pour un parent seul, sans parts d'enfant ni baisse
   de 5 %. Les capitaux reçus la même année par un couple s'additionnent. */
export function impotCapital(canton: Canton, commune: string, etat: EtatCivil, enfants: number, capital: number): Impots & { taux: number } {
  const c = trouverCommune(canton, commune) ?? trouverCommune(canton, COMMUNE_DEFAUT[canton])!;
  const k = Math.max(0, capital);
  const fam = famille(etat, enfants);
  const ifdBrut = bareme((fam ? D.ifd.famille : D.ifd.seul) as Ligne[], cent(k)) / 5;
  const ifd = plancher05(ifdBrut) < D.ifd.minimum ? 0 : plancher05(ifdBrut);
  let icc: { cantonal: number; communal: number };
  if (canton === "GE") {
    icc = geMultiplie(baseGE(k, fam) / 5, c.coefficient);
  } else if (canton === "VD") {
    const r = cent(k);
    const parts = etat === "marie" ? D.vd.parts.marie : fam ? D.vd.parts.monoparental : D.vd.parts.seul;
    icc = vdMultiplie((tauxVD(cent(r / parts)) / 5) * r, c.coefficient, null, 0);
  } else if (canton === "VS") icc = capitalVS(k, fam, c);
  else if (canton === "FR") icc = capitalFR(k, fam, c);
  else if (canton === "NE") icc = capitalNE(k, fam, c);
  else icc = capitalBE(k, fam, c);
  const total = r05(ifd + icc.cantonal + icc.communal);
  return { ifd, ...icc, total, taux: k > 0 ? total / k : 0 };
}

/* Plafonds 3a (OPP 3, art. 7 ; OFAS) : avec caisse de pension, montant fixe par personne ; sans, 20 % du revenu
   de l'activité lucrative, au plus le montant maximal. */
export type AnneePlafond = "2026" | "2027";
export const PLAFONDS = D.plafonds3a as Record<AnneePlafond, { avecLPP: number; sansLPP: number }>;
export function plafond3a(annee: AnneePlafond, lpp: boolean, revenuActivite?: number): number {
  const p = PLAFONDS[annee];
  if (lpp) return p.avecLPP;
  return revenuActivite === undefined ? p.sansLPP : Math.min(p.sansLPP, Math.max(0, Math.round(revenuActivite * 0.2)));
}
