/* Calculs purs de la liste « Taux des comptes de libre passage » (sans dépendance, testés par node). */

export type Tri = "taux" | "nom";

const collator = new Intl.Collator("fr", { sensitivity: "base" });
const parNom = (a: { banque: string }, b: { banque: string }) => collator.compare(a.banque, b.banque);

/* Taux le plus élevé d'abord ; à taux égal, ordre alphabétique du nom. */
export const trierParTaux = <T extends { taux: number; banque: string }>(l: readonly T[]): T[] =>
  [...l].sort((a, b) => b.taux - a.taux || parNom(a, b));
export const trierParNom = <T extends { banque: string }>(l: readonly T[]): T[] => [...l].sort(parNom);
export const trier = <T extends { taux: number; banque: string }>(l: readonly T[], tri: Tri): T[] =>
  tri === "nom" ? trierParNom(l) : trierParTaux(l);

export const mediane = (t: readonly number[]): number => {
  const s = [...t].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/* Illustration : intérêt simple sur un an, en francs et centimes, au taux affiché (% par an). */
export const interetAnnuel = (solde: number, taux: number): number => Math.round(solde * taux) / 100;

/* Saisie libre (« 150 000 », « 150'000 », « 150000,5 ») -> nombre, ou NaN. */
export const lireSolde = (s: string): number => {
  const v = Number(s.replace(/[’'\s  ]/g, "").replace(",", "."));
  return Number.isFinite(v) && v >= 0 && s.trim() !== "" ? v : NaN;
};

/* 2026-11-24 -> 24.11.2026 */
export const dateCh = (iso: string) => iso.split("-").reverse().join(".");

/* Deux décimales, trois quand la troisième compte (0,025 %). Espace fine insécable avant « % » en français. */
const decimales = (t: number) => {
  const s = t.toFixed(3);
  return s.endsWith("0") ? s.slice(0, -1) : s;
};
export const tauxFr = (t: number) => `${decimales(t).replace(".", ",")} %`;
export const tauxEn = (t: number) => `${decimales(t)}%`;
