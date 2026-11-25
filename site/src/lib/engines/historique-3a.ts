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

/* Deuxième série : taux de base relevés par banque dans les copies archivées (Internet Archive, Wayback Machine) des
   pages et fiches de taux officielles des banques, data/sources/taux-3a-archives.json (source de vérité), copié à
   l'identique dans src/data pour le build. Règles d'affichage :
   - un point marqué ambigu (taux mal attribuable à une date ou à un produit) n'est jamais affiché ni exporté ;
   - position d'un point : date de la copie archivée (taux en vigueur ce jour-là), sauf taux annoncé à l'avance
     (taux_valable_des postérieur à la copie) : il est placé à sa date d'entrée en vigueur ;
   - jamais d'interpolation ni de taux prolongé sans preuve : un trait horizontal relie deux copies successives qui
     montrent le même taux, à moins de ECART_MAX_MOIS mois d'intervalle ; quand le taux change, l'ancien taux n'est
     prolongé que jusqu'à la date d'entrée en vigueur du nouveau (taux_valable_des de la copie suivante), si elle est
     connue ; sinon, seuls les points sont dessinés ;
   - taux recommandé (Raiffeisen Suisse, « Zinssatzempfehlung ») : signalé par recommandation() ;
   - une banque n'a son graphique qu'avec au moins MIN_POINTS points ; les autres sont citées « historique
     insuffisant ». */
import ARCH from "../../data/taux-3a-archives.json" with { type: "json" };

export type PointArchive = {
  id: string;
  banque: string;
  date_archive: string;
  taux: number;
  taux_valable_des: string | null;
  url_archive: string;
  url_originale: string;
  extrait: string;
  ambigu: boolean;
  note?: string | null;
};
export const ARCHIVES = ARCH.points as PointArchive[];
export const ARCHIVES_GENERE_LE: string = ARCH.genere_le;
export const MIN_POINTS = 4;
export const ECART_MAX_MOIS = 12;

/* Position en mois depuis l'an 0 : « 2017-06 » -> début de juin 2017 ; « 2017-06-16 » -> mi-juin. */
export const enMois = (date: string) => {
  const [a, m, j] = date.split("-").map(Number);
  return a * 12 + (m - 1) + (j ? (j - 1) / 31 : 0);
};

/* Date où le point est placé (voir règles plus haut). */
export const datePoint = (p: PointArchive) =>
  p.taux_valable_des && p.taux_valable_des > p.date_archive ? p.taux_valable_des : p.date_archive;

const valide = (p: PointArchive) => !p.ambigu && Number.isFinite(p.taux) && /^https:\/\/web\.archive\.org\//.test(p.url_archive);
const parDate = (a: PointArchive, b: PointArchive) => datePoint(a).localeCompare(datePoint(b)) || a.date_archive.localeCompare(b.date_archive);

/* Trait horizontal : taux attesté de debut à fin (dates AAAA-MM-JJ). */
export type Trait = { debut: string; fin: string; taux: number };
export type SerieBanque = { id: string; banque: string; points: PointArchive[]; traits: Trait[]; debut: string; fin: string };

/* Taux recommandé par la centrale aux banques locales (Raiffeisen Suisse, « Zinssatzempfehlung ») : le taux de chaque
   banque Raiffeisen pouvait s'en écarter. */
export const recommandation = (p: PointArchive) => /zinssatzempfehlung|empfohlene[nr]? satz|taux recommand/i.test(`${p.extrait} ${p.note ?? ""}`);

/* Traits d'une série triée (règles en tête de cette partie). */
export function traits(tri: readonly PointArchive[]): Trait[] {
  const out: Trait[] = [];
  for (let i = 1; i < tri.length; i++) {
    const a = tri[i - 1], b = tri[i];
    const da = datePoint(a), db = datePoint(b);
    if (enMois(db) - enMois(da) >= ECART_MAX_MOIS) continue;
    if (a.taux === b.taux) {
      if (db > da) out.push({ debut: da, fin: db, taux: a.taux });
    } else if (b.taux_valable_des && b.taux_valable_des > da) {
      out.push({ debut: da, fin: b.taux_valable_des < db ? b.taux_valable_des : db, taux: a.taux });
    }
  }
  return out;
}
export type HistoriqueArchives = { banques: SerieBanque[]; insuffisants: { id: string; banque: string; n: number }[] };

