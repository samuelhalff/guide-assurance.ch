/* node --no-warnings tests/impot3a.test.mts
   Économie d'impôt 3a, année fiscale 2026 (GE, VD, IFD).
   1. Résultats des calculettes officielles, relevés le 22.11.2026 :
      - Genève : « Simulation fiscale 2026 », ge.ch/afcaelp1dmapublic/2026 (revenu saisi en « autres revenus »,
        sans déduction ; impôt sur le revenu hors taxe personnelle de 25 CHF) ;
      - Vaud : « Calculer mes impôts », vd.ch/etat-droit-finances/impots/impots-pour-les-individus/calculer-mes-impots
        (revenu imposable ICC et IFD, impôt distinct sur les prestations en capital).
   2. 120 profils de revenu et 30 retraits en capital du calculateur fédéral de l'AFC (fixtures/estv-impots-2026.json).
   3. Plafonds 3a 2026 et 2027 (OFAS). */
import assert from "node:assert";
import fs from "node:fs";
import * as I from "../src/lib/engines/impot3a.ts";

let n = 0;
const t = (nom: string, fn: () => void) => {
  try { fn(); n++; } catch (e) { console.error("ÉCHEC", nom); throw e; }
};
const proche = (a: number, b: number, tol: number, quoi: string) =>
  assert.ok(Math.abs(a - b) <= tol, `${quoi} : ${a} au lieu de ${b} (écart ${(a - b).toFixed(2)})`);

/* Genève, calculette officielle : [commune, état, enfants, revenu ICC, revenu IFD, ICC sur le revenu, IFD]. */
const GE_OFFICIEL: [string, I.EtatCivil, number, number, number, number, number][] = [
  ["Genève", "seul", 0, 100000, 100000, 17941.95, 2684.35],
  ["Carouge", "marie", 2, 122604, 133600, 16556.2, 3380.0],
  ["Vernier", "monoparental", 1, 66302, 70400, 4757.35, 405.0],
  ["Cologny", "seul", 0, 250000, 250000, 51482.9, 19503.35],
  ["Lancy", "marie", 0, 92742, 89942, 10255.7, 1361.0],
];
t("Genève : calculette officielle 2026 (5 profils)", () => {
  for (const [commune, etat, enfants, revenu, revenuIfd, icc, ifd] of GE_OFFICIEL) {
    const r = I.impotRevenu({ canton: "GE", commune, etat, enfants, revenu, revenuIfd });
    proche(r.cantonal + r.communal, icc, 0.3, `GE ${commune} ${etat} ${revenu} ICC`);
    proche(r.ifd, ifd, 0, `GE ${commune} ${etat} ${revenuIfd} IFD`);
  }
});

/* Vaud, calculette officielle : [commune, état, enfants, revenu ICC, revenu IFD, cantonal, communal, IFD]. */
/* IFD : pour un couple marié avec enfants, la calculette vaudoise affiche l’impôt de base sans le rabais de 263 CHF
   par enfant (art. 36, al. 2bis, LIFD) qu’elle applique pourtant au parent seul ; la calculette genevoise et l’AFC
   l’appliquent. On compare donc à l’impôt de base vaudois moins ce rabais. */
const VD_OFFICIEL: [string, I.EtatCivil, number, number, number, number, number, number][] = [
  ["Lausanne", "seul", 0, 100000, 100000, 12776.9, 6811.45, 2684.35],
  ["Nyon", "marie", 2, 250000, 236400, 30864.05, 12785.8, 16612.0 - 2 * 263],
  ["Morges", "monoparental", 1, 90000, 80000, 9024.95, 4106.45, 702.0],
  ["Yverdon-les-Bains", "marie", 0, 150000, 147200, 17903.3, 9118.85, 5111.0],
  ["Montreux", "seul", 0, 600000, 600000, 121975.3, 53843.1, 65703.35],
  ["Lausanne", "monoparental", 2, 260000, 250000, 35611.7, 18984.85, 17854.0],
  ["Lausanne", "marie", 4, 300000, 280000, 35852.55, 19113.25, 22280.0 - 4 * 263],
  ["La Praz", "seul", 0, 1000000, 1000000, 191856.7, 108143.3, 115000.0], // plafond de 30 %
];
t("Vaud : calculette officielle 2026 (8 profils, blocage du quotient et plafond de 30 %)", () => {
  for (const [commune, etat, enfants, revenu, revenuIfd, cant, comm, ifd] of VD_OFFICIEL) {
    const r = I.impotRevenu({ canton: "VD", commune, etat, enfants, revenu, revenuIfd });
    proche(r.cantonal, cant, 0.1, `VD ${commune} ${etat} ${enfants} ${revenu} cantonal`);
    proche(r.communal, comm, 0.1, `VD ${commune} ${etat} ${enfants} ${revenu} communal`);
    proche(r.ifd, ifd, 0, `VD ${commune} ${revenuIfd} IFD`);
  }
});

