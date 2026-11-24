/* node --no-warnings tests/primes-ue.test.mts
   Primes LAMal 2027 des assurés résidant dans l'UE, l'AELE ou au Royaume-Uni (OFSP, Prämien_EU).
   Données lues dans l'aperçu des primes UE/AELE/UK de priminfo.admin.ch (data/scripts/build_primes_eu.py). */
import assert from "node:assert";
import fs from "node:fs";
import * as E from "../src/lib/engines/primes-ue.ts";
import data from "../src/data/primes-eu-2027.json" with { type: "json" };
import fr from "../src/data/primes-eu-fr-2027.json" with { type: "json" };

let n = 0;
const t = (nom: string, fn: () => void) => {
  try { fn(); n++; } catch (e) { console.error("ÉCHEC", nom); throw e; }
};
const D = data as E.DonneesUe;

t("France : mêmes montants que primes-eu-fr-2027.json", () => {
  const a = new Map(D.pays.FR.map((x) => [x.no, x]));
  assert.strictEqual(a.size, fr.assureurs.length);
  for (const f of fr.assureurs) {
    const x = a.get(f.no)!;
    assert.ok(x, `assureur ${f.no} absent`);
    for (const k of ["adulte", "jeune", "enfant"] as const) {
      assert.strictEqual(x[k].avec, f[k].avec, `${f.nom} ${k} avec`);
      assert.strictEqual(x[k].sans, f[k].sans, `${f.nom} ${k} sans`);
    }
  }
});

t("30 pays, chacun avec au moins un assureur", () => {
  assert.strictEqual(Object.keys(D.pays).length, 30);
  for (const [c, l] of Object.entries(D.pays)) assert.ok(l.length >= 1, c);
  for (const c of ["FR", "DE", "IT", "AT", "ES", "PT", "UK", "IS", "NO"]) assert.ok(D.pays[c], c);
});

t("montants plausibles, enfant < adulte, avec accident >= sans accident", () => {
  for (const [c, l] of Object.entries(D.pays)) {
    for (const a of l) {
      for (const k of ["adulte", "jeune", "enfant"] as const) {
        for (const v of [a[k].avec, a[k].sans]) assert.ok(v > 10 && v < 1500, `${c} ${a.nom} ${k} ${v}`);
        assert.ok(a[k].avec >= a[k].sans, `${c} ${a.nom} ${k} accident`);
      }
      assert.ok(a.enfant.sans < a.adulte.sans && a.enfant.avec < a.adulte.avec, `${c} ${a.nom} enfant < adulte`);
      assert.ok(Number.isInteger(a.no) && a.no > 0, `${c} ${a.nom} no`);
    }
    assert.strictEqual(new Set(l.map((a) => a.no)).size, l.length, `${c} doublon`);
  }
});

t("Aquilana et Sodalis : seulement dans leurs pays", () => {
  const pays = (no: number) => Object.entries(D.pays).filter(([, l]) => l.some((a) => a.no === no)).map(([c]) => c).sort().join(",");
  assert.strictEqual(pays(32), "AT,DE,ES,FR,IT,NL,PT,UK");
  assert.strictEqual(pays(941), "IT");
  const tous = Object.entries(D.pays).filter(([, l]) => l.length >= 12).length;
  assert.strictEqual(tous, 30);
});

t("offres : classe et accident", () => {
  const o = E.offres(D, "FR", "adulte", true).find((x) => x.no === 8)!;
  assert.strictEqual(o.mensuel, 750);
  assert.strictEqual(E.offres(D, "FR", "adulte", false).find((x) => x.no === 8)!.mensuel, 697.5);
  assert.strictEqual(E.offres(D, "FR", "enfant", true).find((x) => x.no === 32)!.troisiemeEnfant, 89.55);
  assert.strictEqual(E.offres(D, "FR", "adulte", true).find((x) => x.no === 32)!.troisiemeEnfant, null);
  assert.deepStrictEqual(E.offres(D, "XX", "adulte", true), []);
});

t("tri par prime croissante puis nom ; tri par nom ; l'entrée n'est pas modifiée", () => {
  const l = E.offres(D, "DE", "adulte", false);
  const avant = l.map((x) => x.no).join();
  const p = E.trier(l, "prix");
  for (let i = 1; i < p.length; i++) assert.ok(p[i - 1].mensuel <= p[i].mensuel);
  const nm = E.trier(l, "nom");
  for (let i = 1; i < nm.length; i++) assert.ok(nm[i - 1].nom.localeCompare(nm[i].nom, "fr") <= 0);
  assert.strictEqual(l.map((x) => x.no).join(), avant);
  assert.strictEqual(p.length, l.length);
});

t("statistiques et écart", () => {
  const l = E.offres(D, "FR", "adulte", true);
  const s = E.stats(l)!;
  assert.deepStrictEqual([s.n, s.min, s.max, s.mediane], [13, 225, 885, 515]);
  assert.strictEqual(E.stats([]), null);
  const premier = E.trier(l, "prix")[0];
  assert.strictEqual(E.ecartMin(l, premier), 0);
  assert.strictEqual(E.ecartMin(l, l.find((x) => x.no === 8)!), 525);
  assert.strictEqual(E.stats([{ no: 1, nom: "a", mensuel: 1, troisiemeEnfant: null }, { no: 2, nom: "b", mensuel: 2, troisiemeEnfant: null }])!.mediane, 1.5);
});

t("aucun mot interdit dans les données ni dans les textes de la page", () => {
  const interdits = /meilleur|moins cher|moins chère|\bbest\b|cheapest|indépendant|\bindependent\b|jusqu['’]à\s*\d+\s*%/i;
  const fichiers = ["../src/data/primes-eu-2027.json", "../src/components/outils/primes-ue.tsx", "../src/components/outils/pages-primes-ue.tsx"];
  for (const f of fichiers) {
    const s = fs.readFileSync(new URL(f, import.meta.url), "utf8");
    assert.ok(!interdits.test(s), `${f} : ${s.match(interdits)?.[0]}`);
  }
});

console.log(`primes-ue : ${n} groupes de tests OK`);
