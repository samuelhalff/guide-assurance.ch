/* Économie d'impôt 3a commune par commune, pour un profil type explicite, calculée au build avec le moteur du
   calculateur (impot3a.ts, barèmes 2026 vérifiés sur les calculettes officielles). Pages « Économie d'impôt 3a par
   commune » et chiffres clés. L'impôt fédéral direct est le même partout : seuls l'impôt cantonal et l'impôt
   communal (coefficient ou quotité de la commune) font varier l'économie. Ni impôt ecclésiastique ni taxe
   personnelle, comme dans le calculateur. */
import * as I from "./impot3a.ts";
import { csv, mediane } from "./statistiques.ts";

export const PROFIL_TYPE = { etat: "seul" as I.EtatCivil, enfants: 0, revenu: 80000, versement: I.PLAFONDS["2026"].avecLPP };

export type LigneCommune = {
  commune: string;
  bfs: number;
  /* Impôt total (IFD + cantonal + communal) sans et avec le versement, et économie, en CHF. */
  avant: number;
  apres: number;
  economie: number;
  economieIfd: number;
  economieCantonCommune: number;
  /* Économie en % du versement. */
  part: number;
};

export type TableCanton = {
  canton: I.Canton;
  lignes: LigneCommune[]; // triées par économie décroissante, puis nom
  min: LigneCommune;
  max: LigneCommune;
  mediane: number;
  ecart: number;
};

const r05 = (x: number) => Math.round(x * 20 + 1e-9) / 20;

export function tableCanton(canton: I.Canton, profil = PROFIL_TYPE): TableCanton {
  const lignes = I.COMMUNES[canton]
    .map((c) => {
      const e = I.economie3a({ canton, commune: c.nom, etat: profil.etat, enfants: profil.enfants, revenu: profil.revenu }, profil.versement);
      return {
        commune: c.nom,
        bfs: c.bfs,
        avant: e.avant.total,
        apres: e.apres.total,
        economie: e.economie.total,
        economieIfd: e.economie.ifd,
        economieCantonCommune: r05(e.economie.cantonal + e.economie.communal),
        part: (e.economie.total / profil.versement) * 100,
      };
    })
    .sort((a, b) => b.economie - a.economie || a.commune.localeCompare(b.commune, "fr"));
  const max = lignes[0];
  const min = lignes[lignes.length - 1];
  return { canton, lignes, min, max, mediane: r05(mediane(lignes.map((l) => l.economie))), ecart: r05(max.economie - min.economie) };
}

let cache: Partial<Record<I.Canton, TableCanton>> = {};
export const table = (c: I.Canton) => (cache[c] ??= tableCanton(c));
export const viderCache = () => { cache = {}; };

/* CSV : une ligne par commune des cantons couverts (pages « par commune », dépôt de données ouvertes). */
export function csvCommunes3a(profil = PROFIL_TYPE): string {
  return csv(
    ["annee_fiscale", "canton", "commune", "no_ofs", "coefficient_communal", "etat_civil", "enfants", "revenu_imposable_chf", "versement_3a_chf", "impot_avant_chf", "impot_apres_chf", "economie_chf", "economie_ifd_chf", "economie_canton_commune_chf"],
    I.CANTONS.flatMap((c) =>
      table(c).lignes.map((l) => [
        I.ANNEE_FISCALE, c, l.commune, l.bfs, I.trouverCommune(c, l.commune)!.coefficient, profil.etat, profil.enfants, profil.revenu,
        profil.versement, l.avant, l.apres, l.economie, l.economieIfd, l.economieCantonCommune,
      ]),
    ),
  );
}