t("Vaud : revenu déterminant le taux (calculette officielle)", () => {
  assert.strictEqual(I.revenuDeterminantVD(250000, "marie", 2), 91900);
  assert.strictEqual(I.revenuDeterminantVD(260000, "monoparental", 2), 120800);
  assert.strictEqual(I.revenuDeterminantVD(300000, "marie", 4), 83600);
  assert.strictEqual(I.revenuDeterminantVD(150000, "marie", 0), 83300);
  assert.strictEqual(I.revenuDeterminantVD(90000, "monoparental", 1), 50000);
});

/* Vaud, impôt distinct sur les prestations en capital (calculette officielle). */
t("Vaud : retrait en capital, calculette officielle", () => {
  const cas: [string, I.EtatCivil, number, number, number, number, number][] = [
    ["Lausanne", "seul", 0, 100000, 2689.85, 1362.3, 536.85],
    ["Lausanne", "marie", 0, 300000, 9569.3, 4846.4, 4976.0],
    ["Nyon", "monoparental", 1, 150000, 4254.35, 1674.3, 1081.6],
  ];
  for (const [commune, etat, enfants, capital, cant, comm, ifd] of cas) {
    const r = I.impotCapital("VD", commune, etat, enfants, capital);
    proche(r.cantonal, cant, 0.1, `capital VD ${capital} cantonal`);
    proche(r.communal, comm, 0.1, `capital VD ${capital} communal`);
    proche(r.ifd, ifd, 0, `capital VD ${capital} IFD`);
  }
});

const AFC = JSON.parse(fs.readFileSync(new URL("./fixtures/estv-impots-2026.json", import.meta.url), "utf8"));
t("AFC : profils de revenu GE et VD (écart au plus 1,5 CHF par impôt)", () => {
  for (const c of AFC.revenus) {
    const r = I.impotRevenu({ canton: c.canton, commune: c.commune, etat: c.etat, enfants: c.enfants, revenu: c.revenu });
    const q = `${c.canton} ${c.commune} ${c.etat} ${c.enfants} ${c.revenu}`;
    proche(r.ifd, c.ifd, 1.5, `${q} IFD`);
    proche(r.cantonal, c.cantonal, 1.5, `${q} cantonal`);
    proche(r.communal, c.communal, 1.5, `${q} communal`);
  }
});
t("AFC : 30 retraits en capital GE et VD", () => {
  for (const c of AFC.capitaux) {
    const r = I.impotCapital(c.canton, c.commune, c.etat, 0, c.capital);
    const q = `${c.canton} ${c.commune} ${c.etat} ${c.capital}`;
    proche(r.ifd, c.ifd, 1.5, `${q} IFD`);
    proche(r.cantonal, c.cantonal, 1.5, `${q} cantonal`);
    proche(r.communal, c.communal, 1.5, `${q} communal`);
  }
});

/* Valais, Fribourg, Neuchâtel et Jura bernois : calculettes officielles 2026, relevées le 22.11.2026.
   [profil, commune, état, enfants, revenu ICC, revenu IFD, cantonal, communal]. Revenu imposable saisi directement,
   sans confession ; l'IFD (déjà vérifié plus haut) n'est pas repris.
   - VS : calculette du Service cantonal des contributions, https://taxcalculator.apps.vs.ch/ (même API JSON que la page).
     Parent seul saisi « célibataire, 1 enfant ». Retraits : homme de 65 ans.
   - FR : classeur officiel « calculette-impots-pp-2026.xlsm » du SCC, https://www.fr.ch/document/583511 (feuille
     « Calculateur », formules recalculées hors Excel ; pas de mode capital).
   - NE : « Calculez vos impôts », https://sccoonlinecalculatorpp.ne.ch/ (mode ordinaire ; parent seul = « marié ou seul
     avec enfants »).
   - BE (Jura bernois) : le canton n'a pas de simulateur propre ; sa page « Simulateurs fiscaux »
     (https://www.sv.fin.be.ch/fr/start/e-services/steuerrechner.html) renvoie au calculateur de l'AFC, valeurs au franc. */
