// node tests/nombres.test.mts : formatage des nombres sans Intl (src/lib/nombres.ts), identique au build et dans tous les navigateurs.
import assert from "node:assert";
import { nombre } from "../src/lib/nombres.ts";

const T = " ";
const cas: [number, number, "fr" | "en", string][] = [
  // FR : espace fine U+202F, virgule décimale
  [0, 0, "fr", "0"],
  [999, 0, "fr", "999"],
  [1000, 0, "fr", `1${T}000`],
  [1234567, 0, "fr", `1${T}234${T}567`],
  [727.85, 2, "fr", "727,85"],
  [1234.5, 2, "fr", `1${T}234,50`],
  [7258, 0, "fr", `7${T}258`],
  [0.4, 2, "fr", "0,40"],
  [-1234.5, 2, "fr", `-1${T}234,50`],
  [-0, 0, "fr", "0"],
  [-0.004, 2, "fr", "0,00"],
  [-0.4, 0, "fr", "0"],
  // EN : virgule de milliers, point décimal
  [1234567, 0, "en", "1,234,567"],
  [1234.5, 2, "en", "1,234.50"],
  [-98765.432, 1, "en", "-98,765.4"],
  [100, 3, "en", "100.000"],
  // Arrondi comme Intl : moitié loin de zéro, sur l'écriture décimale la plus courte
  [1.005, 2, "en", "1.01"],
  [1234.005, 2, "fr", `1${T}234,01`],
  [-1234.005, 2, "en", "-1,234.01"],
  [2.5, 0, "en", "3"],
  [-2.5, 0, "en", "-3"],
  [999.995, 2, "fr", `1${T}000,00`],
  [99999.9999, 0, "en", "100,000"],
  [0.125, 2, "en", "0.13"],
  [1e-7, 2, "en", "0.00"],
  [1e21, 0, "en", "1,000,000,000,000,000,000,000"],
  // Valeurs non finies : 0, comme les anciens formateurs locaux
  [NaN, 0, "fr", "0"],
  [Infinity, 2, "en", "0.00"],
];
for (const [x, d, l, attendu] of cas) assert.equal(nombre(x, d, l), attendu, `nombre(${x}, ${d}, ${l})`);
assert.equal(nombre(1234), `1${T}234`, "défauts : 0 décimale, fr");

// Même sortie que Intl.NumberFormat de Node (séparateurs normalisés, -0 exclu) sur des valeurs tirées au hasard
let graine = 42;
const alea = () => ((graine = (graine * 1103515245 + 12345) % 2147483648) / 2147483648);
for (let i = 0; i < 20000; i++) {
  const x = (alea() - 0.3) * 10 ** Math.floor(alea() * 8);
  for (const d of [0, 2]) {
    const en = new Intl.NumberFormat("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d }).format(x).replace(/^-(0(\.0*)?)$/, "$1");
    assert.equal(nombre(x, d, "en"), en, `Intl en-GB ${x} ${d}`);
  }
}
console.log(`nombres : ${cas.length + 1} cas et 40000 comparaisons Intl OK`);
