/* node --no-warnings tests/archives-3a.test.mts
   Taux 3a par banque d'après les copies archivées (Internet Archive) : copie du site identique à data/sources, aucun
   point ambigu affiché ni exporté, chaque point affiché cite une copie https://web.archive.org, taux entre 0 et 3 %,
   seuil de points par banque, paliers jamais tracés au-delà de l'écart maximal (aucune interpolation). */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as H from "../src/lib/engines/historique-3a.ts";

const lire = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
let n = 0;
const t = (nom: string, fn: () => void) => {
  try { fn(); n++; } catch (e) { console.error("ÉCHEC", nom); throw e; }
};
const A = H.HISTORIQUE_ARCHIVES;
const affiches = A.banques.flatMap((b) => b.points);

t("src/data/taux-3a-archives.json = data/sources/taux-3a-archives.json", () =>
  assert.deepEqual(lire("../src/data/taux-3a-archives.json"), lire("../../data/sources/taux-3a-archives.json")));

t("aucun point ambigu affiché ni exporté", () => {
  assert.ok(affiches.length > 100);
  assert.ok(affiches.every((p) => !p.ambigu));
  const csv = H.csvArchives();
  for (const p of H.ARCHIVES.filter((x) => x.ambigu)) assert.ok(!csv.includes(`,${p.url_archive},`), `${p.id} ${p.date_archive} exporté`);
  assert.ok(H.pointsArchives(H.ARCHIVES).length === H.ARCHIVES.filter((p) => !p.ambigu).length);
});

t("chaque point affiché : copie https://web.archive.org, taux entre 0 et 3 %, dates ISO", () => {
  for (const p of affiches) {
    assert.match(p.url_archive, /^https:\/\/web\.archive\.org\/web\/\d{8,14}/, `${p.id} ${p.date_archive}`);
    assert.ok(p.taux >= 0 && p.taux <= 3, `${p.id} ${p.date_archive} : ${p.taux}`);
    assert.match(p.date_archive, /^\d{4}-\d{2}-\d{2}$/);
    if (p.taux_valable_des) assert.match(p.taux_valable_des, /^\d{4}-\d{2}-\d{2}$/);
  }
});

t(`au moins ${H.MIN_POINTS} points par banque affichée, les autres citées « historique insuffisant »`, () => {
  for (const b of A.banques) assert.ok(b.points.length >= H.MIN_POINTS, b.id);
  for (const b of A.insuffisants) assert.ok(b.n < H.MIN_POINTS, b.id);
  const ids = [...A.banques, ...A.insuffisants].map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ["cler", "migros"]) assert.ok(A.insuffisants.some((b) => b.id === id), id);
});

t("traits : jamais au-delà de ce que montrent les copies", () => {
  for (const b of A.banques)
    for (const tr of b.traits) {
      assert.ok(tr.debut < tr.fin, `${b.id} ${tr.debut}`);
      assert.ok(H.enMois(tr.fin) - H.enMois(tr.debut) < H.ECART_MAX_MOIS, `${b.id} ${tr.debut}`);
      // départ sur une copie au même taux
      const k = b.points.findIndex((p) => H.datePoint(p) === tr.debut && p.taux === tr.taux);
      assert.ok(k >= 0 && k < b.points.length - 1, `${b.id} ${tr.debut} départ`);
      const suivant = b.points[k + 1];
      if (suivant.taux === tr.taux) assert.equal(tr.fin, H.datePoint(suivant), `${b.id} ${tr.debut} même taux`);
      else assert.equal(tr.fin, suivant.taux_valable_des, `${b.id} ${tr.debut} : changement sans date de validité`);
    }
  // WIR : 1,25 % prolongé jusqu'au 01.09.2024 seulement (1,00 % valable dès cette date), pas jusqu'à la copie suivante
  const wir = A.banques.find((b) => b.id === "wir")!;
  assert.ok(wir.traits.some((tr) => tr.taux === 1.25 && tr.fin === "2024-09-01"));
  assert.ok(!wir.traits.some((tr) => tr.taux === 1.25 && tr.fin > "2024-09-01"));
});