/* Séries par banque. noms : nom affiché par identifiant (liste du site), sinon le nom du fichier d'archives.
   ids : banques à citer même sans aucun point (comptes suivis aujourd'hui). */
export function historiqueArchives(points: readonly PointArchive[], noms: Record<string, string> = {}, ids: string[] = []): HistoriqueArchives {
  const groupes = new Map<string, PointArchive[]>();
  for (const id of ids) groupes.set(id, []);
  for (const p of points.filter(valide)) groupes.set(p.id, [...(groupes.get(p.id) ?? []), p]);
  const nom = (id: string, l: PointArchive[]) => noms[id] ?? l[0]?.banque ?? id;
  const banques: SerieBanque[] = [];
  const insuffisants: HistoriqueArchives["insuffisants"] = [];
  for (const [id, l] of groupes) {
    if (l.length < MIN_POINTS) {
      insuffisants.push({ id, banque: nom(id, l), n: l.length });
      continue;
    }
    const tri = [...l].sort(parDate);
    banques.push({ id, banque: nom(id, l), points: tri, traits: traits(tri), debut: datePoint(tri[0]), fin: datePoint(tri[tri.length - 1]) });
  }
  const alpha = (a: { banque: string }, b: { banque: string }) => a.banque.localeCompare(b.banque, "fr");
  return { banques: banques.sort(alpha), insuffisants: insuffisants.sort(alpha) };
}

/* Banques suivies aujourd'hui (dernier relevé hebdomadaire) : noms affichés et identifiants. */
const DERNIER_RELEVE = RELEVES[RELEVES.length - 1];
export const NOMS_COMPTES: Record<string, string> = Object.fromEntries(DERNIER_RELEVE.comptes.map((c) => [c.id, c.banque]));
export const HISTORIQUE_ARCHIVES = historiqueArchives(ARCHIVES, NOMS_COMPTES, DERNIER_RELEVE.comptes.map((c) => c.id));

/* Points isolés pour un graphique (GraphiqueSerie, prop isoles) : non ambigus seulement. */
export const pointsArchives = (points: readonly PointArchive[]) =>
  points
    .filter(valide)
    .sort(parDate)
    .map((p) => ({ date: datePoint(p), valeur: p.taux, libelle: `${p.banque} : ${p.taux} % (${p.date_archive})` }));

/* Points des banques affichées, sous une forme compacte chargée à la demande par la page (liste dépliable de
   chaque banque, /data/taux-3a-archives.json) : d = date de la copie, t = taux mentionné, v = valable dès (date
   indiquée par la page), u = copie, r = taux recommandé (Raiffeisen Suisse). */
export type LigneArchive = { d: string; t: number; v: string | null; u: string; r?: true };
export const jsonArchives = (): Record<string, LigneArchive[]> =>
  Object.fromEntries(HISTORIQUE_ARCHIVES.banques.map((b) => [b.id, b.points.map((p) => ({ d: p.date_archive, t: p.taux, v: p.taux_valable_des, u: p.url_archive, ...(recommandation(p) ? { r: true as const } : {}) }))]));

/* CSV des points affichés (licence CC BY 4.0, comme les autres données de Guide Assurance) : une ligne par copie
   archivée retenue, avec l'adresse de la copie et celle de la page d'origine. */
export function csvArchives(): string {
  const shown = HISTORIQUE_ARCHIVES.banques.flatMap((b) => b.points.map((p) => ({ ...p, banque: b.banque })));
  const autres = ARCHIVES.filter((p) => valide(p) && !HISTORIQUE_ARCHIVES.banques.some((b) => b.id === p.id)).map((p) => ({ ...p, banque: NOMS_COMPTES[p.id] ?? p.banque }));
  return csv(
    ["date_copie_archivee", "id_compte", "banque", "taux_mentionne_pct", "taux_valable_des", "recommandation", "url_copie_archivee", "url_page_originale"],
    [...shown, ...autres].sort((a, b) => a.banque.localeCompare(b.banque, "fr") || parDate(a, b)).map((p) => [p.date_archive, p.id, p.banque, p.taux, p.taux_valable_des, recommandation(p) ? "true" : "false", p.url_archive, p.url_originale]),
  );
}
