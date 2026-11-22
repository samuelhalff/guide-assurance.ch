/* node --no-warnings tests/primes.test.mts
   Comparateur de primes 2027 : classes d'âge, franchises, accident, régions (NPA) et lecture des fichiers par canton.
   Les valeurs « priminfo » ont été relevées à la main sur priminfo.admin.ch le 22.11.2026 (voir docs/decisions.md). */
import assert from "node:assert";
import fs from "node:fs";
import * as P from "../src/lib/engines/primes.ts";

const lire = (f: string) => JSON.parse(fs.readFileSync(new URL(`../public/data/primes-2027/${f}`, import.meta.url), "utf8"));
const GE: P.DonneesCanton = lire("GE.json");
const VD: P.DonneesCanton = lire("VD.json");
const NPA: P.IndexNpa = lire("npa.json");
let n = 0;
const t = (nom: string, fn: () => void) => {
  try { fn(); n++; } catch (e) { console.error("ÉCHEC", nom); throw e; }
};

t("classes d’âge 2027 (année de naissance)", () => {
  assert.strictEqual(P.classe(2027), "enfant");
  assert.strictEqual(P.classe(2009), "enfant");
  assert.strictEqual(P.classe(2008), "jeune");
  assert.strictEqual(P.classe(2002), "jeune");
  assert.strictEqual(P.classe(2001), "adulte");
  assert.strictEqual(P.classe(1940), "adulte");
});
t("année de naissance valide", () => {
  assert.ok(P.anneeValide(1990));
  assert.ok(!P.anneeValide(2030));
  assert.ok(!P.anneeValide(1890));
  assert.ok(!P.anneeValide(1990.5));
});
t("franchises par classe", () => {
  assert.deepStrictEqual(P.FRANCHISES.enfant, [0, 100, 200, 300, 400, 500, 600]);
  assert.deepStrictEqual(P.FRANCHISES.adulte, [300, 500, 1000, 1500, 2000, 2500]);
  for (const cl of ["enfant", "jeune", "adulte"] as P.Classe[])
    for (const f of P.FRANCHISES[cl]) assert.ok(GE.primes["0"][cl]?.[String(f)], `GE ${cl} ${f}`);
});

t("NPA : 1201 → Genève, région unique", () => {
  assert.deepStrictEqual(P.regionsNpa(NPA, "1201").map((l) => [l.canton, l.region]), [["GE", 0]]);
});
t("NPA : 1003 Lausanne → VD région 1, 1400 Yverdon → VD région 2", () => {
  assert.deepStrictEqual(P.regionsNpa(NPA, "1003").map((l) => [l.canton, l.region]), [["VD", 1]]);
  assert.deepStrictEqual(P.regionsNpa(NPA, "1400").map((l) => [l.canton, l.region]), [["VD", 2]]);
});
t("NPA : format et inconnu", () => {
  assert.deepStrictEqual(P.regionsNpa(NPA, "12"), []);
  assert.deepStrictEqual(P.regionsNpa(NPA, "8001"), []); // Zurich, hors cantons couverts
  assert.deepStrictEqual(P.regionsNpa(NPA, "3011"), []); // Berne ville : seul le Jura bernois est couvert
  assert.deepStrictEqual(P.regionsNpa(NPA, "2610").map((l) => [l.canton, l.region]), [["BE", 2]]); // Saint-Imier
});
t("NPA ambigus : plusieurs régions proposées", () => {
  const amb = Object.entries(NPA).filter(([, v]) => new Set(v.map(([c, r]) => `${c}${r}`)).size > 1);
  assert.ok(amb.length > 0);
  for (const [npa] of amb.slice(0, 5)) assert.ok(P.regionsNpa(NPA, npa).length > 1);
});

t("recherche de lieu : NPA, nom, accents", () => {
  assert.strictEqual(P.suggestions(NPA, "1201")[0].libelle, "1201 Genève (GE)");
  assert.ok(P.suggestions(NPA, "prilly").some((x) => x.npa === "1008"));
  assert.ok(P.suggestions(NPA, "neuchatel").some((x) => x.canton === "NE"));
  assert.ok(P.suggestions(NPA, "1008 pri").every((x) => x.npa === "1008"));
  assert.deepStrictEqual(P.suggestions(NPA, "1"), []);
});

const adulte = (d: P.DonneesCanton, region: number, extra: Partial<P.Profil> = {}) =>
  P.offres(d, { region, classe: "adulte", franchise: 300, accident: true, ...extra });

