/* Subsides d'assurance maladie 2027 : estimation par canton romand. Fonctions pures, sans DOM, testées par
   tests/subsides.test.mts. Les barèmes viennent de src/data/subsides-2027.json, écrit par data/scripts/build_subsides.py
   à partir des textes officiels (arrêtés, mémento, tableaux des offices cantonaux) relevés le 24.11.2026.

   Règle de périmètre : un canton n'est calculé que si le barème 2027 est publié et se lit sans interprétation
   (tableau ou formule), avec le revenu déterminant propre au canton, que le visiteur lit sur son avis. Le Valais n'a
   pas encore publié son échelle 2027 : aucun montant n'est calculé. Les situations que le barème publié ne couvre pas
   (par exemple plus de charges que le tableau n'en prévoit) renvoient `calcule: false` plutôt qu'un chiffre deviné.
   Le résultat est une estimation : seule la décision de l'office cantonal fait foi.

   Prime : le subside est plafonné à la prime effective de chaque personne (GE art. 22 al. 4 LaLAMal, VD art. 22
   RLVLAMal, FR art. 6 al. 4 ORP, VS selon l'ECAS). La prime vient du visiteur ou, à défaut, de la prime moyenne
   cantonale 2027 de l'OFSP. */

import D from "../../data/subsides-2027.json" with { type: "json" };

export type Canton = "GE" | "VD" | "FR" | "VS" | "NE" | "JU";
export const CANTONS: Canton[] = ["GE", "VD", "FR", "VS", "NE", "JU"];
export type Categorie = "adulte" | "jeuneAdulte" | "enfant";
export type Region = "1" | "2";

/* adultes : 1 (personne seule ou famille monoparentale) ou 2 (couple) ; jeunesAdultes : 19 à 25 ans à charge,
   en formation ; enfants : 0 à 18 ans. */
export type Menage = { adultes: 1 | 2; jeunesAdultes: number; enfants: number };
export type Primes = Record<Categorie, number>;
export type Entree = {
  canton: Canton;
  menage: Menage;
  /* Revenu déterminant du canton, en francs par an, tel que lu sur l'avis (voir `REVENU` dans la page). */
  rdu: number;
  region?: Region;
  /* Jura : au moins un parent exerce une activité professionnelle (supplément famille). */
  activite?: boolean;
  /* Prime mensuelle de chaque personne de la catégorie, en francs. */
  primes: Primes;
};
export type Ligne = { categorie: Categorie; nombre: number; subside: number; prime: number; primeNette: number };
export type Motif = "information" | "hors-perimetre";
export type Resultat =
  | { calcule: false; motif: Motif; raison: "aucun-bareme-2027" | "charges" | "jeunes-adultes" | "enfants" | "region" }
  | {
      calcule: true;
      droit: boolean;
      lignes: Ligne[];
      subsideMensuel: number;
      primeMensuelle: number;
      primeNetteMensuelle: number;
      /* Libellé du groupe ou de la classe du barème (GE : « 4 », NE : « S6 »), s'il y en a un. */
      groupe?: string;
      /* Vaud : part ordinaire et part spécifique du subside mensuel du ménage. */
      vd?: { revenuOvam: number; ordinaire: number; specifique: number };
    };

export const DONNEES = D;
export const calcule = (c: Canton) => D.cantons[c].calcul;

const arrondiFranc = (x: number) => Math.ceil(x - 1e-9);
const centimes = (x: number) => Math.round(x * 100) / 100;

/* Lit un montant saisi à la main : « 52 000 », « 52'000 », « 52’000 » ou « 52000 ». Renvoie null si le champ est vide
   ou illisible. Un revenu déterminant négatif est accepté (il compte pour zéro dans les barèmes). */
