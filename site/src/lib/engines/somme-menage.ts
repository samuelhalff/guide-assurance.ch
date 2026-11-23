/* Calculateur de la somme d'assurance ménage (valeur à neuf du mobilier). Fonctions pures, sans dépendance, testées par
   tests/somme-menage.test.mts. Rien n'est envoyé : tout se calcule dans le navigateur.
   Deux méthodes publiées par des assureurs, reprises telles quelles (relevé du 23.11.2026, détail dans
   courtier/research/menage-somme-sources.md) :
   - Baloise, « Ermittlung der Versicherungssumme für den Hausrat », formulaire 140.1173 d, éd. 3.23 (même grille dans la
     version française 140.1173 f, éd. 6.17) : grille pièces × personnes pour un standard moyen, × 0,7 (modeste) ou
     × 1,3 (luxueux) ; loisirs, sport, électronique, collections et bijoux s'ajoutent ; réserve conseillée de 10 %.
   - Zurich, « Feuille d'inventaire de l'assurance inventaire du ménage », ZH56108f-2405 (05.2024) : formule du
     formulaire, (personnes + pièces) × 12 000 + 10 000, × 1,05 arrondi au millier supérieur, × 1 / 1,25 / 1,70 selon le
     standard ; une partie de l'électronique, du sport, des loisirs et des objets de valeur est déjà comprise ; réserve
     « en général 10 % ».
   Les enfants comptent pour une demi-personne (Baloise : moins de 14 ans ; Zurich : moins de 18 ans). */

export type Standard = "simple" | "moyen" | "eleve";
export const STANDARDS: Standard[] = ["simple", "moyen", "eleve"];
export const RESERVE = 0.1;

/* Pièces et personnes proposées (demi-pièces et demi-personnes comme sur la grille Baloise). */
export const PIECES = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6] as const;
export const PERSONNES = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6] as const;

/* Grille Baloise, standard moyen, CHF. Ligne = pièces (1 à 6, 6 = « 6 ou maison individuelle »), colonne = personnes
   (1 à 6 par demi-personne). null = case vide de la grille (trop de personnes pour le nombre de pièces). */
const _ = null;
export const GRILLE_BALOISE: Record<string, (number | null)[]> = {
  "1": [37000, 43000, _, _, _, _, _, _, _, _, _],
  "1.5": [43000, 51000, 57000, _, _, _, _, _, _, _, _],
  "2": [51000, 57000, 64000, 70000, _, _, _, _, _, _, _],
  "2.5": [57000, 64000, 70000, 77000, 85000, _, _, _, _, _, _],
  "3": [65000, 74000, 79000, 87000, 94000, 100000, _, _, _, _, _],
  "3.5": [75000, 80000, 88000, 95000, 101000, 108000, 116000, _, _, _, _],
  "4": [80000, 88000, 95000, 101000, 108000, 116000, 121000, 130000, _, _, _],
  "4.5": [89000, 96000, 103000, 109000, 117000, 122000, 131000, 136000, 144000, _, _],
  "5": [98000, 105000, 111000, 118000, 124000, 132000, 138000, 145000, 152000, 158000, _],
  "5.5": [105000, 111000, 118000, 124000, 132000, 138000, 145000, 152000, 158000, 165000, 173000],
  "6": [111000, 118000, 124000, 132000, 138000, 145000, 152000, 158000, 165000, 173000, 182000],
};
export const FACTEUR_BALOISE: Record<Standard, number> = { simple: 0.7, moyen: 1, eleve: 1.3 };
export const FACTEUR_ZURICH: Record<Standard, number> = { simple: 1, moyen: 1.25, eleve: 1.7 };

/* Objets que les deux méthodes traitent à part. Montants saisis par le visiteur (aucun montant par défaut : aucune
   source suisse ne publie de valeur type). `inclusZurich` : montant déjà compris dans la base Zurich (colonne « Déjà
   pris en compte » de la feuille d'inventaire), retiré avant d'ajouter. Les objets de valeur sont comptés à part. */
