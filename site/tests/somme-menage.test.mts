/* node --no-warnings tests/somme-menage.test.mts
   Calculateur de la somme d'assurance ménage. Valeurs de référence lues le 23.11.2026 :
   - grille Baloise 140.1173 d, éd. 3.23 (standard moyen ; × 0,7 et × 1,3) ;
   - formule de la feuille d'inventaire Zurich ZH56108f-2405 (05.2024), exemple refait à la main : 2 adultes, 3 pièces,
     « Normal » -> (2 + 3) × 12 000 + 10 000 = 70 000 ; × 1,05 = 73 500 -> 74 000 ; × 1,25 = 92 500 -> 93 000 ;
   - art. 51a, al. 2, LCA (règle proportionnelle) et exemples chiffrés de Zurich (100 000 / 50 000 / 8 000 -> 4 000),
     d'Allianz (100 000 / 70 000 / 30 000 -> 21 000) et de la Mobilière (100 000 / 80 000 / 40 000 -> 32 000). */
import assert from "node:assert";
import * as S from "../src/lib/engines/somme-menage.ts";

let n = 0;
const t = (nom: string, fn: () => void) => {
  try { fn(); n++; } catch (e) { console.error("ÉCHEC", nom); throw e; }
};

t("Baloise : cases de la grille (standard moyen)", () => {
  assert.equal(S.baseBaloise(1, 1, "moyen"), 37000);
  assert.equal(S.baseBaloise(3, 2, "moyen"), 79000);
  assert.equal(S.baseBaloise(3.5, 2.5, "moyen"), 95000);
  assert.equal(S.baseBaloise(4.5, 5, "moyen"), 144000);
  assert.equal(S.baseBaloise(6, 6, "moyen"), 182000);
  assert.equal(S.baseBaloise(8, 1, "moyen"), 111000, "6 pièces et plus = ligne « 6 ou maison individuelle »");
});
t("Baloise : cases vides -> null", () => {
  assert.equal(S.baseBaloise(1, 2, "moyen"), null);
  assert.equal(S.baseBaloise(3, 4, "moyen"), null);
});
t("Baloise : facteurs 0,7 et 1,3", () => {
  assert.equal(S.baseBaloise(3, 2, "simple"), 55300);
  assert.equal(S.baseBaloise(3, 2, "eleve"), 102700);
});
t("Zurich : exemple de la feuille d'inventaire et standards", () => {
  assert.equal(S.baseZurich(3, 2, "moyen"), 93000);
  assert.equal(S.baseZurich(3, 2, "simple"), 74000);
  assert.equal(S.baseZurich(3, 2, "eleve"), 126000); // 74 000 × 1,7 = 125 800 -> 126 000
  assert.equal(S.baseZurich(1, 1, "simple"), 36000); // (1 + 1) × 12 000 + 10 000 = 34 000 ; × 1,05 = 35 700 -> 36 000
});
t("Zurich : demi-personne (enfant)", () => {
  // (2,5 + 4) × 12 000 + 10 000 = 88 000 ; × 1,05 = 92 400 -> 93 000 ; × 1,25 = 116 250 -> 116 000
  assert.equal(S.baseZurich(4, 2.5, "moyen"), 116000);
});
t("Objets à part : Zurich retire ce que sa base contient déjà", () => {
  const x = { electronique: 5000, sport: 2000, collections: 4000 };
  assert.equal(S.totalExtras(x), 11000);
  assert.equal(S.extrasZurich(x), 2000 + 0 + 4000);
  assert.equal(S.totalExtras({ electronique: -5, sport: NaN }), 0);
});
t("Estimation : réserve de 10 %, fourchette et somme au millier supérieur", () => {
  const e = S.estimer({ pieces: 3, personnes: 2, standard: "moyen" });
  assert.equal(e.baloise, 86900); // 79 000 × 1,1
  assert.equal(e.zurich, 102300); // 93 000 × 1,1
  assert.equal(e.min, 86900);
  assert.equal(e.max, 102300);
  assert.equal(e.somme, 103000);
});
t("Estimation hors grille Baloise : Zurich seule", () => {
  const e = S.estimer({ pieces: 1, personnes: 3, standard: "moyen" });
  assert.equal(e.baloise, null);
  assert.equal(e.min, e.max);
  assert.equal(e.somme, S.arrondiMillier(e.zurich));
});
t("Estimation avec objets à part", () => {
  const e = S.estimer({ pieces: 3, personnes: 2, standard: "moyen", extras: { electronique: 8000 } });
  assert.equal(e.baloise, Math.round((79000 + 8000) * 1.1));
  assert.equal(e.zurich, Math.round((93000 + 5000) * 1.1));
});
t("Règle proportionnelle (art. 51a, al. 2, LCA) : exemples publiés", () => {
  assert.equal(S.indemniteProportionnelle(50000, 100000, 8000), 4000); // Zurich
  assert.equal(S.indemniteProportionnelle(70000, 100000, 30000), 21000); // Allianz
  assert.equal(S.indemniteProportionnelle(80000, 100000, 40000), 32000); // Mobilière
  assert.equal(S.indemniteProportionnelle(70000, 100000, 100000), 70000); // sinistre total plafonné à la somme
  assert.equal(S.indemniteProportionnelle(120000, 100000, 10000), 10000); // pas de sous-assurance
  assert.equal(S.indemniteProportionnelle(0, 100000, 10000), 0);
  assert.equal(S.tauxCouverture(60000, 80000), 0.75);
});
t("Lecture des montants saisis", () => {
  assert.equal(S.lireMontant("12 000"), 12000);
  assert.equal(S.lireMontant("12’000"), 12000);
  assert.equal(S.lireMontant("12'000.–"), 12000);
  assert.equal(S.lireMontant("abc"), 0);
  assert.equal(S.lireMontant(""), 0);
  assert.equal(S.arrondiMillier(102300), 103000);
  assert.equal(S.arrondiMillier(103000), 103000);
});

console.log(`somme-menage : ${n} groupes de tests réussis`);
