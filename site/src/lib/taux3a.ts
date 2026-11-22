/* Taux des comptes 3a relevés sur les pages officielles des banques (data/taux-3a.json, copié dans src/data par
   data/scripts/taux_3a.py fetch --write). Tri : taux de base décroissant, puis nom de la banque. Aucun classement
   éditorial, aucune ligne payée. */
import D from "@/data/taux-3a.json";

export type Compte3a = {
  id: string;
  banque: string;
  banque_nom_complet: string;
  produit: string;
  taux: number;
  taux_valable_des: string | null;
  url: string;
  lu_le: string;
  affiche_fr: string;
  affiche_en: string;
};

export const RELEVE_LE: string = D.releve_le;
export const COMPTES_3A: Compte3a[] = (D.comptes as Compte3a[])
  .filter((c) => typeof c.taux === "number")
  .sort((a, b) => b.taux - a.taux || a.banque.localeCompare(b.banque, "fr"));

export const TAUX_MIN = Math.min(...COMPTES_3A.map((c) => c.taux));
export const TAUX_MAX = Math.max(...COMPTES_3A.map((c) => c.taux));

/* 2026-11-22 → 22.11.2026 */
export const dateCh = (iso: string) => iso.split("-").reverse().join(".");
export const tauxFr = (t: number) => `${t.toFixed(2).replace(".", ",")} %`;
export const tauxEn = (t: number) => `${t.toFixed(2)}%`;
