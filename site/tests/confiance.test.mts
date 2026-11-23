/* node --no-warnings tests/confiance.test.mts
   Bande de confiance : chiffres comptés dans les données, emplacement des avis vide par défaut, note JSON-LD
   seulement avec une adresse configurée, des chiffres complets et au moins 10 avis (seuil unique NOMBRE_MIN_AVIS). */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as C from "../src/lib/confiance-core.ts";

const lire = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const CANTONS = ["GE", "VD", "VS", "FR", "NE", "JU", "BE"].map((c) => lire(`../public/data/primes-2027/${c}.json`));
const AVIS = lire("../src/data/avis.json") as C.Avis;
let n = 0;
const ok = (f: () => void) => { f(); n++; };

/* Offres : une par produit présent dans chaque région de primes, profil adulte franchise 300. */
const { offres, regions } = C.compterOffres(CANTONS);
ok(() => assert.equal(regions, 10, "10 régions de primes romandes"));
ok(() => assert.ok(offres > 900 && offres < 1500, `nombre d'offres plausible (${offres})`));
ok(() => assert.deepEqual(C.compterOffres([{ primes: { "0": { adulte: { "300": { a: [1, null, 3], s: [1, null, 3] } } } } }]), { offres: 2, regions: 1 }));
ok(() => assert.ok(lire("../src/data/garanties-pj.json").contrats.length >= 6, "contrats PJ comptés"));

/* Avis : vide dans le dépôt, donc rien d'affiché, même avec une adresse. */
ok(() => assert.equal(AVIS.note, null, "aucune note inventée dans avis.json"));
ok(() => assert.equal(AVIS.nombre, null, "aucun nombre d'avis inventé"));
ok(() => assert.equal(C.avisAffichables(AVIS, "https://example.com/avis"), null));
ok(() => assert.equal(C.avisAffichables(AVIS, undefined), null));

const plein: C.Avis = { source: "Trustpilot", url: null, note: 4.6, nombre: 37, date: "2027-01-12" };
const URL_ = "https://www.trustpilot.com/review/guide-assurance.ch";
ok(() => assert.equal(C.avisAffichables(plein, undefined), null, "sans variable d'environnement : rien"));
ok(() => assert.equal(C.avisAffichables(plein, ""), null));
ok(() => assert.equal(C.avisAffichables(plein, "http://x"), null, "https seulement"));
ok(() => assert.deepEqual(C.avisAffichables(plein, URL_), { source: "Trustpilot", url: URL_, note: 4.6, nombre: 37, date: "2027-01-12" }));
ok(() => assert.equal(C.avisAffichables({ ...plein, url: "https://autre.example" }, URL_), null, "adresses divergentes"));
ok(() => assert.ok(C.avisAffichables({ ...plein, url: URL_ }, "https://fr.trustpilot.com/review/guide-assurance.ch"), "même page Trustpilot, autre langue"));
ok(() => assert.equal(C.NOMBRE_MIN_AVIS, 10, "seuil unique : 10 avis"));
ok(() => assert.equal(C.avisAffichables({ ...plein, nombre: 9 }, URL_), null, "sous 10 avis : rien"));
ok(() => assert.ok(C.avisAffichables({ ...plein, nombre: 10, note: 3.2 }, URL_), "dès 10 avis, quelle que soit la note"));
ok(() => assert.equal(C.avisAffichables({ ...plein, note: 6 }, URL_), null, "note hors échelle"));
ok(() => assert.equal(C.avisAffichables({ ...plein, date: null }, URL_), null, "date du relevé obligatoire"));

/* JSON-LD : jamais sans avis valides, jamais sous 10 avis. */
ok(() => assert.equal(C.avisJsonLd(null, "x"), null));
ok(() => assert.equal(C.avisJsonLd(C.avisAffichables({ ...plein, nombre: 9 }, URL_), "x"), null, "9 avis : pas de JSON-LD"));
const ld = C.avisJsonLd(C.avisAffichables({ ...plein, nombre: 10 }, URL_), "https://guide-assurance.ch/#organization");
ok(() => assert.equal(ld?.aggregateRating.ratingCount, 10));
ok(() => assert.equal(ld?.aggregateRating.ratingValue, 4.6));

console.log(`confiance : ${n} vérifications OK`);
