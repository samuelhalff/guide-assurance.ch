/* Taux des comptes de libre passage : données (schéma, sources officielles), tri, illustration, mots interdits. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dateCh, interetAnnuel, lireSolde, mediane, tauxEn, tauxFr, trier, trierParNom, trierParTaux } from "../src/lib/engines/libre-passage.ts";

const lire = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const D = JSON.parse(lire("../src/data/taux-libre-passage.json"));
const ORIGINE = JSON.parse(lire("../../data/taux-libre-passage.json"));
let n = 0;
const ok = (f: () => void) => { f(); n++; };

/* Domaine propre de chaque institution (hors sous-domaine www). */
const DOMAINE: Record<string, string[]> = {
  ubs: ["ubs.com"], raiffeisen: ["raiffeisen.ch"], postfinance: ["postfinance.ch"], migros: ["migrosbank.ch"], bcge: ["bcge.ch"],
  bcv: ["bcv.ch"], bcvs: ["bcvs.ch"], bcf: ["bcf.ch"], bcn: ["bcn.ch"], bcj: ["bcj.ch"], valiant: ["valiant.ch"], bas: ["bas.ch"],
  cic: ["cic.ch"], zkb: ["zkb.ch"], akb: ["akb.ch"], bkb: ["bkb.ch"], blkb: ["blkb.ch"], sgkb: ["sgkb.ch"], lukb: ["lukb.ch"],
  szkb: ["szkb.ch"], gkb: ["gkb.ch"], bekb: ["bekb.ch"], aeis: ["aeis.ch"],
};
const COMPARATEURS = ["moneyland", "comparis", "vermoegenszentrum", "vz.ch", "bonus.ch", "cash.ch", "10vor10", "finanzen.ch", "moneypark", "bilan.ch", "mon-impot"];

/* Fichier du site = fichier des données. */
ok(() => assert.deepEqual(D, ORIGINE, "site/src/data et data/ identiques"));