t("traits sur un cas synthétique", () => {
  const p = { id: "x", banque: "X", date_archive: "2023-01-10", taux: 0.5, taux_valable_des: null as string | null, url_archive: "https://web.archive.org/web/2023/x", url_originale: "", extrait: "", ambigu: false };
  const tr = H.traits([
    p,
    { ...p, date_archive: "2023-04-10" }, // même taux : trait
    { ...p, date_archive: "2023-07-10", taux: 0.7 }, // autre taux, validité inconnue : rien
    { ...p, date_archive: "2023-12-10", taux: 0.9, taux_valable_des: "2023-11-01" }, // validité connue : 0,7 jusqu'au 01.11
    { ...p, date_archive: "2025-03-10", taux: 0.9 }, // même taux mais 15 mois plus tard : rien
  ]);
  assert.deepEqual(tr, [
    { debut: "2023-01-10", fin: "2023-04-10", taux: 0.5 },
    { debut: "2023-07-10", fin: "2023-11-01", taux: 0.7 },
  ]);
});

t("données révisées : CA next bank, BCV, WIR ; taux recommandés Raiffeisen", () => {
  const get = (id: string, d: string) => H.ARCHIVES.find((p) => p.id === id && p.date_archive === d)!;
  assert.equal(get("ca-next-bank", "2022-11-29").taux_valable_des, "2022-12-01");
  assert.equal(get("ca-next-bank", "2023-03-27").ambigu, true);
  assert.equal(get("bcv", "2023-03-10").taux_valable_des, "2023-02-01");
  assert.equal(get("wir", "2016-10-14").taux_valable_des, "2016-09-01");
  const recos = affiches.filter(H.recommandation);
  assert.ok(recos.length >= 9 && recos.every((p) => p.id === "raiffeisen"));
  assert.ok(recos.some((p) => p.date_archive === "2024-02-28"));
  for (const p of affiches) if (/zinssatzempfehlung/i.test(`${p.extrait} ${p.note ?? ""}`)) assert.ok(H.recommandation(p), `${p.id} ${p.date_archive}`);
  const csv = H.csvArchives().split("\n");
  assert.match(csv[0], /,recommandation,/);
  assert.equal(csv.filter((l) => l.includes(",true,")).length, recos.length);
  const json = H.jsonArchives();
  assert.equal(json.raiffeisen.filter((l) => l.r).length, recos.length);
});

t("position : date de la copie, sauf taux annoncé à l'avance (date d'entrée en vigueur postérieure)", () => {
  const p = { id: "x", banque: "X", date_archive: "2023-02-17", taux: 0.4, taux_valable_des: "2023-03-01", url_archive: "https://web.archive.org/web/2023/x", url_originale: "", extrait: "", ambigu: false };
  assert.equal(H.datePoint(p), "2023-03-01");
  assert.equal(H.datePoint({ ...p, taux_valable_des: "2022-01-01" }), "2023-02-17");
  assert.equal(H.datePoint({ ...p, taux_valable_des: null }), "2023-02-17");
  const r = H.historiqueArchives([p, { ...p, date_archive: "2023-05-01" }, { ...p, date_archive: "2024-09-01" }, { ...p, date_archive: "2024-10-01" }, { ...p, ambigu: true, date_archive: "2023-04-01" }], {}, ["vide"]);
  assert.equal(r.banques[0].points.length, 4);
  assert.equal(r.banques[0].traits.length, 2); // même taux à moins de 12 mois : 2023-03→05 et 2024-09→10
  assert.deepEqual(r.insuffisants, [{ id: "vide", banque: "vide", n: 0 }]);
});

console.log(`archives-3a : ${n} tests passés`);
