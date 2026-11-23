/* Données du tableau « Protection juridique : ce que couvrent les contrats » : complètes, sourcées, sans classement. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const DOMAINES = ["travail", "bail", "contrats", "assurances", "patients", "dommages", "penal", "circulation", "voyage", "internet", "propriete", "famille", "fiscal", "administratif"];
const STATUTS = new Set(["oui", "option", "conseil", "non", "nd"]);
const D = JSON.parse(readFileSync(new URL("../src/data/garanties-pj.json", import.meta.url), "utf8"));
let n = 0;
const ok = (f: () => void) => { f(); n++; };

ok(() => assert.match(D.lu_le, /^\d{4}-\d{2}-\d{2}$/));
const marques = new Set(D.contrats.map((c: { assureur: string }) => c.assureur));
ok(() => assert.ok(marques.size >= 6 && marques.size <= 10, `6 à 10 assureurs (${marques.size})`));
ok(() => assert.equal(new Set(D.contrats.map((c: { id: string }) => c.id)).size, D.contrats.length, "id uniques"));
for (const c of D.contrats) {
  ok(() => assert.ok(c.doc.url.startsWith("https://") && c.doc.titre && c.doc.version, `document sourcé : ${c.id}`));
  ok(() => assert.deepEqual(Object.keys(c.domaines).sort(), [...DOMAINES].sort(), `domaines complets : ${c.id}`));
  for (const d of DOMAINES) ok(() => assert.ok(STATUTS.has(c.domaines[d].s), `statut ${c.id}/${d}`));
  for (const k of ["carence", "franchise", "valeurMin", "libreChoix"]) ok(() => assert.ok(c[k].fr && c[k].en, `${k} FR/EN : ${c.id}`));
  for (const z of ["suisse", "europe", "monde"]) ok(() => assert.ok(c.plafond[z].fr && c.plafond[z].en, `plafond ${z} : ${c.id}`));
  ok(() => assert.equal(c.exclusions.fr.length, c.exclusions.en.length, `exclusions FR/EN : ${c.id}`));
  ok(() => assert.ok(c.porteur, `assureur porteur : ${c.id}`));
  // Aucun champ de note, de score ou de rang.
  ok(() => assert.ok(!["score", "note", "rang", "rank", "prime"].some((k) => k in c), `aucun score : ${c.id}`));
  // Typographie : espace fine insécable avant ; : ! ? en français, jamais de tiret cadratin.
  const fr = JSON.stringify(c, (k, v) => (k === "en" ? undefined : v));
  ok(() => assert.ok(!/ [;:!?]/.test(fr) && !fr.includes("—"), `typographie FR : ${c.id}`));
}
console.log(`garanties-pj : ${n} vérifications OK`);
