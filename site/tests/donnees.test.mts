/* node --no-warnings tests/donnees.test.mts
   Pages de données : statistiques, économie d'impôt 3a par commune (contrôlée sur le calculateur de l'AFC,
   fixtures/estv-communes-3a-2026.json), primes 2027 par région de prime, historique des taux 3a. */
import assert from "node:assert";
import fs from "node:fs";
import * as S from "../src/lib/engines/statistiques.ts";
import * as I from "../src/lib/engines/impot3a.ts";
import * as C from "../src/lib/engines/communes-3a.ts";
import * as R from "../src/lib/engines/regions-primes.ts";
import * as P from "../src/lib/engines/primes.ts";
import * as Fr from "../src/lib/engines/frais3a.ts";

let n = 0;
const t = (nom: string, fn: () => void) => {
  try { fn(); n++; } catch (e) { console.error("ÉCHEC", nom); throw e; }
};
const proche = (a: number, b: number, tol: number, quoi: string) =>
  assert.ok(Math.abs(a - b) <= tol, `${quoi} : ${a} au lieu de ${b} (écart ${(a - b).toFixed(2)})`);
const lire = (f: string) => JSON.parse(fs.readFileSync(new URL(f, import.meta.url), "utf8"));

t("quantiles par interpolation linéaire (QUARTILE.INCLUS)", () => {
  const v = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.strictEqual(S.mediane(v), 4.5);
  assert.strictEqual(S.quantile(v, 0.25), 2.75);
  assert.strictEqual(S.quantile(v, 0.75), 6.25);
  assert.strictEqual(S.mediane([3, 1, 2]), 2);
  assert.deepStrictEqual(S.resume([5]), { n: 1, min: 5, q1: 5, mediane: 5, q3: 5, max: 5, moyenne: 5 });
  assert.strictEqual(S.csv(["a", "b"], [["x,y", 1], ['dit "oui"', null]]), 'a,b\n"x,y",1\n"dit ""oui""",\n');
});

/* Calculateur de l'AFC, profil type des pages (personne seule, 80 000 CHF, versement 7 258 CHF) : pour chaque canton
   la commune où l'économie est la plus forte, la plus faible, celle de la médiane et le chef-lieu. L'AFC arrondit au
   franc ; à Fribourg elle interpole le barème (5 CHF au plus par impôt, voir impot3a.test.mts). */
const AFC = lire("./fixtures/estv-communes-3a-2026.json");
t(`économie 3a par commune : ${AFC.lignes.length} communes contrôlées sur le calculateur de l'AFC`, () => {
  assert.ok(AFC.lignes.length >= 20);
  for (const l of AFC.lignes) {
    const tab = C.table(l.canton);
    const ligne = tab.lignes.find((x) => x.bfs === l.bfs);
    assert.ok(ligne, `${l.commune} absente de la table`);
    const tol = l.canton === "FR" ? 5 : 1.5;
    const cerneux = l.commune === "Le Cerneux-Péquignot"; // AFC 75 %, liste officielle NE 2026 : 72 %
    for (const [quoi, revenu, ref] of [["avant", l.revenu, l.avant], ["après", l.revenu - l.versement, l.apres]] as const) {
      const r = I.impotRevenu({ canton: l.canton, commune: l.commune, etat: "seul", enfants: 0, revenu });
      proche(r.ifd, ref.ifd, 1.5, `${l.canton} ${l.commune} ${quoi} IFD`);
      proche(r.cantonal, ref.cantonal, tol, `${l.canton} ${l.commune} ${quoi} cantonal`);
      if (!cerneux) proche(r.communal, ref.communal, tol, `${l.canton} ${l.commune} ${quoi} communal`);
    }
    const ecoAfc = l.avant.ifd + l.avant.cantonal + l.avant.communal - (l.apres.ifd + l.apres.cantonal + l.apres.communal);
    if (!cerneux) proche(ligne.economie, ecoAfc, 2 * tol, `${l.canton} ${l.commune} économie`);
  }
});

