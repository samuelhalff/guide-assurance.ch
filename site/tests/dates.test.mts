import assert from "node:assert/strict";
import { dateTexte } from "../src/lib/dates.ts";

const d1 = new Date(2026, 11, 1); // mardi 1er décembre 2026
assert.equal(dateTexte(d1, "fr"), "1er décembre 2026");
assert.equal(dateTexte(d1, "en"), "1 December 2026");
assert.equal(dateTexte(d1, "fr", { jour: true }), "mardi 1er décembre 2026");
assert.equal(dateTexte(d1, "en", { jour: true }), "Tuesday 1 December 2026");
assert.equal(dateTexte(new Date(2026, 10, 30), "fr", { annee: false }), "30 novembre");
assert.equal(dateTexte(new Date(2027, 2, 31), "en", { annee: false }), "31 March");
console.log("dates : 6/6");
