/* Primes LAMal 2027 des assurés résidant dans l'UE, l'AELE ou au Royaume-Uni (OFSP, fichier Prämien_EU).
   Fonctions pures : les données sont passées en paramètre (src/data/primes-eu-2027.json). Aucun classement, aucune
   recommandation : tri par prime croissante ou par nom, au choix du visiteur. */

export type Classe = "adulte" | "jeune" | "enfant";
export type Tri = "prix" | "nom";
export type Montants = { sans: number; avec: number };
export type AssureurUe = { nom: string; no: number; adulte: Montants; jeune: Montants; enfant: Montants; enfant3?: Montants };
export type DonneesUe = { source: string; annee: number; franchise: string; pays: Record<string, AssureurUe[]> };
export type OffreUe = { no: number; nom: string; mensuel: number; troisiemeEnfant: number | null };

export function offres(d: DonneesUe, pays: string, classe: Classe, accident: boolean): OffreUe[] {
  return (d.pays[pays] ?? []).map((a) => ({
    no: a.no,
    nom: a.nom,
    mensuel: a[classe][accident ? "avec" : "sans"],
    troisiemeEnfant: classe === "enfant" && a.enfant3 ? a.enfant3[accident ? "avec" : "sans"] : null,
  }));
}

export function trier(liste: readonly OffreUe[], tri: Tri): OffreUe[] {
  const copie = [...liste];
  if (tri === "nom") return copie.sort((a, b) => a.nom.localeCompare(b.nom, "fr") || a.no - b.no);
  return copie.sort((a, b) => a.mensuel - b.mensuel || a.nom.localeCompare(b.nom, "fr"));
}

export function stats(liste: readonly OffreUe[]): { n: number; min: number; max: number; mediane: number } | null {
  if (!liste.length) return null;
  const v = liste.map((o) => o.mensuel).sort((a, b) => a - b);
  const m = v.length >> 1;
  const mediane = v.length % 2 ? v[m] : Math.round(((v[m - 1] + v[m]) / 2) * 100) / 100;
  return { n: v.length, min: v[0], max: v[v.length - 1], mediane };
}

/* Écart mensuel avec la prime la plus basse de la liste (0 pour elle), arrondi au centime. */
export const ecartMin = (liste: readonly OffreUe[], o: OffreUe) =>
  Math.round((o.mensuel - Math.min(...liste.map((x) => x.mensuel))) * 100) / 100;