t("liste triée, écarts cohérents", () => {
  const r = adulte(GE, 0);
  assert.ok(r.total > 30);
  for (let i = 1; i < r.offres.length; i++) assert.ok(r.offres[i].mensuel >= r.offres[i - 1].mensuel);
  assert.strictEqual(r.offres[0].ecartMin, 0);
  assert.strictEqual(r.min, r.offres[0].mensuel);
  const moy = r.offres.reduce((s, o) => s + o.mensuel, 0) / r.total;
  assert.ok(Math.abs(moy - r.moyenne) < 0.01);
  const o = r.offres[5];
  assert.ok(Math.abs(o.annuel - o.mensuel * 12) < 0.01);
  assert.ok(Math.abs(o.ecartMin - (o.mensuel - r.min) * 12) < 0.01);
});
t("sans accident : prime plus basse pour chaque offre", () => {
  const a = adulte(GE, 0), s = adulte(GE, 0, { accident: false });
  const sans = new Map(s.offres.map((o) => [`${o.assureur}|${o.produit}`, o.mensuel]));
  for (const o of a.offres) assert.ok((sans.get(`${o.assureur}|${o.produit}`) ?? 0) < o.mensuel, o.produit);
});
t("franchise plus haute : prime plus basse", () => {
  const p300 = adulte(GE, 0).min, p2500 = adulte(GE, 0, { franchise: 2500 }).min;
  assert.ok(p2500 < p300);
});
t("classe d’âge : enfant < jeune < adulte", () => {
  const e = P.offres(GE, { region: 0, classe: "enfant", franchise: 0, accident: true }).min;
  const j = P.offres(GE, { region: 0, classe: "jeune", franchise: 300, accident: true }).min;
  assert.ok(e < j && j < adulte(GE, 0).min);
});
t("régions : Lausanne (VD 1) plus chère que la région 2 en moyenne", () => {
  assert.ok(adulte(VD, 1).moyenne > adulte(VD, 2).moyenne);
});
t("filtre de modèle", () => {
  const tous = adulte(GE, 0);
  let somme = 0;
  for (const ty of P.TYPES) {
    const r = adulte(GE, 0, { filtre: ty });
    assert.ok(r.offres.every((o) => o.type === ty));
    somme += r.total;
  }
  assert.strictEqual(somme, tous.total);
  assert.ok(adulte(GE, 0, { filtre: "BASE" }).total >= 10);
});
t("profil absent : liste vide", () => {
  assert.strictEqual(adulte(GE, 7).total, 0);
  assert.strictEqual(P.offres(GE, { region: 0, classe: "adulte", franchise: 400, accident: true }).total, 0);
});
t("par franchise : part maximale = prime + franchise + quote-part", () => {
  const l = P.parFranchise(GE, { region: 0, classe: "adulte", accident: true });
  assert.strictEqual(l.length, 6);
  for (const x of l) assert.ok(Math.abs(x.maxACharge - (x.premiere + x.franchise + 700)) < 0.01);
  const e = P.parFranchise(GE, { region: 0, classe: "enfant", accident: true });
  assert.strictEqual(e[0].maxACharge, e[0].premiere + 0 + 350);
});
t("redistribution 2027 renseignée", () => {
  assert.ok(adulte(GE, 0).redistribution > 0);
});

t("foyer : somme des personnes, même assureur et même modèle", () => {
  const pers: P.Personne[] = [
    { classe: "adulte", franchise: 300, accident: false },
    { classe: "adulte", franchise: 2500, accident: true },
    { classe: "enfant", franchise: 0, accident: true },
  ];
  const f = P.offresFoyer(GE, 0, pers);
  assert.ok(f.total > 30);
  for (let i = 1; i < f.offres.length; i++) assert.ok(f.offres[i].mensuel >= f.offres[i - 1].mensuel);
  const o = f.offres[3];
  pers.forEach((p, k) => {
    const seul = P.offres(GE, { region: 0, ...p }).offres.find((x) => x.assureur === o.assureur && x.produit === o.produit);
    assert.strictEqual(seul?.mensuel, o.details[k]);
  });
  assert.ok(Math.abs(o.details.reduce((s, x) => s + x, 0) - o.mensuel) < 0.01);
  assert.strictEqual(f.redistribution, 14.25);
});
t("foyer d’une personne = liste simple", () => {
  const a = P.offresFoyer(GE, 0, [{ classe: "adulte", franchise: 300, accident: true }]);
  const b = adulte(GE, 0);
  assert.deepStrictEqual(a.offres.map((o) => o.mensuel), b.offres.map((o) => o.mensuel));
});

/* Contrôles relevés sur priminfo.admin.ch le 22.11.2026 (1201 Genève, né en 1990, franchise 300, avec accident). */
t("priminfo : Genève, adulte, 300, accident", () => {
  const r = adulte(GE, 0);
  const trouve = (a: string, p: string) => r.offres.find((o) => o.assureur === a && o.produit === p)?.mensuel;
  assert.strictEqual(trouve("Assura", "QualiMed"), 611.7);
  assert.strictEqual(trouve("Swica", "Favorit Santé"), 629.0);
  assert.strictEqual(trouve("Sanitas", "TelMed Basic"), 629.1);
  assert.strictEqual(trouve("Concordia", "HMO"), 644.9);
  assert.strictEqual(r.redistribution, 4.75);
});

console.log(`primes : ${n} tests réussis`);
