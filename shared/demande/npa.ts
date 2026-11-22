// NPA → canton. Source : Répertoire officiel des localités (swisstopo, établi avec La Poste),
// AMTOVZ_CSV_LV95, téléchargé le 22.11.2026. Un NPA partagé entre cantons → canton qui a la plus
// grande part d'adresses. Mise à jour : voir README (scripts/build-npa.py).
import data from "./npa-canton.json";

const MAP = data as Record<string, string>;

export const CANTONS_ROMANDS = ["GE", "VD", "VS", "NE", "FR", "JU", "BE"] as const;

export function cantonFromNpa(npa: string): string | null {
  return MAP[npa] ?? null;
}