type Ref = [string, I.Canton, string, I.EtatCivil, number, number, number, number, number];
const ROMANDIE_OFFICIEL: Ref[] = [
  ["A", "VS", "Sion", "seul", 0, 80000, 80000, 5903.7, 5871.9],
  ["A2", "VS", "Sion", "seul", 0, 72742, 72742, 4994.8, 5053.45],
  ["B", "VS", "Monthey", "marie", 0, 120000, 120000, 7930.65, 7547.05],
  ["C", "VS", "Martigny", "marie", 2, 150000, 140000, 12814.1, 9611.75],
  ["D", "VS", "Sion", "monoparental", 1, 70000, 70000, 2740.3, 3097.3],
  ["E", "VS", "Zermatt", "seul", 0, 250000, 250000, 34057.0, 23275.75],
  ["F", "VS", "Brig-Glis", "marie", 3, 60000, 60000, 1434.0, 2209.9],
  ["A", "FR", "Fribourg", "seul", 0, 80000, 80000, 7734.55, 6445.45],
  ["A2", "FR", "Fribourg", "seul", 0, 72742, 72742, 6751.55, 5626.3],
  ["B", "FR", "Bulle", "marie", 0, 120000, 120000, 10186.55, 7883.95],
  ["C", "FR", "Murten", "marie", 2, 150000, 140000, 14142.25, 9133.55],
  ["D", "FR", "Fribourg", "monoparental", 1, 70000, 70000, 4437.0, 3697.5],
  ["E", "FR", "Villars-sur-Glâne", "seul", 0, 250000, 250000, 32400.0, 21566.25],
  ["F", "FR", "Estavayer", "marie", 3, 60000, 60000, 3462.9, 3030.05],
  ["A", "NE", "Neuchâtel", "seul", 0, 80000, 80000, 9984.9, 5234.05],
  // A2 : la calculette NE calcule l'impôt sur 72 742 mais le taux sur 72 700 (8 760,40) ; la loi arrondit le revenu à la
  // centaine (art. 40bquater al. 4) et la calculette donne 8 748,25 pour 72 700 saisis. Valeur de la loi retenue.
  ["A2", "NE", "Neuchâtel", "seul", 0, 72700, 72700, 8748.25, 4585.9],
  ["B", "NE", "La Chaux-de-Fonds", "marie", 0, 120000, 120000, 13582.45, 8215.2],
  ["C", "NE", "Val-de-Ruz", "marie", 2, 150000, 140000, 18150.2, 9873.5],
  ["D", "NE", "Neuchâtel", "monoparental", 1, 70000, 70000, 5742.5, 3115.05],
  ["E", "NE", "Milvignes", "seul", 0, 250000, 250000, 41100.25, 20881.55],
  ["F", "NE", "Le Locle", "marie", 3, 60000, 60000, 3881.75, 2493.85],
  ["A", "BE", "Saint-Imier", "seul", 0, 80000, 80000, 10139, 5964],
  ["A2", "BE", "Saint-Imier", "seul", 0, 72742, 72742, 9053, 5325],
  ["B", "BE", "Tavannes", "marie", 0, 120000, 120000, 14309, 9235],
  ["C", "BE", "La Neuveville", "marie", 2, 150000, 140000, 19097, 10592],
  ["D", "BE", "Saint-Imier", "monoparental", 1, 70000, 70000, 7290, 4288],
  ["E", "BE", "Court", "seul", 0, 250000, 250000, 40069, 26129],
  ["F", "BE", "Valbirse", "marie", 3, 60000, 60000, 6011, 4041],
];
/* Écart toléré : 1 CHF par impôt. Les calculettes NE arrondissent chaque tranche aux 5 centimes et tronquent le taux
   (écarts de 0,20 à 0,65 CHF) ; l'AFC (BE) arrondit au franc. VS et FR : au centime. */
const TOL: Record<string, number> = { VS: 0.01, FR: 0.01, NE: 1, BE: 1 };
t("VS, FR, NE, Jura bernois : calculettes officielles 2026 (7 profils par canton)", () => {
  for (const [id, canton, commune, etat, enfants, revenu, revenuIfd, cant, comm] of ROMANDIE_OFFICIEL) {
    assert.ok(I.trouverCommune(canton, commune), `${canton} ${commune} absente`);
    const r = I.impotRevenu({ canton, commune, etat, enfants, revenu, revenuIfd });
    proche(r.cantonal, cant, TOL[canton], `${canton} ${id} cantonal`);
    proche(r.communal, comm, TOL[canton], `${canton} ${id} communal`);
  }
});

