/* Caisses maladie en chiffres : les valeurs de src/data/caisses-lamal-2024.json égalent celles des tableaux de l'OFSP
   (data/sources/kvstat-2024/, KVSTAT 2024 : T 5.01, 5.03, 5.07, 5.10), sans ligne de total parmi les assureurs. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type Ass = {
  no: number; nom: string; court?: string; effectifMoyen: number; fraisAdminParAssure: number; fraisAdminPctDepenses: number;
  reservesParAssure: number; resultatParAssure: number; solvabilitePct?: number; solvabiliteNote?: string;
  assures: Record<string, number>; part: Record<string, number>;
};
const brut = readFileSync(new URL("../src/data/caisses-lamal-2024.json", import.meta.url), "utf8");
const D = JSON.parse(brut) as { meta: Record<string, unknown>; moyenneCH: Record<string, number>; cantons: string[]; assureurs: Ass[] };
const par = (no: number) => D.assureurs.find((a) => a.no === no)!;
let n = 0;
const ok = (f: () => void) => { f(); n++; };

/* Valeurs relevées à la main dans les fichiers XLSX (feuilles françaises). */
ok(() => { const a = par(8); assert.equal(a.nom, "CSS Kranken-Versicherung AG"); assert.equal(a.effectifMoyen, 1537730); assert.equal(a.fraisAdminParAssure, 156); assert.equal(a.solvabilitePct, 131); });
ok(() => { const a = par(32); assert.equal(a.effectifMoyen, 88204); assert.equal(a.solvabilitePct, 105); assert.equal(a.fraisAdminParAssure, 160); });
ok(() => assert.equal(par(8).assures.GE, 89878));
ok(() => assert.equal(par(8).assures.CH, 1540896));
ok(() => assert.equal(par(8).part.GE, 18.41));
ok(() => { const a = par(134); assert.equal(a.reservesParAssure, 4295); assert.equal(a.resultatParAssure, 100); assert.equal(a.assures.GE, undefined); assert.equal(a.assures.SZ, 8238); });
ok(() => { const a = par(829); assert.equal(a.solvabilitePct, 69); assert.ok(a.solvabiliteNote); });
ok(() => { const a = par(1560); assert.equal(a.fraisAdminPctDepenses, 4.5); assert.equal(a.effectifMoyen, 151415); });
ok(() => { assert.equal(D.moyenneCH.primesParAssure, 4278); assert.equal(D.moyenneCH.fraisAdminParAssure, 193); assert.equal(D.moyenneCH.fraisAdminPctDepenses, 4.5); });
/* SUPRA-1846 et Easy Sana ne figurent pas dans le test de solvabilité (T 5.03). */
ok(() => { assert.equal(par(62).solvabilitePct, undefined); assert.equal(par(774).solvabilitePct, undefined); assert.equal(D.assureurs.filter((a) => a.solvabilitePct === undefined).length, 2); });

/* Pas de ligne de total ni de note parmi les assureurs ; chaque assureur a un numéro et un nom. */
ok(() => assert.equal(D.assureurs.length, 39));
ok(() => {
  const nos = new Set<number>();
  for (const a of D.assureurs) {
    assert.ok(Number.isInteger(a.no) && a.no > 0, `numéro ${a.nom}`);
    assert.ok(a.nom.trim().length > 2, `nom ${a.no}`);
    assert.doesNotMatch(a.nom, /total|moyenne|état des données|source|nombre d.assureurs/i);
    assert.ok(!nos.has(a.no), `doublon ${a.no}`);
    nos.add(a.no);
    assert.ok(a.effectifMoyen > 0);
    if (a.court) assert.ok(a.nom.toLowerCase().startsWith(a.court.toLowerCase()), `nom court de ${a.nom}`);
  }
});

/* Parts de marché : ~100 % pour la Suisse et pour chacun des 26 cantons ; assurés du total = somme des assureurs. */
ok(() => {
  assert.equal(D.cantons.length, 26);
  for (const z of ["CH", ...D.cantons]) {
    const s = D.assureurs.reduce((t, a) => t + (a.part[z] ?? 0), 0);
    assert.ok(Math.abs(s - 100) < 0.2, `parts ${z} : ${s}`);
  }
});
/* Nombre d'assureurs ayant des assurés par canton, d'après la ligne « Nombre d'assureurs » du tableau 5.10. */
ok(() => {
  const att: Record<string, number> = { CH: 39, GE: 25, VD: 25, VS: 32, FR: 26, NE: 25, JU: 24, BE: 30 };
  for (const [z, v] of Object.entries(att)) assert.equal(D.assureurs.filter((a) => (a.assures[z] ?? 0) > 0).length, v, z);
});
ok(() => assert.equal(D.assureurs.reduce((t, a) => t + a.assures.CH, 0), 9047457));
ok(() => assert.equal(D.meta.edition, 2024));

/* Arrondis : francs entiers, pourcentages à une décimale, taux de solvabilité entier. */
ok(() => {
  for (const a of D.assureurs) {
    for (const v of [a.fraisAdminParAssure, a.reservesParAssure, a.resultatParAssure, a.effectifMoyen, a.solvabilitePct ?? 0]) assert.ok(Number.isInteger(v));
    assert.equal(Math.round(a.fraisAdminPctDepenses * 10) / 10, a.fraisAdminPctDepenses);
  }
});

/* Aucun mot interdit dans le fichier. */
ok(() => {
  const interdits = /meilleur|moins cher|moins chère|\bbest\b|cheapest|indépendant|independent|jusqu.à \d/i;
  assert.doesNotMatch(brut, interdits);
});

/* Recherche (même normalisation que filtrer() de src/lib/caisses-lamal.ts, qui s'importe avec l'alias @/) : sans accents ni casse. */
ok(() => {
  const simple = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
  const cherche = (q: string) => D.assureurs.filter((a) => simple(a.nom).includes(simple(q)) || simple(a.court ?? "").includes(simple(q)));
  assert.equal(cherche("").length, D.assureurs.length);
  assert.ok(cherche("css").some((a) => a.no === 8));
  assert.deepEqual(cherche("CSS").map((a) => a.no), cherche("  css ").map((a) => a.no));
  assert.equal(simple("Mutuel Assurance Maladie é"), "mutuel assurance maladie e");
});

console.log(`caisses-lamal : ${n} contrôles ok`);