export const EXTRAS = [
  { id: "electronique", inclusZurich: 3000 }, // électronique
  { id: "sport", inclusZurich: 3000 }, // équipements sportifs (vélos, e-bikes sans plaque, ski) 2 000 + vêtements de sport 1 000
  { id: "loisirs", inclusZurich: 3000 }, // hobby, outils, jardin 2 000 + voyage, camping 1 000
  { id: "collections", inclusZurich: 0 }, // livres, disques, art, antiquités, argenterie
  { id: "divers", inclusZurich: 0 }, // vins, spiritueux, combustible…
] as const;
export type Extra = (typeof EXTRAS)[number]["id"];
export const INCLUS_ZURICH_VALEUR = 2000; // objets de valeur déjà compris dans la base Zurich

export type Profil = { pieces: number; personnes: number; standard: Standard; extras?: Partial<Record<Extra, number>> };
export type Estimation = { baloise: number | null; zurich: number; min: number; max: number; somme: number };

const pos = (x: number | undefined) => (typeof x === "number" && Number.isFinite(x) && x > 0 ? x : 0);
const demi = (x: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(x * 2) / 2));

/* Arrondi au millier supérieur : la somme proposée n'est jamais inférieure au calcul. */
export const arrondiMillier = (x: number) => (Number.isFinite(x) && x > 0 ? Math.ceil(x / 1000) * 1000 : 0);

/* Lecture d'un montant saisi : « 12 000 », « 12'000 », « 12000.– » -> 12000 ; vide ou illisible -> 0. */
export function lireMontant(s: string): number {
  const n = Number(String(s).replace(/[\s'’  ]/g, "").replace(/\.[–-]+$/, "").replace(/[–-]+$/, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/* Base Baloise (sans réserve ni objets à part), ou null hors grille. */
export function baseBaloise(pieces: number, personnes: number, standard: Standard): number | null {
  const ligne = GRILLE_BALOISE[String(demi(pieces, 1, 6))];
  const v = ligne[Math.round((demi(personnes, 1, 6) - 1) * 2)];
  return v == null ? null : Math.round(v * FACTEUR_BALOISE[standard]);
}

/* Base Zurich, formule de la feuille d'inventaire (sans réserve ni objets à part). */
export function baseZurich(pieces: number, personnes: number, standard: Standard): number {
  const brut = (demi(personnes, 1, 10) + demi(pieces, 1, 12)) * 12000 + 10000;
  const arrondi = Math.ceil((brut * 1.05) / 1000) * 1000;
  return Math.round((arrondi * FACTEUR_ZURICH[standard]) / 1000) * 1000;
}

export function totalExtras(extras: Partial<Record<Extra, number>> = {}): number {
  return EXTRAS.reduce((s, e) => s + pos(extras[e.id]), 0);
}
/* Part des objets à part que la base Zurich ne contient pas encore. */
export function extrasZurich(extras: Partial<Record<Extra, number>> = {}): number {
  return EXTRAS.reduce((s, e) => s + Math.max(0, pos(extras[e.id]) - e.inclusZurich), 0);
}

/* Estimation complète : chaque méthode, réserve de 10 % comprise ; somme proposée = haut de la fourchette, au millier
   supérieur (une somme trop basse coûte plus cher qu'une somme un peu haute : art. 51a, al. 2, LCA). */
export function estimer(p: Profil): Estimation {
  const b = baseBaloise(p.pieces, p.personnes, p.standard);
  const baloise = b == null ? null : Math.round((b + totalExtras(p.extras)) * (1 + RESERVE));
  const zurich = Math.round((baseZurich(p.pieces, p.personnes, p.standard) + extrasZurich(p.extras)) * (1 + RESERVE));
  const vals = baloise == null ? [zurich] : [baloise, zurich];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return { baloise, zurich, min, max, somme: arrondiMillier(max) };
}

/* Règle proportionnelle (art. 51a, al. 2, LCA, en vigueur depuis le 1.1.2022) : en cas de sous-assurance, le dommage est
   réparé dans la proportion entre la somme assurée et la valeur de remplacement, sauf convention contraire ; jamais
   plus que la somme assurée (al. 1). */
export function indemniteProportionnelle(sommeAssuree: number, valeur: number, dommage: number): number {
  if (!(sommeAssuree > 0) || !(valeur > 0) || !(dommage > 0)) return 0;
  return Math.min(dommage * Math.min(1, sommeAssuree / valeur), sommeAssuree);
}

/* Part de la valeur couverte par la somme assurée (1 = couverture complète). */
export const tauxCouverture = (sommeAssuree: number, valeur: number) => (sommeAssuree > 0 && valeur > 0 ? Math.min(1, sommeAssuree / valeur) : 0);