/* Retraits en capital : [canton, commune, état, capital, cantonal, communal]. FR n'a pas de calculette capital : valeurs
   de l'AFC, identiques à la règle de l'art. 39 LICD. BE : AFC (simulateur officiel du canton). */
const CAPITAL_OFFICIEL: [I.Canton, string, I.EtatCivil, number, number, number, number][] = [
  ["VS", "Sion", "seul", 100000, 2000.0, 2200.0, 0.01],
  ["VS", "Monthey", "marie", 300000, 7088.95, 8437.9, 0.05],
  ["FR", "Fribourg", "seul", 100000, 1500, 1200, 0.01],
  ["FR", "Bulle", "marie", 300000, 9500, 7059, 1],
  ["NE", "Neuchâtel", "seul", 100000, 3371.6, 1767.35, 1],
  ["NE", "La Chaux-de-Fonds", "marie", 300000, 11523.8, 6970.05, 1],
  ["BE", "Saint-Imier", "seul", 100000, 2696, 1586, 1],
  ["BE", "Tavannes", "marie", 300000, 9377, 6052, 1],
];
t("VS, FR, NE, Jura bernois : retraits en capital", () => {
  for (const [canton, commune, etat, capital, cant, comm, tol] of CAPITAL_OFFICIEL) {
    const r = I.impotCapital(canton, commune, etat, 0, capital);
    proche(r.cantonal, cant, tol, `capital ${canton} ${capital} cantonal`);
    proche(r.communal, comm, tol, `capital ${canton} ${capital} communal`);
  }
});

/* Calculateur de l'AFC : 40 profils de revenu et 10 retraits par canton (fixtures/estv-impots-2026-romandie.json).
   Écarts connus : l'AFC arrondit au franc ; à Fribourg elle interpole le barème famille en ligne droite au lieu du pas
   par 100 CHF de la loi (quelques francs de plus ou de moins, 5 CHF au plus sur ces profils). */
const AFC2 = JSON.parse(fs.readFileSync(new URL("./fixtures/estv-impots-2026-romandie.json", import.meta.url), "utf8"));
t("AFC : profils de revenu VS, FR, NE, Jura bernois", () => {
  for (const c of AFC2.revenus) {
    const r = I.impotRevenu({ canton: c.canton, commune: c.commune, etat: c.etat, enfants: c.enfants, revenu: c.revenu });
    const q = `${c.canton} ${c.commune} ${c.etat} ${c.enfants} ${c.revenu}`;
    const tol = c.canton === "FR" ? 5 : 1.5;
    proche(r.ifd, c.ifd, 1.5, `${q} IFD`);
    proche(r.cantonal, c.cantonal, tol, `${q} cantonal`);
    // Le Cerneux-Péquignot : l'AFC garde 75 %, la liste officielle NE 2026 dit 72 %.
    if (c.commune !== "Le Cerneux-Péquignot") proche(r.communal, c.communal, tol, `${q} communal`);
  }
});
t("AFC : retraits en capital VS, FR, NE, Jura bernois", () => {
  for (const c of AFC2.capitaux) {
    const r = I.impotCapital(c.canton, c.commune, c.etat, 0, c.capital);
    const q = `${c.canton} ${c.commune} ${c.etat} ${c.capital}`;
    // VS : l'AFC n'arrondit pas le capital à la centaine et arrondit autrement la réduction de 2 % des couples ; la
    // calculette du SCC le fait (jusqu'à 4 % de 99 CHF d'écart, soit 4 CHF).
    // NE : au-delà de 400 000 CHF, l'AFC s'écarte de quelques francs de la règle (quart du taux), vérifiée sur la
    // calculette officielle à 100 000 et 300 000 CHF.
    const tol = c.canton === "VS" || c.canton === "NE" ? 4 : 1.5;
    if (c.ifd >= 25) proche(r.ifd, c.ifd, 1.5, `${q} IFD`); // l'AFC perçoit aussi un IFD inférieur à 25 CHF
    proche(r.cantonal, c.cantonal, tol, `${q} cantonal`);
    if (c.commune !== "Le Cerneux-Péquignot") proche(r.communal, c.communal, tol, `${q} communal`);
  }
});

