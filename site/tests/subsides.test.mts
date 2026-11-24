/* Tests des subsides d'assurance maladie 2027. Chaque valeur « officielle » vient d'un document relevé le 24.11.2026
   (data/sources/subsides-2027/<canton>/, liste dans le README du dossier) ; la source est nommée à côté du contrôle. */
import assert from "node:assert/strict";
import * as S from "../src/lib/engines/subsides.ts";
import D from "../src/data/subsides-2027.json" with { type: "json" };

const m = (adultes: 1 | 2, enfants = 0, jeunesAdultes = 0): S.Menage => ({ adultes, enfants, jeunesAdultes });
const gros = { adulte: 1000, jeuneAdulte: 1000, enfant: 1000 }; // primes élevées : aucun plafonnement
const calc = (canton: S.Canton, menage: S.Menage, rdu: number, extra: Partial<S.Entree> = {}) => {
  const r = S.calculer({ canton, menage, rdu, primes: gros, region: "1", ...extra });
  assert.equal(r.calcule, true, `${canton} ${rdu}`);
  return r as Extract<S.Resultat, { calcule: true }>;
};
const par = (r: Extract<S.Resultat, { calcule: true }>, c: S.Categorie) => r.lignes.find((l) => l.categorie === c)?.subside ?? 0;

