/* Contrôles automatiques d’un article « Actualités » avant qu’il soit proposé à Sam.
   Utilisé par npm test (tests/actualites.test.mts), par scripts/verifier-actualite.mts et par le
   pipeline infra/refresh/actualites.py : un brouillon qui échoue est jeté, avec une alerte.
   Pas d’alias "@/" ici : le module doit tourner sous node --strip-types. */
import type { Article } from "./actualites-core.ts";

export type Echec = { regle: string; detail: string };

export type OptionsVerif = {
  /* Texte de toutes les sources (données du site + pages officielles relevées). Si présent, chaque
     nombre de l’article doit s’y retrouver. */
  corpus?: string;
  /* Noms d’assureurs, de banques ou d’entreprises interdits dans le texte (tirés des données). */
  noms?: string[];
};

/* Mots qui ne doivent jamais apparaître (règles éditoriales, decisions.md §8, spec §5). */
const INTERDITS: { re: RegExp; motif: string }[] = [
  { re: new RegExp(["lem", "anis"].join(""), "i"), motif: "nom interdit (courtier partenaire)" },
  { re: /west\s*bay/i, motif: "West Bay hors pied de page" },
  { re: /\bcommissions?\b|\bcourtage\b|\bcourtier/i, motif: "rémunération ou courtage" },
  { re: /(?<!(envoi|lettre|courrier|pli|par) )\brecommand\w*|\brecommend\w*/i, motif: "recommandation" }, // « envoi recommandé » permis
  { re: /\bnous conseillons\b|\bwe advise\b/i, motif: "conseil" },
  { re: /\bmeilleur(e|s|es)?\b|\bbest\b/i, motif: "superlatif commercial" },
  { re: /\b(le|la|les) moins cher(e|s|es)?\b|\bcheapest\b/i, motif: "« moins cher » (classement)" },
  { re: /\bind[ée]pendan\w*|\bindependent\b/i, motif: "« indépendant »" },
  { re: /\btous les assureurs\b|\ball (the )?insurers\b/i, motif: "« tous les assureurs »" },
  { re: /\bgratuit\w*|\bfree of charge\b/i, motif: "« gratuit »" },
  { re: /[ée]conomisez|\bsave up to\b/i, motif: "promesse d’économie" },
  { re: /\bvente de donn[ée]es\b|\bsell(ing)? (your )?data\b/i, motif: "données personnelles" },
  { re: /\bil faut\b|\bvous devez\b|\byou must\b/i, motif: "ton injonctif" },
  { re: /\bgaranti(e|s|es)?\b|\bguaranteed?\b/i, motif: "« garanti »" },
  { re: /\bid[ée]al(e|es|s)?\b/i, motif: "« idéal »" },
];

const OFFICIELS = /(^|\.)(admin\.ch|finma\.ch|snb\.ch|ch\.ch|ge\.ch|vd\.ch|vs\.ch|fr\.ch|ne\.ch|jura\.ch|be\.ch|priminfo\.admin\.ch)$/;

export function officiel(url: string): boolean {
  try { return OFFICIELS.test(new URL(url).hostname); } catch { return false; }
}

const sansUrl = (t: string) => t.replace(/\]\([^)]*\)/g, "]").replace(/https?:\/\/\S+/g, "");
export const mots = (t: string) => (t.match(/[\p{L}\p{N}]+/gu) ?? []).length;