t("économie 3a = impôt sans versement moins impôt avec versement", () => {
  const p: I.Profil = { canton: "GE", commune: "Genève", etat: "seul", enfants: 0, revenu: 100000 };
  const e = I.economie3a(p, 7258);
  const apres = I.impotRevenu({ ...p, revenu: 100000 - 7258, revenuIfd: 100000 - 7258 });
  assert.strictEqual(e.apres.total, apres.total);
  proche(e.economie.total, e.avant.total - apres.total, 0.05, "total");
  assert.ok(e.economie.total > 1800 && e.economie.total < 2600, `ordre de grandeur : ${e.economie.total}`);
  assert.strictEqual(I.economie3a(p, 0).economie.total, 0);
  // un versement plus grand que le revenu est ramené au revenu
  assert.strictEqual(I.economie3a({ ...p, revenu: 5000 }, 7258).versement, 5000);
});

t("communes : 45 à Genève, 300 dans le canton de Vaud, coefficients plausibles", () => {
  assert.strictEqual(I.COMMUNES.GE.length, 45);
  assert.strictEqual(I.COMMUNES.VD.length, 300);
  assert.strictEqual(I.trouverCommune("GE", "Genève")!.coefficient, 45.49);
  assert.strictEqual(I.trouverCommune("VD", "Lausanne")!.coefficient, 78.5);
  for (const c of [...I.COMMUNES.GE, ...I.COMMUNES.VD]) assert.ok(c.coefficient >= 20 && c.coefficient <= 90, c.nom);
});

t("communes VS, FR, NE et Jura bernois : listes officielles 2026", () => {
  assert.strictEqual(I.COMMUNES.VS.length, 122);
  assert.strictEqual(I.COMMUNES.FR.length, 119);
  assert.strictEqual(I.COMMUNES.NE.length, 24);
  assert.strictEqual(I.COMMUNES.BE.length, 39);
  assert.ok(!I.trouverCommune("BE", "Moutier"), "Moutier est jurassien depuis 2026");
  assert.strictEqual(I.trouverCommune("NE", "Le Cerneux-Péquignot")!.coefficient, 72);
  assert.deepStrictEqual([I.trouverCommune("VS", "Sion")!.coefficient, I.trouverCommune("VS", "Sion")!.indexation], [1.1, 176]);
  for (const ct of ["VS", "FR", "NE", "BE"] as const) assert.ok(I.trouverCommune(ct, I.COMMUNE_DEFAUT[ct]), ct);
});

t("plafonds 3a 2026 et 2027 (OFAS)", () => {
  assert.strictEqual(I.plafond3a("2026", true), 7258);
  assert.strictEqual(I.plafond3a("2026", false), 36288);
  assert.strictEqual(I.plafond3a("2027", true), 7373);
  assert.strictEqual(I.plafond3a("2027", false), 36864);
  assert.strictEqual(I.plafond3a("2026", false, 100000), 20000);
  assert.strictEqual(I.plafond3a("2026", false, 500000), 36288);
});

/* Données des taux 3a : forme et cohérence (data/taux-3a.json, copié dans site/src/data). */
const TAUX = JSON.parse(fs.readFileSync(new URL("../src/data/taux-3a.json", import.meta.url), "utf8"));
t("taux 3a : schéma des données", () => {
  assert.match(TAUX.releve_le, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(TAUX.comptes.length >= 10);
  const ids = new Set<string>();
  for (const c of TAUX.comptes) {
    assert.ok(!ids.has(c.id), `id en double : ${c.id}`);
    ids.add(c.id);
    for (const k of ["banque", "produit", "conditions_fr", "conditions_en", "affiche_fr", "affiche_en", "url", "lu_le", "extrait"]) assert.ok(typeof c[k] === "string" && c[k].length > 0, `${c.id}.${k}`);
    assert.ok(typeof c.taux === "number" && c.taux >= 0 && c.taux < 5, `${c.id}.taux`);
    assert.match(c.url, /^https:\/\//);
    assert.match(c.lu_le, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(c.taux_valable_des === null || /^\d{4}-\d{2}-\d{2}$/.test(c.taux_valable_des), `${c.id}.taux_valable_des`);
    assert.ok(!/meilleur|sponsor|recommand/i.test(c.affiche_fr + c.conditions_fr), `${c.id} : mot interdit`);
    assert.ok(!/ [;:?!»%]/.test(c.affiche_fr), `${c.id} : espace insécable manquante`);
    assert.ok(!/—/.test(c.affiche_fr + c.affiche_en + c.conditions_fr + c.conditions_en), `${c.id} : tiret cadratin`);
  }
});

console.log(`impot3a : ${n} tests passés`);
