/* Taux des comptes de libre passage relevés sur les pages officielles des institutions (data/taux-libre-passage.json,
   copié dans src/data par data/scripts/taux_libre_passage.py fetch --write). Aucun classement éditorial, aucune ligne payée.
   Les calculs purs sont dans lib/engines/libre-passage.ts. */
import D from "@/data/taux-libre-passage.json";
import { mediane, trierParTaux } from "@/lib/engines/libre-passage";

export { dateCh, interetAnnuel, lireSolde, mediane, tauxEn, tauxFr, trier, trierParNom, trierParTaux } from "@/lib/engines/libre-passage";
export type { Tri as TriLp } from "@/lib/engines/libre-passage";

export type CompteLp = {
  id: string;
  banque: string;
  fondation: string | null;
  taux: number;
  taux_valable_des: string | null;
  url: string;
  source_type: "page" | "pdf";
  lu_le: string;
  methode: "http" | "pdf" | "headless";
  note_fr: string | null;
  note_en: string | null;
};

export const RELEVE_LE: string = D.releve_le;
export const COMPTES_LP: CompteLp[] = trierParTaux((D.comptes as CompteLp[]).filter((c) => typeof c.taux === "number"));
export const TAUX_MIN = Math.min(...COMPTES_LP.map((c) => c.taux));
export const TAUX_MAX = Math.max(...COMPTES_LP.map((c) => c.taux));
export const TAUX_MEDIAN = mediane(COMPTES_LP.map((c) => c.taux));
export const NB_INSTITUTIONS = COMPTES_LP.length;