/* ------------------------------------------------------------ données */
assert.deepEqual(Object.keys(D.cantons), ["GE", "VD", "FR", "VS", "NE", "JU"]);
assert.equal(D.releve_le, "2026-11-24");
for (const c of S.CANTONS) {
  const k = D.cantons[c];
  assert.ok(k.sources.length >= 2 && k.sources.every((s) => s.url.startsWith("https://") && s.lu === "2026-11-24"), `${c} sources`);
  assert.ok(k.autorite.url.startsWith("https://"));
}
assert.equal(D.cantons.VS.calcul, false, "Valais : barème 2027 non publié");
assert.equal(D.cantons.VS.annee_bareme, 2026, "Valais : seule l'échelle 2026 est publiée, elle porte son année");
for (const c of ["GE", "VD", "FR", "NE", "JU"] as const) assert.equal(D.cantons[c].annee_bareme, 2027);
const MOTS = /meilleur|moins ch[eè]r|ind[eé]pendant|independent|\bbest\b|cheapest|jusqu['’]à\s*\d+\s*%/i;
assert.ok(!MOTS.test(JSON.stringify(D)), "mot interdit dans subsides-2027.json");

/* ------------------------------------------------------------ Genève (SAM, barèmes 2027 du 26.10.2026) */
const GE = D.cantons.GE.tables;
assert.deepEqual(GE.montants.adulte, [363, 306, 250, 204, 170, 125, 91, 57, null]);
assert.deepEqual(GE.montants.jeuneAdulte, [242, 242, 242, 242, 242, 242, 242, 242, 111]);
assert.deepEqual(GE.montants.enfant, [137, 137, 137, 137, 137, 137, 137, 137, 69]);
// limites du tableau = art. 21 LaLAMal : groupes 1 à 8 sans charge, plus 6 000 francs par charge ; groupe 9 : 151 000 pour une charge
const base = { seul: [30000, 35000, 37500, 40000, 42500, 45000, 47500, 50000], couple: [45000, 55000, 65000, 75000, 85000, 95000, 105000, 115000] };
for (let c = 0; c <= 4; c++) {
  for (let g = 0; g < 8; g++) {
    assert.equal(GE.limites.couple[String(c) as "0"][g], base.couple[g] + 6000 * c, `couple ${c} charges groupe ${g + 1}`);
    if (c === 0) assert.equal(GE.limites.seul["0"][g], base.seul[g]);
    else assert.equal(GE.limites.seul[String(c) as "1"][g], base.couple[g] + 6000 * c, `seul ${c} charges groupe ${g + 1} (assimilé à un couple)`);
  }
  if (c >= 1) assert.equal(GE.limites.couple[String(c) as "1"][8], 151000 + 6000 * (c - 1));
}
// bornes : sous, sur et sous la limite de chaque groupe (personne seule sans charge)
base.seul.forEach((l, g) => {
  assert.equal(S.groupeGE(m(1), l), g + 1, `seul ${l}`);
  assert.equal(S.groupeGE(m(1), l - 1), g + 1);
  assert.equal(S.groupeGE(m(1), l + 1), g < 7 ? g + 2 : null, `seul ${l + 1}`);
});
base.couple.forEach((l, g) => {
  assert.equal(S.groupeGE(m(2), l), g + 1);
  assert.equal(S.groupeGE(m(2), l + 1), g < 7 ? g + 2 : null);
});
assert.equal(S.groupeGE(m(1), -5000), 1, "RDU négatif = 0 (art. 9A RaLAMal)");
assert.equal(S.groupeGE(m(1, 1), 121000), 8);
assert.equal(S.groupeGE(m(1, 1), 121001), 9);
assert.equal(S.groupeGE(m(1, 1), 151000), 9);
assert.equal(S.groupeGE(m(1, 1), 151001), null);
assert.equal(S.groupeGE(m(2, 2), 157000), 9);
assert.equal(S.groupeGE(m(2, 2), 157001), null);
assert.equal(S.groupeGE(m(2, 4), 169000), 9);
assert.equal(S.groupeGE(m(2, 3, 2), 50000), null, "plus de quatre charges : hors du tableau publié");
// montants : adulte, jeune adulte, enfant par groupe
GE.montants.adulte.forEach((a, g) => {
  const lim = GE.limites.couple["1"][g]!;
  const r = calc("GE", m(2, 1), lim);
  assert.equal(par(r, "adulte"), a ?? 0, `groupe ${g + 1} adulte`);
  assert.equal(par(r, "enfant"), GE.montants.enfant[g]);
  const rj = calc("GE", m(2, 0, 1), lim);
  assert.equal(par(rj, "jeuneAdulte"), GE.montants.jeuneAdulte[g]);
});
{
  const r = calc("GE", m(1), 30000);
  assert.equal(r.groupe, "1");
  assert.equal(r.subsideMensuel, 363);
  const r2 = calc("GE", m(1), 30001);
  assert.equal(r2.subsideMensuel, 306);
  const f = calc("GE", m(2, 2), 60000); // couple, 2 charges : groupe 2 (limite 67 000)
  assert.equal(f.groupe, "2");
  assert.equal(f.subsideMensuel, 306 * 2 + 137 * 2, "total du ménage = somme des personnes");
  const g9 = calc("GE", m(1, 1), 130000); // groupe 9 : pas de subside d'adulte, enfant 69
  assert.equal(g9.groupe, "9");
  assert.equal(par(g9, "adulte"), 0);
  assert.equal(g9.subsideMensuel, 69);
  assert.equal(calc("GE", m(1), 50001).droit, false);
  assert.equal(calc("GE", m(1), 50001).subsideMensuel, 0);
}
// plafond : jamais plus que la prime effective (art. 22 al. 4 LaLAMal)
{
  const r = S.calculer({ canton: "GE", menage: m(1, 1), rdu: 30000, primes: { adulte: 300, jeuneAdulte: 400, enfant: 100 } });
  assert.ok(r.calcule);
  if (r.calcule) {
    assert.equal(par(r, "adulte"), 300);
    assert.equal(par(r, "enfant"), 100);
    assert.ok(r.lignes.every((l) => l.primeNette === 0));
  }
}

/* ------------------------------------------------------------ Fribourg (mémento 2027 de la Caisse de compensation) */
const FRT = D.cantons.FR.tables;
assert.equal(S.limiteFR(m(1)), 37000);
assert.equal(S.limiteFR(m(2)), 65000);
[57400, 71400, 85400, 99400, 113400, 127400].forEach((v, i) => assert.equal(S.limiteFR(m(1, i + 1)), v, `seul ${i + 1} enfant(s)`));
[79000, 93000, 107000, 121000, 135000, 149000].forEach((v, i) => assert.equal(S.limiteFR(m(2, i + 1)), v, `couple ${i + 1} enfant(s)`));
assert.equal(S.limiteFR(m(1, 7)), null, "au-delà de six enfants : hors du tableau");
assert.equal(S.limiteFR(m(2, 4, 3)), null);
assert.equal(S.limiteFR(m(2, 1, 1)), 93000, "un jeune adulte en formation à charge compte comme un enfant");
// exemple officiel du mémento : limite 93 000 (couple, 2 enfants), RDU 62 000 -> 33,33 % sous la limite -> 35,71 % ; enfants 80 %
assert.equal(S.ecartFR(93000, 62000), 33.33);
assert.equal(S.tauxFR(33.33), 35.71);
{
  const r = calc("FR", m(2, 2), 62000, { region: "1" });
  assert.equal(par(r, "adulte"), 212.83, "35,71 % de 596");
  assert.equal(par(r, "enfant"), 113.6, "80 % de 142");
}
// tableau des 60 paliers : bornes
assert.equal(FRT.paliers.length, 60);
const att: [number, number][] = [[0.01, 1], [1.02, 1], [1.03, 2.08], [2.03, 2.08], [2.04, 3.17], [10.17, 10.76], [10.18, 11.85], [32.54, 34.63], [32.55, 35.71], [33.56, 35.71], [33.57, 36.8], [50, 54.15], [59.0, 63.92], [60.0, 63.92], [60.01, 65], [99, 65]];
att.forEach(([e, t]) => assert.equal(S.tauxFR(e), t, `écart ${e}`));
assert.equal(S.tauxFR(0), 0);
assert.equal(calc("FR", m(1), 37000).droit, false, "à la limite : pas de droit (« n'atteint pas les limites »)");
assert.equal(calc("FR", m(1), 36999).droit, true);
assert.equal(par(calc("FR", m(1), 36999), "adulte"), 5.96, "1 % de 596");
assert.equal(par(calc("FR", m(1), 0), "adulte"), 387.4, "65 % de 596");
assert.equal(par(calc("FR", m(1, 0, 1), 0, { region: "2" }), "jeuneAdulte"), 261.95, "65 % de 403");
assert.equal(par(calc("FR", m(2, 1, 1), 79000 - 1, { region: "2" }), "jeuneAdulte"), 201.5, "jeune adulte : au moins 50 % de 403");
assert.equal(par(calc("FR", m(2, 1), 78999, { region: "2" }), "enfant"), 104, "enfant : au moins 80 % de 130");
assert.equal(S.calculer({ canton: "FR", menage: m(1), rdu: 10000, primes: gros }).calcule, false, "région obligatoire");
assert.deepEqual([FRT.prime_moyenne["1"], FRT.prime_moyenne["2"]], [{ adulte: 596, jeuneAdulte: 436, enfant: 142 }, { adulte: 547, jeuneAdulte: 403, enfant: 130 }]);

/* ------------------------------------------------------------ Vaud (arrêté du 07.10.2026, notice 2027 de l'OVAM) */
const seul = m(1);
const ord = (rd: number, mn: S.Menage) => S.ordinaireAdulteVD(rd, mn);
// notice 2027, tableau des subsides ordinaires : adulte de 26 ans et plus, une seule personne
assert.equal(ord(0, seul), 331);
assert.equal(ord(17000, seul), 331);
assert.equal(ord(17001, seul), 331, "331 -> 30 : la courbe démarre à 331");
assert.equal(ord(40000, seul), 30);
assert.equal(ord(40001, seul), 30);
assert.equal(ord(50000, seul), 30);
assert.equal(ord(50001, seul), 0);
// plusieurs personnes, 26 ans et plus avec enfant(s) : 336 -> 300 jusqu'à 24 200, 300 -> 20 jusqu'à 55 000, 20 jusqu'à 69 000
const fam = m(1, 1);
assert.equal(ord(0, fam), 336);
assert.equal(ord(24200, fam), 300);
assert.equal(ord(55000, fam), 20);
assert.equal(ord(55001, fam), 20);
assert.equal(ord(69000, fam), 20);
assert.equal(ord(69001, fam), 0);
// sans enfant (couple) : 336 -> 300 jusqu'à 24 200, 300 -> 20 jusqu'à 70 000, 20 jusqu'à 72 500
const couple = m(2);
assert.equal(ord(0, couple), 336);
assert.equal(ord(24200, couple), 300);
assert.equal(ord(70000, couple), 20);
assert.equal(ord(72500, couple), 20);
assert.equal(ord(72501, couple), 0);
// enfant : 118 jusqu'à 76 000
assert.equal(S.ordinaireEnfantVD(0), 118);
assert.equal(S.ordinaireEnfantVD(26000), 118);
assert.equal(S.ordinaireEnfantVD(63000), 118);
assert.equal(S.ordinaireEnfantVD(76000), 118);
assert.equal(S.ordinaireEnfantVD(76001), 0);
// la courbe ne remonte jamais et reste dans la fourchette publiée
for (const mn of [seul, fam, couple]) {
  let prec = Infinity;
  for (let rd = 0; rd <= 80000; rd += 250) {
    const v = ord(rd, mn);
    assert.ok(v <= prec, `monotone ${rd}`);
    prec = v;
  }
}
// déduction pour enfants à charge (arrêté art. 4 al. 1, notice point 1) : 6 000, 13 000, puis +7 000
assert.equal(S.revenuOvamVD(76000, 0), 76000);
assert.equal(S.revenuOvamVD(76000, 1), 70000);
assert.equal(S.revenuOvamVD(76000, 2), 63000);
assert.equal(S.revenuOvamVD(76000, 3), 56000);
assert.equal(S.revenuOvamVD(5000, 2), 0, "jamais négatif");
// exemple de la notice : famille de 4 personnes, RDU 76 000 -> revenu OVAM 63 000, subside ordinaire 3 312 par an
{
  const r = calc("VD", m(2, 2), 76000, { region: "1" });
  assert.equal(r.vd?.revenuOvam, 63000);
  assert.equal(r.vd?.ordinaire, 276);
  assert.equal((r.vd?.ordinaire ?? 0) * 12, 3312);
  assert.equal(par(S.calculer({ canton: "VD", menage: m(2, 2), rdu: 76000, region: "1", primes: { adulte: 1000, jeuneAdulte: 0, enfant: 1000 } }) as never, "enfant") >= 118, true);
}
// subside spécifique de la notice : (17 400 − 3 312) − 76 000 × 10 % = 6 488
assert.equal(S.specifiqueAnnuelVD(17400, 3312, 76000), 6488);
assert.equal(S.specifiqueAnnuelVD(1000, 3000, 20000), 0, "jamais négatif");
// primes de référence (arrêté art. 10)
assert.deepEqual(S.primeReferenceVD(seul, 62500, "1"), { adulte: 580, enfant: 165 });
assert.equal(S.primeReferenceVD(seul, 62501, "1").adulte, 555);
assert.equal(S.primeReferenceVD(seul, 70001, "2").adulte, 468);
assert.equal(S.primeReferenceVD(couple, 86300, "2").adulte, 543);
assert.equal(S.primeReferenceVD(couple, 86301, "2").adulte, 518);
assert.equal(S.primeReferenceVD(fam, 96601, "1").adulte, 505);
assert.equal(S.primeReferenceVD(fam, 96601, "2").enfant, 156);
// ménage de la notice avec les primes de référence 2027 : subside total plafonné à la prime retenue
{
  const r = calc("VD", m(2, 2), 76000, { region: "1", primes: { adulte: 600, jeuneAdulte: 0, enfant: 200 } });
  const retenu = (580 * 2 + 165 * 2);
  assert.ok(r.subsideMensuel <= retenu, "pas au-delà des primes de référence");
  // taux d'effort : (primes retenues − ordinaire) − 10 % du RDU, réparti enfants d'abord
  const attendu = retenu - 276 - 7600 / 12;
  assert.ok(Math.abs((r.vd?.specifique ?? 0) - attendu) < 4, `spécifique ≈ ${attendu}`);
  assert.equal(par(r, "enfant"), 165, "les enfants d'abord, jusqu'à la prime de référence");
}
assert.equal(calc("VD", m(1), 70000, { region: "2" }).vd?.specifique, 0, "taux d’effort sous 10 %");
assert.equal(calc("VD", m(1), 200000).droit, false);
assert.equal(S.calculer({ canton: "VD", menage: m(1, 0, 1), rdu: 20000, primes: gros }).calcule, false, "jeunes adultes : hors outil");

/* Vaud, entre les seuils : points dérivés des formules de l'art. 21 RLVLAMal et des paramètres de l'arrêté du 7 octobre
   2026, et non montants officiels publiés (le simulateur en ligne du canton affichait encore 2026 le 24.11.2026, sans
   montant intermédiaire 2027 à lire). Valeurs issues d'une dérivation indépendante (6 548 comparaisons, accord avec le
   moteur) ; le franc supérieur s'applique au résultat de la formule. Pas de point à RD 39 999 : la dérivation arrondit
   plus largement que la règle littérale, d'un franc. */
const POINTS_VD: [string, S.Menage, number, number][] = [
  ["adulte de 26 ans et plus, seul", seul, 20000, 319],
  ["adulte de 26 ans et plus, seul", seul, 30000, 145],
  ["adulte de 26 ans et plus, seul", seul, 35000, 59],
  ["couple sans enfant", couple, 30000, 287],
  ["couple sans enfant", couple, 35000, 256],
  ["couple sans enfant", couple, 65000, 23],
  ["adulte avec enfant(s)", fam, 28500, 288],
  ["adulte avec enfant(s)", fam, 35000, 228],
  ["adulte avec enfant(s)", fam, 45000, 90],
];
for (const [nom, mn, rd, attendu] of POINTS_VD) assert.equal(ord(rd, mn), attendu, `${nom}, RD ${rd}`);
// l'enfant : la formule 5 reste à 118 francs entre les seuils (E = F = G = 118)
for (const rd of [30000, 50000, 70000]) assert.equal(S.ordinaireEnfantVD(rd), 118, `enfant, RD ${rd}`);
// recalcul à la main de trois points (formule 1 : E + (F − E) × (1 − ((RD − C) / (A − C))²)^P, puis franc supérieur)
// seul, RD 30 000 : x = 13 000 / 23 000 = 0,5652 ; 1 − x² = 0,6805 ; 0,6805^2,5 = 0,3820 ; 30 + 301 × 0,3820 = 144,996 -> 145
// couple, RD 65 000 : x = 40 800 / 45 800 = 0,8908 ; 1 − x² = 0,2064 ; 0,2064^3 = 0,008796 ; 20 + 280 × 0,008796 = 22,46 -> 23
// famille, RD 35 000 : x = 10 800 / 30 800 = 0,3506 ; 1 − x² = 0,8770 ; 0,8770^2,3 = 0,7395 ; 20 + 280 × 0,7395 = 227,07 -> 228
const courbeMain = (E: number, F: number, C: number, A: number, P: number, rd: number) => E + (F - E) * Math.pow(1 - Math.pow((rd - C) / (A - C), 2), P);
assert.equal(Math.ceil(courbeMain(30, 331, 17000, 40000, 2.5, 30000) - 1e-9), 145);
assert.equal(Math.ceil(courbeMain(20, 300, 24200, 70000, 3, 65000) - 1e-9), 23);
assert.equal(Math.ceil(courbeMain(20, 300, 24200, 55000, 2.3, 35000) - 1e-9), 228);
// chaîne complète : le ménage de la notice (2 adultes, 2 enfants, RDU 76 000, RD 63 000) reçoit 40 + 236 = 276 francs, soit 3 312 par an
assert.equal(calc("VD", m(2, 2), 76000).vd?.ordinaire, 276);

/* ------------------------------------------------------------ Neuchâtel (page ne.ch et arrêté 2027) */
const NE = D.cantons.NE.tables;
assert.equal(NE.montants.length, 15);
assert.deepEqual(NE.montants.map((x) => x.adulte), [639, 607, 542, 478, 413, 349, 291, 233, 182, 125, 105, 92, 79, 67, 54]);
assert.ok(NE.montants.every((x) => x.enfant === 166));
// bornes de la personne seule sans enfant : S1 jusqu'à 22 800, S9 30 781 à 31 920, S10 31 921 à 50 600
assert.equal(S.classeNE(m(1), 22800), 1);
assert.equal(S.classeNE(m(1), 22801), 2);
assert.equal(S.classeNE(m(1), 31920), 9);
assert.equal(S.classeNE(m(1), 31921), 10);
assert.equal(S.classeNE(m(1), 50600), 10);
assert.equal(S.classeNE(m(1), 50601), null);
assert.equal(S.classeNE(m(1), -10), 1);
// couple sans enfant : S1 jusqu'à 30 000, S10 48 241 à 67 551
assert.equal(S.classeNE(m(2), 30000), 1);
assert.equal(S.classeNE(m(2), 30001), 2);
assert.equal(S.classeNE(m(2), 48240), 9);
assert.equal(S.classeNE(m(2), 48241), 10);
assert.equal(S.classeNE(m(2), 67551), 10);
assert.equal(S.classeNE(m(2), 67552), null);
// une personne seule avec un enfant : S1 33 000, S10 42 121 à 44 400, S11 jusqu'à 45 540, S12 jusqu'à 56 148, S15 58 165 à 65 089
[[33000, 1], [33001, 2], [44400, 10], [44401, 11], [45540, 11], [45541, 12], [56148, 12], [56149, 13], [57156, 13], [57157, 14], [58164, 14], [58165, 15], [64188, 15]].forEach(([r, k]) =>
  assert.equal(S.classeNE(m(1, 1), r), k, `seul 1 enfant ${r}`),
);
assert.equal(S.classeNE(m(1, 1), 65089), 15);
assert.equal(S.classeNE(m(1, 1), 65090), null);
assert.equal(S.classeNE(m(1, 2), 72824), 15, "deux enfants : S15 va de 64 189 à 72 824");
assert.equal(S.limiteMaximale("NE", m(1, 1)), 65089);
assert.equal(S.limiteMaximale("NE", m(2, 3)), 104755);
assert.equal(S.limiteMaximale("NE", m(1)), 50600);
// chaque colonne du tableau se suit sans trou ni recouvrement
for (const grille of [NE.seul, NE.couple] as (number[] | null)[][][]) {
  for (let e = 0; e <= 3; e++) {
    let fin = -1;
    for (const ligne of grille) {
      const b = ligne[e];
      if (!b) continue;
      assert.equal(b[0], fin + 1, `continuité colonne ${e}`);
      fin = b[1];
    }
  }
}
{
  const r = calc("NE", m(2, 2), 60000); // couple, 2 enfants : S6 va de 53 521 à 55 800 ; 60 000 est dans S7 (55 801 à 58 080)? vérifions dans le tableau
  const k = S.classeNE(m(2, 2), 60000)!;
  assert.equal(r.groupe, `S${k}`);
  assert.equal(r.subsideMensuel, NE.montants[k - 1].adulte * 2 + 166 * 2);
  assert.equal(calc("NE", m(1), 51000).droit, false);
}
assert.equal(S.calculer({ canton: "NE", menage: m(1, 4), rdu: 20000, primes: gros }).calcule, false, "plus de trois enfants : l'arrêté renvoie à des règles non reprises");
assert.equal(S.calculer({ canton: "NE", menage: m(1, 0, 1), rdu: 20000, primes: gros }).calcule, false);

/* ------------------------------------------------------------ Jura (arrêté du 20.10.2026, communiqué du 23.10.2026) */
const JU = D.cantons.JU.tables;
assert.equal(JU.adulte.length, 28);
assert.equal(S.adulteJU(-1), 225, "inférieur à 0");
assert.equal(S.adulteJU(0), 225);
assert.equal(S.adulteJU(999), 225);
assert.equal(S.adulteJU(1000), 215);
assert.equal(S.adulteJU(8999), 145);
assert.equal(S.adulteJU(9000), 125);
assert.equal(S.adulteJU(20000), 45);
assert.equal(S.adulteJU(26999), 15, "communiqué : subside partiel de 15 à 225 francs, RDU jusqu'à 26 999");
assert.equal(S.adulteJU(27000), 0);
assert.equal(S.adulteJU(100000), 0);
assert.ok(JU.adulte.every((v, i, a) => i === 0 || v <= a[i - 1]));
assert.equal(JU.limite_adulte, 26999);
assert.equal(JU.limite_enfant, 52999);
{
  const r = calc("JU", m(2, 2), 12000, { activite: true });
  assert.equal(par(r, "adulte"), 95 + 110, "adulte 12 000 : 95 ; supplément famille 12 000 : 110");
  assert.equal(par(r, "enfant"), 108);
  assert.equal(r.subsideMensuel, 205 * 2 + 108 * 2);
  assert.equal(calc("JU", m(2, 2), 12000, { activite: false }).subsideMensuel, 95 * 2 + 108 * 2, "sans activité : pas de supplément");
  assert.equal(calc("JU", m(2, 0), 12000, { activite: true }).subsideMensuel, 95 * 2, "sans enfant à charge : pas de supplément");
  assert.equal(par(calc("JU", m(1, 1), 52999), "enfant"), 108);
  assert.equal(par(calc("JU", m(1, 1), 53000), "enfant"), 0);
  assert.equal(par(calc("JU", m(1, 0, 1), 52999), "jeuneAdulte"), 204);
  assert.equal(par(calc("JU", m(1, 0, 1), 53000), "jeuneAdulte"), 0);
}
// supplément famille (arrêté art. 4) : 330 jusqu'à 2 999, puis 315, 295, ..., 15 à 17 999, 0 dès 18 000
[[-1, 330], [0, 330], [2999, 330], [3000, 315], [4000, 295], [5000, 275], [6000, 250], [7000, 225], [8000, 200], [9000, 185], [10000, 165], [11000, 140], [12000, 110], [13000, 90], [14000, 70], [15000, 55], [16000, 35], [17000, 15], [17999, 15], [18000, 0]].forEach(([r, v]) =>
  assert.equal(S.supplementJU(r), v, `supplément ${r}`),
);
assert.equal(JU.supplement_limite, 17999);
assert.equal(JU.fortune_max, 150000);

/* ------------------------------------------------------------ Valais : information seulement */
{
  const r = S.calculer({ canton: "VS", menage: m(1), rdu: 10000, primes: gros });
  assert.equal(r.calcule, false);
  assert.equal((r as { raison: string }).raison, "aucun-bareme-2027");
  assert.equal(S.limiteMaximale("VS", m(1)), null);
  assert.deepEqual(Object.keys(D.cantons.VS.tables), ["echelle_2026", "fortune_max"], "seule l'échelle 2026 est conservée, avec son année");
}

/* ------------------------------------------------------------ propriétés : prime nette jamais négative, jamais plus que la prime */
{
  const rdus = [-5000, 0, 1000, 14999, 17000, 25000, 30000, 45000, 52999, 60000, 76000, 90000, 120000, 160000, 250000];
  const primes: S.Primes[] = [gros, { adulte: 400, jeuneAdulte: 300, enfant: 100 }, { adulte: 1, jeuneAdulte: 1, enfant: 1 }, { adulte: 0, jeuneAdulte: 0, enfant: 0 }];
  let n = 0;
  for (const canton of S.CANTONS)
    for (const adultes of [1, 2] as const)
      for (const enfants of [0, 1, 2, 3]) for (const ja of [0, 1])
        for (const rdu of rdus) for (const pr of primes) for (const region of ["1", "2"] as const) for (const activite of [false, true]) {
          const r = S.calculer({ canton, menage: m(adultes, enfants, ja), rdu, primes: pr, region, activite });
          if (!r.calcule) { assert.ok(canton === "VS" || r.motif === "hors-perimetre", `${canton} information`); continue; }
          n++;
          for (const l of r.lignes) {
            assert.ok(l.subside >= 0 && l.subside <= l.prime + 1e-9, `${canton} subside borné par la prime`);
            assert.ok(l.primeNette >= 0, `${canton} prime nette >= 0`);
          }
          assert.ok(r.primeNetteMensuelle >= -1e-9);
          assert.ok(Math.abs(r.primeMensuelle - r.subsideMensuel - r.primeNetteMensuelle) < 0.011);
        }
  assert.ok(n > 5000);
}
// un canton sans barème 2027 ne renvoie aucun montant, quelle que soit l'entrée
assert.equal("subsideMensuel" in S.calculer({ canton: "VS", menage: m(2, 2), rdu: 0, primes: gros }), false);

/* ------------------------------------------------------------ Vaud : RDU reconstitué depuis la décision de taxation
   Composantes : notice 2027 de l'OVAM, point 1 (codes 650, 320, 310, 300 ; forfaits 2 200 / 4 400 / 1 300 ; franchise 20 000). */
{
  const base = { revenuNet: 40000, primesDeduites: 0, adultes: 1 as 1 | 2, enfants: 0 };
  assert.equal(S.rduVD(base).rdu, 37800, "seul : revenu net moins 2 200");
  assert.equal(S.rduVD({ ...base, adultes: 2 }).rdu, 35600, "couple : moins 4 400");
  assert.equal(S.rduVD({ ...base, adultes: 2, enfants: 2 }).rdu, 33000, "couple, 2 enfants : moins 4 400 et 2 x 1 300");
  assert.equal(S.rduVD({ ...base, primesDeduites: 3000 }).rdu, 40800, "code 300 ajouté");
  for (const [r, att] of [[0, 0], [19999, 0], [20000, 0], [20001, 1], [30000, 10000]] as const)
    assert.equal(S.rduVD({ ...base, rachatsLpp: r }).rachatsRetenus, att, `rachats ${r}`);
  assert.equal(S.rduVD({ ...base, rachatsLpp: 25000 }).rdu, 37800 + 5000);
  assert.equal(S.rduVD({ ...base, versements3a: 7258 }).rdu, 37800 + 7258);
  assert.equal(S.rduVD({ ...base, revenuNet: 1000 }).rdu, 0);
  assert.equal(S.rduVD({ ...base, revenuNet: 2200 }).rdu, 0);
  assert.equal(S.rduVD({ ...base, revenuNet: 2201 }).rdu, 1);
  const d = S.rduVD({ revenuNet: 50000, primesDeduites: 2000, rachatsLpp: 22000, versements3a: 3000, adultes: 2, enfants: 1 });
  assert.equal(d.rdu, 50000 + 2000 + 2000 + 3000 - 4400 - 1300);
  assert.equal(d.deductionForfaitaire, 5700);
  // égalité : parcours « décision de taxation » = parcours « je connais mon RDU » avec le RDU obtenu
  for (const e of [base, { ...base, adultes: 2 as 1 | 2, enfants: 3, primesDeduites: 4000 }, { ...base, rachatsLpp: 30000, versements3a: 5000 }]) {
    const rdu = S.rduVD(e).rdu;
    const via = S.calculer({ canton: "VD", menage: m(e.adultes, e.enfants), rdu, primes: gros, region: "1" });
    const direct = calc("VD", m(e.adultes, e.enfants), rdu);
    assert.deepEqual(via, direct);
  }
}

/* estimateur officiel de l'État de Vaud, version 2026, relevé le 24.11.2026 ; paramètres adultes identiques en 2027.
   Personne seule née en 1985, 1000 Lausanne 25 (région 1), prime 500 CHF par mois, aucune fortune. */
{
  const prime500 = { adulte: 500, jeuneAdulte: 500, enfant: 0 };
  // revenu total (revenu net + code 300, répartition inconnue), RDU après forfait de 2 200, subside mensuel officiel, ordinaire, spécifique
  const cas: [number, number, number, number, number][] = [
    [20000, 17800, 352, 331, 21],
    [25000, 22800, 0, 0, 0],
    [28000, 25800, 285, 233, 52],
    [35000, 32800, 227, 92, 135],
  ];
  for (const [total, rdu, officiel, ord, spec] of cas) {
    for (const primes of [0, 4000]) {
      assert.equal(S.rduVD({ revenuNet: total - primes, primesDeduites: primes, adultes: 1, enfants: 0 }).rdu, rdu, `RDU pour un total de ${total}`);
    }
    if (!officiel) continue; // le cas 25 000 n'a été relevé que pour le RDU
    const r = calc("VD", m(1), rdu, { primes: prime500 });
    assert.equal(Math.round(r.subsideMensuel), officiel, `subside officiel pour un RDU de ${rdu}`);
    assert.equal(Math.round(r.vd!.ordinaire), ord);
    assert.equal(Math.round(r.vd!.specifique), spec);
  }
}

/* ------------------------------------------------------------ saisie */
assert.equal(S.lireRevenu("52 000"), 52000);
assert.equal(S.lireRevenu("52'000"), 52000);
assert.equal(S.lireRevenu("52’000"), 52000);
assert.equal(S.lireRevenu("52 000"), 52000);
assert.equal(S.lireRevenu("-1 200"), -1200);
assert.equal(S.lireRevenu(""), null);
assert.equal(S.lireRevenu("abc"), null);
assert.equal(S.lireRevenu("12,5"), null);

console.log("subsides : tous les tests passent");

/* Estimateur officiel de l'État de Vaud, version 2026, relevé le 24.11.2026 ; paramètres adultes identiques en 2027.
   Couple (nés en 1985 et 1987) avec deux enfants (2015, 2018), 1000 Lausanne, primes de 500 CHF par adulte et de 120 CHF
   par enfant, revenus nets 60 000 : déduction forfaitaire 7 000 (2 × 2 200 + 2 × 1 300), RDU 53 000, 799 CHF par mois.
   Ce cas fixe l'arrondi du subside spécifique : une fois, sur le total du ménage. */
{
  const r = S.calculer({ canton: "VD", menage: { adultes: 2, jeunesAdultes: 0, enfants: 2 }, rdu: 53000, region: "1", primes: { adulte: 500, jeuneAdulte: 0, enfant: 120 } });
  assert.ok(r.calcule);
  if (r.calcule) {
    assert.equal(r.subsideMensuel, 799, "VD officiel : couple, deux enfants, RDU 53 000");
    assert.equal(r.vd?.ordinaire, 554);
    assert.equal(r.vd?.specifique, 245);
  }
}
console.log("subsides : cas officiel vaudois du couple avec deux enfants OK");

/* Estimateur officiel de l'État de Vaud, version 2026, relevé le 24.11.2026 : parent seul (né en 1985, 1000 Lausanne)
   avec deux enfants, revenus nets 35 000, déduction forfaitaire 4 800 (2 200 + 2 × 1 300), RDU 30 200, 539 CHF par mois.
   Le subside spécifique est nul ; 539 = 311 pour l'adulte + 2 × 114 pour les enfants. Le montant de l'enfant était de
   114 CHF en 2026 et passe à 118 CHF en 2027 : seule la part de l'adulte (paramètres identiques) est comparable. */
{
  assert.equal(S.rduVD({ revenuNet: 35000, primesDeduites: 0, rachatsLpp: 0, versements3a: 0, adultes: 1, enfants: 2 }).rdu, 30200, "VD officiel : RDU du parent seul avec deux enfants");
  const r = S.calculer({ canton: "VD", menage: { adultes: 1, jeunesAdultes: 0, enfants: 2 }, rdu: 30200, region: "1", primes: { adulte: 500, jeuneAdulte: 0, enfant: 120 } });
  assert.ok(r.calcule);
  if (r.calcule) {
    assert.equal(r.vd?.specifique, 0);
    assert.equal(r.lignes.find((l) => l.categorie === "adulte")?.subside, 311, "VD officiel : part de l'adulte, parent seul, RDU 30 200");
    assert.equal(r.subsideMensuel, 311 + 2 * 118);
  }
}
console.log("subsides : cas officiel vaudois du parent seul OK");

/* Estimateur officiel de l'État de Vaud, version 2026, relevé le 24.11.2026 ; paramètres adultes identiques en 2027.
   Adulte seul, 1000 Lausanne, prime de 500 CHF, total 25 000 − 2 200 : RDU 22 800, 310 CHF par mois. */
{
  const r = S.calculer({ canton: "VD", menage: { adultes: 1, jeunesAdultes: 0, enfants: 0 }, rdu: 22800, region: "1", primes: { adulte: 500, jeuneAdulte: 0, enfant: 0 } });
  assert.ok(r.calcule);
  if (r.calcule) { assert.equal(r.subsideMensuel, 310); assert.equal(r.vd?.ordinaire, 286); assert.equal(r.vd?.specifique, 24); }
}
/* ------------------------------------------------------------ Vaud : fortune mobilière (art. 4 RLHPS, notice 2027 point ⑨) */
{
  const seul = { revenuNet: 25000, primesDeduites: 0, adultes: 1 as 1 | 2, enfants: 0 };
  const maj = (fortuneMobiliere: number | undefined, adultes: 1 | 2 = 1) => S.rduVD({ ...seul, adultes, fortuneMobiliere }).majorationFortune;
  // franchise 2027 : 60 000 (une personne, avec ou sans enfant), 120 000 (couple) ; taux 6,7 % de la part au-delà
  assert.equal(maj(undefined), 0, "champ vide = 0");
  assert.equal(maj(0), 0);
  assert.equal(maj(60000), 0);
  assert.equal(maj(60001), 0, "60 001 : 0,067 arrondi au franc le plus proche (arrondi non attesté officiellement)");
  assert.equal(maj(60100), 7, "60 100 : 6,7 arrondi à 7");
  assert.equal(S.rduVD({ ...seul, enfants: 2, fortuneMobiliere: 60000 }).majorationFortune, 0, "famille monoparentale : 60 000");
  assert.equal(maj(100000), 2680);
  assert.equal(maj(120000, 2), 0, "couple : 120 000");
  assert.equal(maj(150000, 2), 2010);
  const d = S.rduVD({ ...seul, fortuneMobiliere: 100000 });
  assert.deepEqual([d.fortuneMobiliere, d.franchiseFortune, d.fortuneRetenue, d.majorationFortune, d.rdu], [100000, 60000, 40000, 2680, 25480]);
  assert.equal(S.rduVD({ ...seul, adultes: 2, fortuneMobiliere: 150000 }).rdu, 25000 - 4400 + 2010);
  // estimateur officiel de l'État de Vaud, version 2026, relevé le 24.11.2026 : personne seule, revenu net 25 000, fortune mobilière
  // 100 000, franchise générale appliquée 59 000 (valeur 2026) : fortune retenue 41 000, majoration 2 747, RDU 25 547, subside 288
  const retenue2026 = 100000 - 59000;
  assert.equal(retenue2026, 41000);
  assert.equal(Math.round(retenue2026 * S.RDU_VD.tauxFortune), 2747, "6,7 % et non un quinzième (2 733)");
  assert.equal(25000 - 2200 + 2747, 25547);
  const r = calc("VD", m(1), 25547, { primes: { adulte: 500, jeuneAdulte: 500, enfant: 0 } });
  assert.equal(Math.round(r.subsideMensuel), 288);
  assert.equal(Math.round(r.vd!.ordinaire), 238);
  assert.equal(Math.round(r.vd!.specifique), 50);
}

/* ------------------------------------------------------------ Vaud : immobilier, fortune commerciale, code 540
   cas dérivés des formules affichées par l'estimateur de l'État de Vaud (étape 2), de l'art. 4 RLHPS et de la notice 2027,
   et non montants officiels publiés. Franchises : logement propre 300 000, fortune commerciale 100 000 par ménage, puis
   franchise générale 60 000 (une personne) ou 120 000 (couple) ; majoration de 6,7 % arrondie au franc. */
{
  const seul = { revenuNet: 25000, primesDeduites: 0, adultes: 1 as 1 | 2, enfants: 0 };
  const d = (e: Partial<S.EntreeRduVD>) => S.rduVD({ ...seul, ...e });
  // logement 500 000 seul : 200 000 - 60 000 = 140 000, x 0,067 = 9 380
  assert.equal(d({ logementPropre: 500000 }).majorationFortune, 9380);
  assert.equal(d({ logementPropre: 500000 }).logementRetenu, 200000);
  assert.equal(d({ logementPropre: 500000 }).fortuneRetenue, 140000);
  assert.equal(d({ logementPropre: 300000 }).majorationFortune, 0, "logement à 300 000 : franchise entière");
  assert.equal(d({ logementPropre: 300001 }).logementRetenu, 1);
  // logement 250 000 (0 retenu) + fortune mobilière 80 000 : 20 000 au-delà de 60 000 = 1 340
  assert.equal(d({ logementPropre: 250000, fortuneMobiliere: 80000 }).majorationFortune, 1340);
  // autre immeuble 200 000, couple : 200 000 - 120 000 = 80 000 = 5 360 (aucune franchise sur l'autre immeuble)
  assert.equal(d({ autreImmobilier: 200000, adultes: 2 }).majorationFortune, 5360);
  assert.equal(d({ autreImmobilier: 60000 }).majorationFortune, 0, "autre immeuble : seule la franchise générale joue");
  // fortune commerciale 150 000 seul : 50 000 retenus, sous 60 000 : 0
  assert.equal(d({ fortuneCommerciale: 150000 }).commercialeRetenue, 50000);
  assert.equal(d({ fortuneCommerciale: 150000 }).majorationFortune, 0);
  assert.equal(d({ fortuneCommerciale: 100000 }).commercialeRetenue, 0);
  // commerciale 400 000 (300 000 retenus) + mobilière 50 000, couple : 350 000 - 120 000 = 230 000 = 15 410
  const c = d({ fortuneCommerciale: 400000, fortuneMobiliere: 50000, adultes: 2 });
  assert.equal(c.fortuneAvantFranchise, 350000);
  assert.equal(c.fortuneRetenue, 230000);
  assert.equal(c.majorationFortune, 15410);
  // code 540 : l'excédent saisi s'ajoute en entier au revenu
  assert.equal(d({ fraisEntretien: 4000 }).rdu, 25000 - 2200 + 4000);
  assert.equal(d({ fraisEntretien: 0 }).rdu, 25000 - 2200);
  // toutes les lignes : couple, 2 enfants. Revenu net 50 000 + primes 3 000 + rachats (30 000 - 20 000) + 3a 4 000 + code 540 2 500
  // - forfait (4 400 + 2 x 1 300) = 50 000 + 3 000 + 10 000 + 4 000 + 2 500 - 7 000 = 62 500.
  // Fortune : logement 450 000 (150 000 retenus) + autre immeuble 100 000 + mobilière 40 000 + commerciale 220 000 (120 000 retenus)
  // = 410 000 ; moins 120 000 = 290 000 ; x 0,067 = 19 430. RDU = 62 500 + 19 430 = 81 930.
  const t = S.rduVD({ revenuNet: 50000, primesDeduites: 3000, rachatsLpp: 30000, versements3a: 4000, fraisEntretien: 2500, logementPropre: 450000, autreImmobilier: 100000, fortuneMobiliere: 40000, fortuneCommerciale: 220000, adultes: 2, enfants: 2 });
  assert.equal(t.fortuneAvantFranchise, 410000);
  assert.equal(t.fortuneRetenue, 290000);
  assert.equal(t.majorationFortune, 19430);
  assert.equal(t.rdu, 81930);
  // les anciennes entrées (sans les nouvelles lignes) donnent le même résultat qu'avant
  assert.equal(d({ fortuneMobiliere: 100000 }).rdu, 25000 - 2200 + 2680);
}

console.log("subsides : cas officiel vaudois de l'adulte seul à 22 800 OK");