t("économie 3a par commune : toutes les communes, triées, bornes cohérentes", () => {
  for (const c of I.CANTONS) {
    const tab = C.table(c);
    assert.strictEqual(tab.lignes.length, I.COMMUNES[c].length, c);
    for (let i = 1; i < tab.lignes.length; i++) assert.ok(tab.lignes[i - 1].economie >= tab.lignes[i].economie, `${c} tri`);
    assert.ok(tab.min.economie <= tab.mediane && tab.mediane <= tab.max.economie, `${c} médiane`);
    for (const l of tab.lignes) {
      proche(l.economie, l.avant - l.apres, 0.06, `${c} ${l.commune} économie = avant - après`);
      proche(l.economie, l.economieIfd + l.economieCantonCommune, 0.06, `${c} ${l.commune} composantes`);
      assert.strictEqual(l.economieIfd, tab.max.economieIfd, `${c} ${l.commune} : l'IFD ne dépend pas de la commune`);
    }
  }
  assert.strictEqual(C.PROFIL_TYPE.versement, I.PLAFONDS["2026"].avecLPP);
});

t("régions de primes 2027 : dix régions dans les cantons couverts", () => {
  assert.deepStrictEqual(R.REGIONS.map((r) => r.cle), ["ge-0", "vd-1", "vd-2", "vs-1", "vs-2", "fr-1", "fr-2", "ne-0", "ju-0", "be-2"]);
  const npa: P.IndexNpa = lire("../public/data/primes-2027/npa.json");
  for (const r of R.REGIONS) {
    assert.deepStrictEqual(P.regionsNpa(npa, r.npa).map((x) => [x.canton, x.region]), [[r.canton, r.region]], `${r.cle} NPA ${r.npa}`);
    assert.ok(r.population > 40000, `${r.cle} population`);
    assert.ok(r.communes.length >= 24, `${r.cle} communes`);
    for (const p of r.profils) {
      assert.ok(p.n >= 100, `${r.cle} ${p.id} : ${p.n} offres`);
      assert.ok(p.min <= p.q1 && p.q1 <= p.mediane && p.mediane <= p.q3 && p.q3 <= p.max, `${r.cle} ${p.id} ordre`);
      const o = P.offres(R.DONNEES_CANTONS[r.canton], { region: r.region, classe: p.classe, franchise: p.franchise, accident: p.accident });
      assert.strictEqual(p.min, o.min);
      assert.strictEqual(p.max, o.max);
      assert.strictEqual(p.n, o.total);
    }
  }
  assert.strictEqual(R.REGIONS.find((r) => r.cle === "be-2")!.communes.length, 39); // Jura bernois seulement
});

t("régions : valeurs relevées sur le résumé du comparateur (chef-lieu, adulte, franchise 300, avec accident)", () => {
  const resume = lire("../src/data/primes-2027-resume.json");
  for (const c of resume.cantons) {
    const r = R.REGIONS.find((x) => x.canton === c.canton && x.region === c.region)!;
    const p = r.profils.find((x) => x.id === "a300a")!;
    assert.strictEqual(Math.round(p.min * 100), c.profils[0].premiere, `${r.cle} première offre`);
    assert.strictEqual(p.n, c.nombre, `${r.cle} nombre d'offres`);
  }
  assert.strictEqual(R.hashComparateur(R.REGIONS[0], R.PROFILS[0]), "#npa=1201&p=1990.300.1");
});

t("historique des taux 3a : relevés datés, 17 comptes, notes BNS encadrées par des relevés", () => {
  const h = lire("../src/data/taux-3a-historique.json");
  const dates = h.releves.map((r: { date: string }) => r.date);
  assert.ok(dates.length >= 2);
  assert.deepStrictEqual([...dates].sort(), dates);
  assert.strictEqual(new Set(dates).size, dates.length);
  for (const r of h.releves) {
    assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(r.comptes.length >= 15, r.date);
    for (const c of r.comptes) assert.ok(typeof c.taux === "number" && c.taux >= 0 && c.taux < 5, `${r.date} ${c.id}`);
  }
  for (const note of h.notes_bns) {
    assert.ok(dates.includes(note.avant) && dates.includes(note.apres), `note ${note.date} : relevés absents`);
    assert.ok(note.avant < note.date && note.date <= note.apres, `note ${note.date} : relevés hors encadrement`);
  }
  const actuel = lire("../src/data/taux-3a.json");
  const dernier = h.releves.find((r: { date: string }) => r.date === actuel.releve_le);
  assert.ok(dernier, "le relevé de taux-3a.json est dans l'historique");
  for (const c of actuel.comptes) assert.strictEqual(dernier.comptes.find((x: { id: string }) => x.id === c.id)?.taux, c.taux, c.id);
});


