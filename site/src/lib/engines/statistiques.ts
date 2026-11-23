/* Statistiques descriptives des pages de données (régions de primes, historique 3a, économie d'impôt par commune,
   chiffres clés). Quantiles par interpolation linéaire entre les deux valeurs voisines (méthode « type 7 » des
   tableurs : QUARTILE.INCLUS d'Excel, quantile() de R par défaut). Aucune pondération. */

export function quantile(valeurs: number[], q: number): number {
  if (!valeurs.length) return NaN;
  const t = [...valeurs].sort((a, b) => a - b);
  const pos = (t.length - 1) * q;
  const bas = Math.floor(pos);
  const haut = Math.ceil(pos);
  return t[bas] + (t[haut] - t[bas]) * (pos - bas);
}

export const mediane = (v: number[]) => quantile(v, 0.5);
export const moyenne = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN);

export type Resume = { n: number; min: number; q1: number; mediane: number; q3: number; max: number; moyenne: number };
export function resume(v: number[]): Resume {
  return {
    n: v.length,
    min: Math.min(...v),
    q1: quantile(v, 0.25),
    mediane: mediane(v),
    q3: quantile(v, 0.75),
    max: Math.max(...v),
    moyenne: moyenne(v),
  };
}

/* Arrondi à n décimales, sans -0. */
export const arrondi = (x: number, n = 2) => {
  const r = Math.round(x * 10 ** n) / 10 ** n;
  return r === 0 ? 0 : r;
};

/* Valeur CSV : guillemets si nécessaire (RFC 4180). */
export const champCsv = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const csv = (entete: string[], lignes: (string | number | null | undefined)[][]) =>
  [entete, ...lignes].map((l) => l.map(champCsv).join(",")).join("\n") + "\n";