export function lireRevenu(texte: string): number | null {
  const s = texte.replace(/[\s'’  ]/g, "");
  if (!/^-?\d{1,9}$/.test(s)) return null;
  return Number(s);
}

function lignes(e: Entree, subsides: Record<Categorie, number>): Ligne[] {
  const n: Record<Categorie, number> = { adulte: e.menage.adultes, jeuneAdulte: e.menage.jeunesAdultes, enfant: e.menage.enfants };
  return (["adulte", "jeuneAdulte", "enfant"] as Categorie[])
    .filter((c) => n[c] > 0)
    .map((c) => {
      const prime = e.primes[c];
      const subside = Math.min(subsides[c], prime);
      return { categorie: c, nombre: n[c], subside: centimes(subside), prime, primeNette: centimes(Math.max(0, prime - subside)) };
    });
}

function total(e: Entree, ls: Ligne[], extra?: Partial<Extract<Resultat, { calcule: true }>>): Resultat {
  const subsideMensuel = centimes(ls.reduce((s, l) => s + l.subside * l.nombre, 0));
  const primeMensuelle = centimes(ls.reduce((s, l) => s + l.prime * l.nombre, 0));
  void e;
  return { calcule: true, droit: subsideMensuel > 0, lignes: ls, subsideMensuel, primeMensuelle, primeNetteMensuelle: centimes(primeMensuelle - subsideMensuel), ...extra };
}

const zero = (): Record<Categorie, number> => ({ adulte: 0, jeuneAdulte: 0, enfant: 0 });
const charges = (m: Menage) => m.enfants + m.jeunesAdultes;

/* ---------------------------------------------------------------- Genève */
/* Barème 2027 du SAM : un groupe de 1 à 9 selon le RDU, le type de ménage et le nombre de charges légales (enfants et
   jeunes adultes à charge) ; le montant mensuel de chaque personne dépend du groupe. Groupe 9 : pas de subside pour
   l'adulte. Le RDU d'un jeune adulte qui vit chez ses parents s'ajoute à celui des parents (art. 10 al. 7 RaLAMal). */
export function groupeGE(menage: Menage, rdu: number): number | null {
  const T = D.cantons.GE.tables;
  const c = charges(menage);
  if (c > T.charges_max) return null;
  const lim = T.limites[menage.adultes === 2 ? "couple" : "seul"][String(c) as "0"] as (number | null)[];
  const r = Math.max(0, rdu);
  const i = lim.findIndex((l) => l !== null && r <= l);
  return i < 0 ? null : i + 1;
}

function ge(e: Entree): Resultat {
  const T = D.cantons.GE.tables;
  if (charges(e.menage) > T.charges_max) return { calcule: false, motif: "hors-perimetre", raison: "charges" };
  const g = groupeGE(e.menage, e.rdu);
  if (g == null) return total(e, lignes(e, zero()));
  const m = (k: "adulte" | "jeuneAdulte" | "enfant") => (T.montants[k][g - 1] as number | null) ?? 0;
  return total(e, lignes(e, { adulte: m("adulte"), jeuneAdulte: m("jeuneAdulte"), enfant: m("enfant") }), { groupe: String(g) });
}

/* ---------------------------------------------------------------- Fribourg */
/* Limite légale 2027 (ORP art. 3, mémento 2027) : 37 000 (seul sans enfant), 43 400 (seul avec enfant) ou 65 000 (couple),
   plus 14 000 par enfant à charge. Le taux de réduction se lit dans le tableau à 60 paliers selon l'écart en pour cent
   entre le revenu déterminant et la limite ; il s'applique à la prime moyenne régionale 2027. Enfant : au moins 80 %,
   jeune adulte en formation : au moins 50 %. */
export function limiteFR(menage: Menage): number | null {
  const L = D.cantons.FR.tables.limites;
  const c = charges(menage);
  if (c > L.enfants_max) return null;
  const base = menage.adultes === 2 ? L.couple : c > 0 ? L.seul_avec_enfant : L.seul_sans_enfant;
  return base + L.par_enfant * c;
}

/* Écart en pour cent sous la limite, arrondi à deux décimales (le tableau officiel avance par pas de 0,01 point). */
export function ecartFR(limite: number, rdu: number): number {
  if (rdu >= limite) return 0;
  return Math.max(0.01, Math.round(((limite - rdu) / limite) * 10000) / 100);
}

export function tauxFR(ecart: number): number {
  const P = D.cantons.FR.tables.paliers as { de: number; jusqua: number | null; taux: number }[];
  if (ecart <= 0) return 0;
  const p = P.find((x) => ecart >= x.de && (x.jusqua === null || ecart <= x.jusqua));
  return p ? p.taux : P[0].taux;
}

function fr(e: Entree): Resultat {
  const T = D.cantons.FR.tables;
  const lim = limiteFR(e.menage);
  if (lim == null) return { calcule: false, motif: "hors-perimetre", raison: "charges" };
  if (!e.region) return { calcule: false, motif: "hors-perimetre", raison: "region" };
  const rdu = Math.max(0, e.rdu);
  if (rdu >= lim) return total(e, lignes(e, zero()));
  const taux = tauxFR(ecartFR(lim, rdu));
  const pm = T.prime_moyenne[e.region];
  const montant = (cat: Categorie, plancher: number) => (Math.max(taux, plancher) / 100) * pm[cat];
  return total(
    e,
    lignes(e, {
      adulte: montant("adulte", 0),
      jeuneAdulte: montant("jeuneAdulte", T.taux_min_jeune_adulte),
      enfant: montant("enfant", T.taux_min_enfant),
    }),
  );
}

/* ---------------------------------------------------------------- Neuchâtel */
/* Classification S1 à S15 lue dans le tableau 2027 (adulte seul ou couple, selon le nombre d'enfants mineurs), puis
   montants mensuels de la classe pour l'adulte et pour l'enfant. Jeunes adultes et enfants au-delà de trois :
   l'arrêté renvoie à des règles que cet outil ne reprend pas. */
export function classeNE(menage: Menage, rdu: number): number | null {
  const T = D.cantons.NE.tables;
  const grille = (menage.adultes === 2 ? T.couple : T.seul) as (number[] | null)[][];
  const r = Math.max(0, rdu);
  for (let i = 0; i < grille.length; i++) {
    const b = grille[i][menage.enfants];
    if (b && r >= b[0] && r <= b[1]) return i + 1;
  }
  return null;
}

function ne(e: Entree): Resultat {
  const T = D.cantons.NE.tables;
  if (e.menage.jeunesAdultes > 0) return { calcule: false, motif: "hors-perimetre", raison: "jeunes-adultes" };
  if (e.menage.enfants > T.enfants_max) return { calcule: false, motif: "hors-perimetre", raison: "enfants" };
  const k = classeNE(e.menage, e.rdu);
  if (k == null) return total(e, lignes(e, zero()));
  const m = T.montants[k - 1];
  return total(e, lignes(e, { adulte: m.adulte, jeuneAdulte: 0, enfant: m.enfant }), { groupe: `S${k}` });
}

/* ---------------------------------------------------------------- Jura */
/* Tableau 2027 de l'arrêté du 20 octobre 2026 : un palier par tranche de 1 000 francs de revenu déterminant. Adulte :
   de 225 à 15 francs par mois jusqu'à 26 999 francs. Enfant (108) et jeune adulte en formation (204) : montant fixe
   jusqu'à 52 999 francs. Supplément famille par parent : activité professionnelle, enfant à charge, RDU sous 18 000. */
const palierJU = (rdu: number) => (rdu < 0 ? 0 : Math.floor(rdu / 1000) + 1);

export function adulteJU(rdu: number): number {
  return (D.cantons.JU.tables.adulte[palierJU(rdu)] as number | undefined) ?? 0;
}
export function supplementJU(rdu: number): number {
  return (D.cantons.JU.tables.supplement[palierJU(rdu)] as number | undefined) ?? 0;
}

function ju(e: Entree): Resultat {
  const T = D.cantons.JU.tables;
  const enfantsACharge = e.menage.enfants + e.menage.jeunesAdultes > 0;
  const sup = e.activite && enfantsACharge ? supplementJU(e.rdu) : 0;
  const sousLimiteFamille = e.rdu <= T.limite_enfant;
  const adulte = adulteJU(e.rdu) + sup;
  const ls = lignes(e, {
    adulte,
    jeuneAdulte: sousLimiteFamille ? T.jeune_adulte_formation : 0,
    enfant: sousLimiteFamille ? T.enfant : 0,
  });
  return total(e, ls);
}

/* ---------------------------------------------------------------- Vaud */
/* Subside ordinaire : formules de l'art. 21 RLVLAMal avec les paramètres de l'arrêté du 7 octobre 2026, arrondi au franc
   supérieur ; il se calcule sur le revenu déterminant OVAM (RDU moins la déduction pour enfants à charge). Subside
   spécifique : si les primes retenues (plafonnées aux primes de référence), après subside ordinaire, dépassent 10 %
   du RDU, la différence est versée (art. 21a à 21d). Jeunes adultes : règles propres, hors de cet outil. */
type ParamsVD = Record<string, number>;
const P = D.cantons.VD.tables.params as Record<string, ParamsVD>;

function courbe(p: ParamsVD, rd: number): number {
  return p.E + (p.F - p.E) * Math.pow(1 - Math.pow((rd - p.C) / (p.A - p.C), 2), p.P);
}

export function revenuOvamVD(rdu: number, enfants: number): number {
  const d = D.cantons.VD.tables.deduction_enfant;
  const deduction = enfants <= 0 ? 0 : d.premier + d.supplementaire * (enfants - 1);
  return Math.max(0, rdu - deduction);
}

/* Subside ordinaire mensuel, par personne, avant plafonnement à la prime. */
export function ordinaireAdulteVD(rd: number, menage: Menage): number {
  if (menage.adultes === 1 && menage.enfants === 0) {
    const p = P.seul26;
    if (rd <= p.C) return arrondiFranc(p.F);
    if (rd <= p.A) return arrondiFranc(courbe(p, rd));
    return rd <= p.B ? arrondiFranc(p.E) : 0;
  }
  const p = menage.enfants > 0 ? P.famille26 : P.couple26;
  if (rd > p.B) return 0;
  if (rd <= p.C) return arrondiFranc(p.F + (p.D - p.F) * Math.pow((p.C - rd) / p.C, p.R));
  if (rd <= p.A) return arrondiFranc(courbe(p, rd));
  return arrondiFranc(p.E);
}

export function ordinaireEnfantVD(rd: number): number {
  const p = P.enfant;
  if (rd > p.B) return 0;
  if (rd <= p.C) return arrondiFranc(p.F);
  if (rd <= p.A) return arrondiFranc(courbe(p, rd));
  return arrondiFranc(p.G + (p.E - p.G) * Math.pow((p.B - rd) / (p.B - p.A), p.Q));
}

/* Subside spécifique annuel du ménage : primes retenues annuelles, moins le subside ordinaire annuel, moins 10 % du RDU,
   si le résultat est positif (art. 21c al. 1 à 3 RLVLAMal). Exemple de la notice 2027 : (17 400 − 3 312) − 7 600 = 6 488. */
export function specifiqueAnnuelVD(primesRetenuesAnnuelles: number, ordinaireAnnuel: number, rdu: number): number {
  return Math.max(0, primesRetenuesAnnuelles - ordinaireAnnuel - D.cantons.VD.tables.taux_effort * Math.max(0, rdu));
}

export function primeReferenceVD(menage: Menage, rdu: number, region: Region): { adulte: number; enfant: number } {
  const R = D.cantons.VD.tables.primes_reference;
  const seul = menage.adultes === 1 && menage.enfants === 0;
  const bloc = seul ? R.seul : R.famille;
  const i = rdu <= bloc.seuils[0] ? 0 : rdu <= bloc.seuils[1] ? 1 : 2;
  return { adulte: bloc.adulte[region][i], enfant: R.famille.enfant[region][i] };
}

function vd(e: Entree): Resultat {
  const T = D.cantons.VD.tables;
  if (e.menage.jeunesAdultes > 0) return { calcule: false, motif: "hors-perimetre", raison: "jeunes-adultes" };
  const region = e.region ?? "1";
  const m = e.menage;
  const rdu = Math.max(0, e.rdu);
  const rd = revenuOvamVD(rdu, m.enfants);
  const ordA = ordinaireAdulteVD(rd, m);
  const ordE = m.enfants > 0 ? ordinaireEnfantVD(rd) : 0;
  const ref = primeReferenceVD(m, rdu, region);
  const retA = Math.min(e.primes.adulte, ref.adulte);
  const retE = Math.min(e.primes.enfant, ref.enfant);
  const ordAc = Math.min(ordA, retA); // le subside ne dépasse pas la prime (art. 22 RLVLAMal)
  const ordEc = Math.min(ordE, retE);
  const ordTotal = ordAc * m.adultes + ordEc * m.enfants;
  const retTotal = retA * m.adultes + retE * m.enfants;
  let spec = Math.max(0, retTotal - ordTotal - (T.taux_effort * rdu) / 12);
  if (spec > 0 && spec < T.subside_specifique_minimum) spec = ordTotal === 0 ? T.subside_specifique_minimum : Math.max(spec, 1);
  // Le subside spécifique s'arrondit une seule fois, au franc supérieur, sur le total du ménage : l'estimateur officiel
  // de l'État de Vaud (version 2026, relevé le 24.11.2026) donne 799 CHF pour un couple avec deux enfants là où un
  // arrondi par personne donnait 800. Les parts par personne ne sont donc pas arrondies.
  spec = Math.min(arrondiFranc(spec), retTotal - ordTotal);
  // Répartition : les enfants d'abord, puis les adultes, à parts égales dans la limite de la prime retenue de chacun.
  const placeE = retE - ordEc;
  const placeA = retA - ordAc;
  const specE = m.enfants > 0 ? Math.min(spec / m.enfants, placeE) : 0;
  const specA = Math.min((spec - specE * m.enfants) / m.adultes, placeA);
  const sub: Record<Categorie, number> = { adulte: ordAc + specA, jeuneAdulte: 0, enfant: ordEc + specE };
  const ls = lignes(e, sub);
  return total(e, ls, {
    vd: { revenuOvam: rd, ordinaire: centimes(ordTotal), specifique: centimes(specA * m.adultes + specE * m.enfants) },
  });
}

/* ---------------------------------------------------------------- Point d'entrée */
export function calculer(e: Entree): Resultat {
  switch (e.canton) {
    case "GE": return ge(e);
    case "VD": return vd(e);
    case "FR": return fr(e);
    case "NE": return ne(e);
    case "JU": return ju(e);
    case "VS": return { calcule: false, motif: "information", raison: "aucun-bareme-2027" };
  }
}

/* Plus haute limite de revenu déterminant donnant droit à un subside, pour le ménage : repère affiché sous le résultat. */
export function limiteMaximale(canton: Canton, menage: Menage): number | null {
  switch (canton) {
    case "GE": {
      const T = D.cantons.GE.tables;
      const c = charges(menage);
      if (c > T.charges_max) return null;
      const lim = T.limites[menage.adultes === 2 ? "couple" : "seul"][String(c) as "0"] as (number | null)[];
      return [...lim].reverse().find((x) => x !== null) ?? null;
    }
    case "FR": {
      const l = limiteFR(menage);
      return l == null ? null : l - 1;
    }
    case "NE": {
      const T = D.cantons.NE.tables;
      if (menage.jeunesAdultes > 0 || menage.enfants > T.enfants_max) return null;
      const grille = (menage.adultes === 2 ? T.couple : T.seul) as (number[] | null)[][];
      for (let i = grille.length - 1; i >= 0; i--) {
        const b = grille[i][menage.enfants];
        if (b) return b[1];
      }
      return null;
    }
    case "JU":
      return menage.enfants + menage.jeunesAdultes > 0 ? D.cantons.JU.tables.limite_enfant : D.cantons.JU.tables.limite_adulte;
    case "VD": {
      if (menage.jeunesAdultes > 0) return null;
      if (menage.adultes === 1 && menage.enfants === 0) return P.seul26.B;
      // dernier subside ordinaire : celui de l'enfant (limite 76 000 sur le revenu OVAM) ou du couple sans enfant ; le RDU
      // dépasse de la déduction pour enfants le revenu OVAM
      if (menage.enfants === 0) return P.couple26.B;
      const d = D.cantons.VD.tables.deduction_enfant;
      return P.enfant.B + d.premier + d.supplementaire * (menage.enfants - 1);
    }
    case "VS":
      return null;
  }
}

/* ------------------------------------------------------------ Vaud : RDU reconstitué depuis la décision de taxation
   Base légale : art. 6 LHPS (BLV 850.03) et art. 4 RLHPS (BLV 850.03.1). Montants 2027 : notice explicative 2027 de l'OVAM,
   point 1, liste ① à ⑥ (revenu net code 650, rachats 2e pilier code 320 après franchise de 20 000, 3e pilier A code 310,
   primes d'assurance-maladie déduites code 300, déduction forfaitaire pour les primes : 2 200 pour un adulte, 4 400 pour deux
   adultes, 1 300 par enfant). Hors calcul, faute de règle sans interprétation : fortune (majoration d'un quinzième au-delà
   de 60 000 / 120 000), frais d'entretien d'immeuble au-delà du forfait (code 540), fortune immobilière et commerciale. */
export const RDU_VD = {
  franchiseRachats: 20000,
  forfaitPrimes: { adulte: 2200, couple: 4400, enfant: 1300 },
  franchiseFortune: { seul: 60000, couple: 120000 },
} as const;

export type EntreeRduVD = {
  revenuNet: number; // code 650
  primesDeduites: number; // code 300
  rachatsLpp?: number; // code 320
  versements3a?: number; // code 310
  adultes: 1 | 2;
  enfants: number; // mineurs et majeurs dépendants du ménage
};
export type DetailRduVD = {
  revenuNet: number;
  rachatsRetenus: number;
  versements3a: number;
  primesDeduites: number;
  deductionForfaitaire: number;
  rdu: number;
};

/* RDU (lettre A de la notice) pour un ménage sans fortune au-delà des franchises, sans bien immobilier ni fortune commerciale. */
export function rduVD(e: EntreeRduVD): DetailRduVD {
  const pos = (x: number | undefined) => Math.max(0, x ?? 0);
  const rachatsRetenus = Math.max(0, pos(e.rachatsLpp) - RDU_VD.franchiseRachats);
  const f = RDU_VD.forfaitPrimes;
  const deductionForfaitaire = (e.adultes === 2 ? f.couple : f.adulte) + f.enfant * Math.max(0, e.enfants);
  const total = e.revenuNet + rachatsRetenus + pos(e.versements3a) + pos(e.primesDeduites) - deductionForfaitaire;
  return {
    revenuNet: e.revenuNet,
    rachatsRetenus,
    versements3a: pos(e.versements3a),
    primesDeduites: pos(e.primesDeduites),
    deductionForfaitaire,
    rdu: Math.max(0, total),
  };
}