/* Frais du 3e pilier : données sourcées, tri neutre (critère affiché), formats */
t("frais 3a : chaque compte a ses frais, chaque source est datée", () => {
  const frais = JSON.parse(fs.readFileSync("src/data/frais-3a.json", "utf8"));
  const taux = JSON.parse(fs.readFileSync("src/data/taux-3a.json", "utf8"));
  for (const c of taux.comptes) assert.ok(frais.comptes[c.id], `frais du compte ${c.id}`);
  for (const [id, f] of Object.entries(frais.comptes) as [string, Record<string, unknown>][]) {
    assert.match(String(f.url), /^https:\/\//, id); assert.match(String(f.lu_le), /^\d{4}-\d{2}-\d{2}$/, id);
    assert.ok((f.temoins as string[]).length > 0, id);
  }
  for (const t of frais.titres) {
    assert.match(t.url, /^https:\/\//, t.id); assert.ok(t.temoins.length > 0, t.id);
    assert.ok(!("rendement" in t), "aucun rendement");
    if (t.cout_complet) assert.ok(t.cout_min_pct !== null && t.cout_max_pct !== null && t.cout_min_pct <= t.cout_max_pct, t.id);
  }
});
t("frais 3a : tri par coût publié le plus haut, offres incomplètes à la fin par nom", () => {
  const b = { produit: "", nom_complet: "", cout_fr: "", cout_en: "", actions_min_pct: null, actions_max_pct: null, minimum_chf: null, taux_liquidites_pct: null, autres_fr: "", autres_en: "", url: "", lu_le: "" };
  const l = Fr.trierTitres([
    { ...b, id: "z", fournisseur: "Zeta", cout_min_pct: null, cout_max_pct: null, cout_complet: false },
    { ...b, id: "c", fournisseur: "Gamma", cout_min_pct: 0.2, cout_max_pct: 0.5, cout_complet: true },
    { ...b, id: "a", fournisseur: "Alpha", cout_min_pct: 0.4, cout_max_pct: 0.4, cout_complet: true },
    { ...b, id: "i", fournisseur: "Beta", cout_min_pct: 0.1, cout_max_pct: 0.1, cout_complet: false },
    { ...b, id: "d", fournisseur: "Delta", cout_min_pct: 0.1, cout_max_pct: 0.5, cout_complet: true },
  ]);
  assert.deepStrictEqual(l.map((x) => x.id), ["a", "d", "c", "i", "z"]);
});
t("frais 3a : formats", () => {
  assert.strictEqual(Fr.fourchette({ cout_min_pct: 0.39, cout_max_pct: 0.41 }), "0,39 à 0,41\u202F%");
  assert.strictEqual(Fr.fourchette({ cout_min_pct: 0.5, cout_max_pct: 0.5 }, true), "0.50%");
  assert.strictEqual(Fr.fourchette({ cout_min_pct: null, cout_max_pct: null }), null);
  assert.strictEqual(Fr.partActions({ actions_min_pct: 5, actions_max_pct: 99 }), "5 à 99\u202F%");
  assert.strictEqual(Fr.partActions({ actions_min_pct: null, actions_max_pct: 97 }, true), "up to 97%");
  assert.strictEqual(Fr.resumeFraisCompte({ tenue_chf: 0, transfert_chf: 50, note_fr: "", note_en: "", url: "", lu_le: "" }), "Tenue de compte gratuite, transfert ou clôture 50\u00A0CHF.");
  assert.strictEqual(Fr.resumeFraisCompte({ tenue_chf: null, transfert_chf: null, note_fr: "", note_en: "", url: "", lu_le: "" }, true), "Account fee not published, transfer fee not published.");
});

console.log(`donnees : ${n} tests passés`);
