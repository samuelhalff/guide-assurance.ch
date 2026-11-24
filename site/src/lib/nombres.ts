/* Formatage des nombres affichés, sans Intl ni toLocaleString : l'ICU de Node (build statique) et celle du navigateur
   ne donnent pas le même résultat pour fr-CH (Safari iOS : point décimal ; apostrophe ou espace selon la version),
   ce qui affiche « 727.85 CHF » et casse l'hydratation (erreur React 418). Une seule sortie, partout :
   FR : milliers en espace fine insécable U+202F, décimale « , » ; EN : milliers « , », décimale « . ».
   Arrondi comme Intl.NumberFormat : au plus proche, moitié loin de zéro, sur l'écriture décimale la plus courte du
   nombre (1.005 -> « 1,01 », là où toFixed donne « 1.00 »). -0 et les valeurs qui s'arrondissent à zéro donnent « 0 ». */

export const ESPACE_FINE = "\u202f";
/* Espace insécable ordinaire, U+00A0. */
export const INSECABLE = "\u00a0";

/* Écriture décimale positionnelle (sans exposant) de |x|. */
function decimal(abs: number): string {
  const s = String(abs);
  if (!/e/i.test(s)) return s;
  if (abs >= 1e21) return BigInt(Math.round(abs)).toString();
  return abs.toFixed(20).replace(/0+$/, "");
}

/* Arrondit l'écriture décimale à d chiffres après la virgule ; renvoie [partie entière, partie décimale]. */
function arrondir(abs: number, d: number): [string, string] {
  const [ent, frac = ""] = decimal(abs).split(".");
  if (frac.length <= d) return [ent, frac.padEnd(d, "0")];
  const chiffres = (ent + frac.slice(0, d)).split("").map(Number);
  if (Number(frac[d]) >= 5) {
    let i = chiffres.length - 1;
    while (i >= 0 && chiffres[i] === 9) chiffres[i--] = 0;
    if (i >= 0) chiffres[i] += 1;
    else chiffres.unshift(1);
  }
  const s = chiffres.join("");
  const e = s.slice(0, s.length - d).replace(/^0+(?=\d)/, "") || "0";
  return [e, s.slice(s.length - d)];
}

export function nombre(x: number, decimales = 0, locale: "fr" | "en" = "fr"): string {
  const v = Number.isFinite(x) ? x : 0;
  const d = Math.max(0, Math.min(20, Math.trunc(decimales)));
  const [ent, frac] = arrondir(Math.abs(v), d);
  const mille = locale === "fr" ? ESPACE_FINE : ",";
  const s = ent.replace(/\B(?=(\d{3})+(?!\d))/g, mille) + (d ? (locale === "fr" ? "," : ".") + frac : "");
  return v < 0 && /[1-9]/.test(ent + frac) ? `-${s}` : s;
}

/* Montant en francs : FR « 1 234,50 CHF », EN « CHF 1,234.50 ». `espaceFr` sépare le nombre de « CHF » en FR,
   `espaceEn` sépare « CHF » du nombre en EN (une espace ordinaire par défaut ; les pages qui veulent une espace
   insécable passent INSECABLE). */
export function chf(x: number, locale: "fr" | "en", decimales = 0, espaceFr = ESPACE_FINE, espaceEn = " "): string {
  const n = nombre(x, decimales, locale);
  return locale === "fr" ? `${n}${espaceFr}CHF` : `CHF${espaceEn}${n}`;
}

/* Pourcentage : FR « 12,5 % » (espace `espaceFr` avant le signe), EN « 12.5% ». */
export function pct(x: number, locale: "fr" | "en", decimales = 0, espaceFr = ESPACE_FINE): string {
  const n = nombre(x, decimales, locale);
  return locale === "fr" ? `${n}${espaceFr}%` : `${n}%`;
}
