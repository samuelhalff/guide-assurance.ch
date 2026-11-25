/* node --no-warnings tests/taux-snb.test.mts
   Statistique mensuelle de la BNS (taux 3a et de libre passage) : fichier de données identique à data/, schéma,
   valeurs plausibles et ordonnées, repères du commentaire, formats. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as S from "../src/lib/engines/taux-snb.ts";

const lire = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const D = lire("../src/data/snb-taux-prevoyance.json");
let n = 0;
const t = (nom: string, fn: () => void) => {
  try { fn(); n++; } catch (e) { console.error("ÉCHEC", nom); throw e; }
};

t("site/src/data et data/ identiques", () => assert.deepEqual(D, lire("../../data/snb-taux-prevoyance.json")));

t("source : cube zikrepro, pages et conditions de la BNS, date de publication", () => {
  assert.equal(D.source.cube, "zikrepro");
  for (const k of ["page_fr", "page_en", "api", "conditions_fr", "conditions_en"]) assert.match(D.source[k], /^https:\/\/(data|www)\.snb\.ch\//, k);
  assert.match(D.source.api, /D1\(GVG_S3A,GVG_F2S\)/);
  assert.match(D.publie_le, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(Object.keys(D.series).sort(), ["GVG_F2S", "GVG_S3A"]);
});

for (const s of [S.SNB_3A, S.SNB_LP]) {
  t(`${s.code} : mois uniques et triés depuis 2017-06, quatre valeurs plausibles, quartiles ordonnés`, () => {
    assert.ok(s.points.length >= 100, `${s.points.length} mois`);
    assert.equal(s.points[0].mois, "2017-06");
    const mois = s.points.map((p) => p.mois);
    assert.deepEqual([...mois].sort(), mois);
    assert.equal(new Set(mois).size, mois.length);
    for (const p of s.points) {
      assert.match(p.mois, /^\d{4}-(0[1-9]|1[0-2])$/);
      for (const k of ["moyenne", "q25", "mediane", "q75"] as const) {
        assert.ok(typeof p[k] === "number" && p[k] >= -1 && p[k] <= 5, `${p.mois} ${k}`);
        assert.equal(Math.round(p[k] * 1e4) / 1e4, p[k], `${p.mois} ${k} : 4 décimales au plus`);
      }
      assert.ok(p.q25 <= p.mediane && p.mediane <= p.q75, `${p.mois} quartiles`);
    }
    assert.ok(s.points[s.points.length - 1].mois <= D.publie_le.slice(0, 7), "dernier mois avant la publication");
  });
}

/* Valeurs exactes de la publication du 02.11.2026 (tests/fixtures/snb-2026-11-02.json), pour quatre mois anciens de
   chaque série et chaque quantile : une série mise à zéro ou décalée échoue. Ces mois ne sont plus révisés en pratique ;
   si la BNS les révisait, le test bloquerait la publication du relevé mensuel et demanderait une vérification à la main.
   La tolérance des révisions récentes est testée dans infra/refresh/test_tauxsnb.py. */
t("valeurs exactes de la BNS (fixture du 02.11.2026)", () => {
  const fx = lire("./fixtures/snb-2026-11-02.json") as { publie_le: string; series: Record<S.CodeSnb, S.PointSnb[]> };
  assert.ok(D.publie_le >= fx.publie_le);
  for (const s of [S.SNB_3A, S.SNB_LP]) {
    assert.equal(fx.series[s.code].length, 4);
    for (const attendu of fx.series[s.code]) assert.deepEqual(s.points.find((x) => x.mois === attendu.mois), attendu, `${s.code} ${attendu.mois}`);
  }
});

t("repères : plus haut, plus bas, douze mois, fins d'année", () => {
  const p = (mois: string, moyenne: number) => ({ mois, moyenne, q25: moyenne, mediane: moyenne, q75: moyenne });
  const r = S.reperes([p("2024-12", 0.5), p("2023-11", 0.2), p("2024-01", 0.9), p("2024-11", 0.7), p("2023-12", 0.9)]);
  assert.equal(r.premier.mois, "2023-11");
  assert.equal(r.dernier.mois, "2024-12");
  assert.equal(r.plusHaut.mois, "2023-12", "égalité : premier mois atteint");
  assert.equal(r.plusBas.mois, "2023-11");
  assert.equal(r.ilYa12Mois?.mois, "2023-12");
  assert.equal(r.ecart12Mois, -0.4);
  assert.deepEqual(r.finsAnnee.map((x) => x.mois), ["2023-12", "2024-12"]);
  const sans = S.reperes([p("2024-12", 0.5), p("2024-06", 0.4)]);
  assert.equal(sans.ilYa12Mois, null);
  assert.equal(sans.ecart12Mois, null);
  assert.throws(() => S.reperes([]));
  const vrai = S.reperes(S.SNB_3A.points);
  assert.equal(vrai.ilYa12Mois?.mois, S.decalerMois(vrai.dernier.mois, -12));
});

t("formats : mois, décimales (même forme que infra/refresh/tauxsnb.py)", () => {
  assert.equal(S.decalerMois("2026-01", -1), "2025-12");
  assert.equal(S.decalerMois("2026-09", -12), "2025-09");
  assert.equal(S.decalerMois("2025-12", 1), "2026-01");
  assert.equal(S.moisTexte("2026-09", "fr"), "septembre 2026");
  assert.equal(S.moisTexte("2024-02", "en"), "February 2024");
  assert.equal(S.decimalesSnb(0.1986), "0.199");
  assert.equal(S.decimalesSnb(0.1), "0.10");
  assert.equal(S.decimalesSnb(1.0083), "1.008");
  assert.equal(S.decimalesSnb(0.0644), "0.064");
});

console.log(`taux-snb : ${n} tests passés`);
