/* Historique des taux des comptes 3a (src/data/taux-3a-historique.json, alimenté chaque lundi par
   infra/refresh/taux3a.py ; data/scripts/taux_3a_historique.py). Moyenne et médiane non pondérées des taux de base
   de chaque relevé. Les notes BNS ne sont écrites que si un relevé existe avant et après la décision. */
import { csv, mediane, moyenne } from "./statistiques.ts";
import H from "../../data/taux-3a-historique.json" with { type: "json" };

export type CompteHist = { id: string; banque: string; taux: number; taux_valable_des: string | null };
export type Releve = { date: string; source: string; comptes: CompteHist[] };
export type NoteBns = { date: string; decision_fr: string; decision_en: string; avant: string; apres: string };
export type PointSerie = { date: string; n: number; moyenne: number; mediane: number; min: number; max: number };

export const RELEVES = (H.releves as Releve[]).slice().sort((a, b) => a.date.localeCompare(b.date));
export const NOTES_BNS = (H.notes_bns as NoteBns[]).slice().sort((a, b) => a.date.localeCompare(b.date));
export const PREMIER = RELEVES[0].date;
export const DERNIER = RELEVES[RELEVES.length - 1].date;

export const SERIE: PointSerie[] = RELEVES.map((r) => {
  const t = r.comptes.map((c) => c.taux);
  return { date: r.date, n: t.length, moyenne: moyenne(t), mediane: mediane(t), min: Math.min(...t), max: Math.max(...t) };
});

export const pointDu = (date: string) => SERIE.find((p) => p.date === date);

/* CSV long : une ligne par relevé et par compte (date, identifiant, banque, taux, taux en vigueur depuis). */
export function csvHistorique(): string {
  return csv(
    ["date_releve", "id_compte", "banque", "taux_pct", "taux_valable_des"],
    RELEVES.flatMap((r) => [...r.comptes].sort((a, b) => b.taux - a.taux || a.banque.localeCompare(b.banque, "fr")).map((c) => [r.date, c.id, c.banque, c.taux, c.taux_valable_des])),
  );
}