/* Nombres d’un texte, normalisés (espaces fines et apostrophes de milliers retirées, virgule → point). */
export function nombres(t: string): string[] {
  const out: string[] = [];
  const s = sansUrl(t)
    .replace(/\b(art|al|let|para|ch|RS|SR|RO)\.?\s*\d+[a-z]?(\s*(bis|ter))?/gi, " ") // références légales
    .replace(/\b\d{1,2}(er)?\s+(janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre|January|February|March|April|May|June|July|August|September|October|November|December)\b/gi, " ") // dates
    .replace(/\b\d{1,2}\.\d{1,2}\.\d{4}\b/g, " ")
    .replace(/\b\d+(er|e|re|a|b|bis)\b/g, " ")                                       // 1er, 3e, 3a, 2e pilier
    .replace(/\b\d{1,2}\s?h\s?\d{2}\b|\b\d{1,2}:\d{2}\b/g, " ");                     // heures (9 h 30, 9:30)
  for (const m of s.matchAll(/\d{1,3}(?:[   '’,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g)) {
    let n = m[0];
    // Milliers : « 1 743,60 », « 1,743.60 », « 3’648 ».
    n = n.replace(/[   '’]/g, "");
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(n)) n = n.replace(/,/g, "");
    n = n.replace(",", ".");
    if (n.includes(".")) n = n.replace(/0+$/, "").replace(/\.$/, "");
    out.push(n);
  }
  return out;
}

function exempte(n: string): boolean {
  const v = Number(n);
  if (!Number.isFinite(v)) return true;
  if (Number.isInteger(v) && v >= 0 && v <= 12) return true;       // petits entiers (mois, nombre d’étapes)
  if (Number.isInteger(v) && v >= 1990 && v <= 2040) return true;  // années
  return false;
}

export function verifierArticle(a: Pick<Article, "locale" | "title" | "description" | "sources" | "faq" | "markdown">, o: OptionsVerif = {}): Echec[] {
  const e: Echec[] = [];
  const ko = (regle: string, detail: string) => e.push({ regle, detail });
  const faqTxt = a.faq.map((f) => `${f.q}\n${f.a}`).join("\n");
  const tout = `${a.title}\n${a.description}\n${a.markdown}\n${faqTxt}`;
  const texte = sansUrl(tout);

  for (const { re, motif } of INTERDITS) {
    const m = texte.match(re);
    if (m) ko("mots interdits", `${motif} : « ${m[0]} »`);
  }
  for (const nom of o.noms ?? []) {
    if (!nom || nom.length < 3) continue;
    const re = new RegExp(`(^|[^\\p{L}])${nom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^\\p{L}])`, "u");
    if (re.test(texte)) ko("entreprise nommée", nom);
  }

  if (/[—–]/.test(tout)) ko("typographie", "tiret long ou demi-cadratin");
  const pasMais = a.locale === "fr" ? /\bpas\b[^.;:!?\n]{1,60}\bmais\b/i : /\bnot\b[^.;:!?\n]{1,60}\bbut\b/i;
  const pm = texte.match(pasMais);
  if (pm) ko("tournure", `« ${pm[0]} »`);
  if (a.locale === "fr") {
    const m1 = texte.match(/[^ ][;:!?](?=\s|$)|[^ ]»|«[^ ]/);
    if (m1) ko("espace fine", `« ${m1[0]} » (U+202F attendue)`);
  } else if (/ [;:!?]/.test(tout)) ko("typographie", "espace fine dans un texte anglais");

  if (a.sources.length < 3) ko("sources", `${a.sources.length} source(s), 3 au minimum`);
  if (a.sources.filter((s) => officiel(s.url)).length < 2) ko("sources", "moins de 2 sources officielles");
  if (a.sources.length > 8) ko("sources", "plus de 8 sources");

  const n = mots(a.markdown);
  const [min, max] = a.locale === "fr" ? [700, 1200] : [550, 1200];
  if (n < min || n > max) ko("longueur", `${n} mots (attendu ${min} à ${max})`);
  if (a.title.length > 70) ko("titre", `${a.title.length} caractères`);
  if (a.description.length < 110 || a.description.length > 165) ko("description", `${a.description.length} caractères`);

  if (/^#\s/m.test(a.markdown)) ko("structure", "titre H1 dans le corps");
  const h2 = [...a.markdown.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
  if (h2.length < 3) ko("structure", `${h2.length} intertitres H2 (3 au minimum)`);
  for (const t of h2) if (!t.endsWith("?")) ko("structure", `H2 sans question : « ${t} »`);
  const chapo = a.markdown.trim().split(/\n\s*\n/)[0] ?? "";
  if (chapo.startsWith("#")) ko("structure", "pas de réponse avant le premier intertitre");
  if (a.faq.length < 3 || a.faq.length > 6) ko("faq", `${a.faq.length} questions (3 à 6)`);
  for (const f of a.faq) {
    const m = mots(f.a);
    if (m < 25 || m > 120) ko("faq", `réponse de ${m} mots : « ${f.q} »`);
  }

  if (o.corpus !== undefined) {
    const dispo = new Set(nombres(o.corpus));
    const absents = [...new Set(nombres(tout))].filter((x) => !exempte(x) && !dispo.has(x));
    if (absents.length) ko("chiffres sans source", absents.slice(0, 20).join(", "));
  }
  return e;
}
