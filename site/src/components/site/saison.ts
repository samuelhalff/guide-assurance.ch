export type Etat = { mode: "lamal"; jours: number; annee: number } | { mode: "pilier"; annee: number } | { mode: "masque" };

/* Saison : résiliation LAMal de septembre au 30.11, 3e pilier en décembre, masqué le reste de l'année. */
export function calculerSaison(d: Date): Etat {
  const y = d.getFullYear();
  const m = d.getMonth();
  const jours = Math.round((new Date(y, 10, 30).getTime() - new Date(y, m, d.getDate()).getTime()) / 864e5);
  if (m >= 8 && m <= 10 && jours >= 0) return { mode: "lamal", jours, annee: y };
  if (m === 11) return { mode: "pilier", annee: y };
  return { mode: "masque" };
}