/* Schéma */
ok(() => assert.match(D.releve_le, /^\d{4}-\d{2}-\d{2}$/));
ok(() => assert.ok(D.comptes.length >= 12, `au moins 12 institutions (${D.comptes.length})`));
ok(() => assert.equal(new Set(D.comptes.map((c: { id: string }) => c.id)).size, D.comptes.length, "id uniques"));
for (const c of D.comptes) {
  ok(() => assert.ok(typeof c.taux === "number" && c.taux >= 0 && c.taux <= 3, `taux entre 0 et 3 : ${c.id}`));
  ok(() => assert.ok(c.banque && typeof c.banque === "string", `nom : ${c.id}`));
  ok(() => assert.match(c.lu_le, /^\d{4}-\d{2}-\d{2}$/, `date de relevé : ${c.id}`));
  ok(() => assert.ok(c.taux_valable_des === null || /^\d{4}-\d{2}-\d{2}$/.test(c.taux_valable_des), `date de validité : ${c.id}`));
  ok(() => assert.ok(["page", "pdf"].includes(c.source_type) && ["http", "pdf", "headless"].includes(c.methode), `type et méthode : ${c.id}`));
  ok(() => assert.equal(c.source_type === "pdf", c.methode === "pdf", `PDF lu en PDF : ${c.id}`));
  ok(() => assert.ok(c.fondation === null || typeof c.fondation === "string", `fondation : ${c.id}`));
  ok(() => assert.ok((c.note_fr === null) === (c.note_en === null), `note FR et EN ensemble : ${c.id}`));
  const u = new URL(c.url);
  ok(() => assert.equal(u.protocol, "https:", `https : ${c.id}`));
  ok(() => assert.ok((DOMAINE[c.id] ?? []).some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`)), `source sur le domaine de l'institution : ${c.id} (${u.hostname})`));
  ok(() => assert.ok(!COMPARATEURS.some((x) => c.url.includes(x)), `pas de comparateur : ${c.id}`));
  ok(() => assert.ok(c.extrait && c.extrait.length > 5, `extrait lu : ${c.id}`));
}
ok(() => assert.ok(!COMPARATEURS.some((x) => JSON.stringify(D).includes(x)), "aucun comparateur dans le fichier"));

/* Tri : taux décroissant puis nom ; nom A–Z ; ex æquo départagés par le nom */
const T = [
  { banque: "Zeta", taux: 0.05 }, { banque: "Alpha", taux: 0.01 }, { banque: "Béta", taux: 0.05 }, { banque: "Ärger", taux: 0.01 }, { banque: "Gamma", taux: 0.2 },
];
ok(() => assert.deepEqual(trierParTaux(T).map((x) => x.banque), ["Gamma", "Béta", "Zeta", "Alpha", "Ärger"]));
ok(() => assert.deepEqual(trierParNom(T).map((x) => x.banque), ["Alpha", "Ärger", "Béta", "Gamma", "Zeta"]));
ok(() => assert.deepEqual(trier(T, "nom"), trierParNom(T)));
ok(() => assert.deepEqual(trier(T, "taux"), trierParTaux(T)));
ok(() => assert.deepEqual(trierParTaux(T.slice().reverse()), trierParTaux(T), "indépendant de l'ordre d'entrée"));
ok(() => assert.equal(T[0].banque, "Zeta", "le tri ne modifie pas l'entrée"));
const reel = trierParTaux(D.comptes);
for (let i = 1; i < reel.length; i++) ok(() => assert.ok(reel[i - 1].taux >= reel[i].taux, "ordre décroissant des données"));

/* Illustration : intérêt simple sur un an */
ok(() => assert.equal(interetAnnuel(100000, 0.05), 50));
ok(() => assert.equal(interetAnnuel(100000, 0.025), 25));
ok(() => assert.equal(interetAnnuel(150000, 0.2), 300));
ok(() => assert.equal(interetAnnuel(12345, 0.01), 1.23));
ok(() => assert.equal(interetAnnuel(0, 0.2), 0));
ok(() => assert.equal(interetAnnuel(100000, 0), 0));
ok(() => assert.equal(lireSolde("150 000"), 150000));
ok(() => assert.equal(lireSolde("150'000"), 150000));
ok(() => assert.equal(lireSolde("150 000,5"), 150000.5));
ok(() => assert.ok(Number.isNaN(lireSolde("")) && Number.isNaN(lireSolde("abc")) && Number.isNaN(lireSolde("-5"))));
ok(() => assert.equal(mediane([3, 1, 2]), 2));
ok(() => assert.equal(mediane([1, 2, 3, 4]), 2.5));

/* Formats */
ok(() => assert.equal(tauxFr(0.05), "0,05 %"));
ok(() => assert.equal(tauxFr(0.025), "0,025 %"));
ok(() => assert.equal(tauxFr(0), "0,00 %"));
ok(() => assert.equal(tauxEn(0.2), "0.20%"));
ok(() => assert.equal(dateCh("2026-11-24"), "24.11.2026"));

/* Mots interdits dans les textes publics et les données */
const INTERDITS = /meilleur|le moins cher|la moins chère|\bbest\b|cheapest|ind[ée]pendant|independent|jusqu['’]à \d+ ?%/i;
for (const f of ["../src/components/outils/page-libre-passage.tsx", "../src/components/outils/taux-libre-passage.tsx", "../src/data/taux-libre-passage.json", "../src/lib/engines/libre-passage.ts"]) {
  ok(() => assert.ok(!INTERDITS.test(lire(f)), `mot interdit dans ${f}`));
}
const page = lire("../src/components/outils/page-libre-passage.tsx");
ok(() => assert.ok(!/\/libre-passage\/["'`]/.test(page), "aucun lien vers un hub /libre-passage/ inexistant"));
ok(() => assert.ok(!/ [;:!?]/.test(JSON.stringify(D)), "typographie des données"));
console.log(`taux-libre-passage : ${n} vérifications OK`);
