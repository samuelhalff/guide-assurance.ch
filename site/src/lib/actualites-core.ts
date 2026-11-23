/* Actualités (FR /actualites/, EN /en/news/) : lecture des articles Markdown et règles de publication.
   Module sans alias « @/ » : importé par le site (lib/actualites.ts) et par les tests Node (tests/actualites.test.mts).

   Un article = content/{fr,en}/actualites/<slug>.md, avec en tête :
     title, description, datePublished, dateModified, status (draft | published), sources [{label, url}],
     outils [clés de OUTILS_ACTUALITES], faq [{q, a}] ; en anglais, `fr` = slug de l'article français.
   Règle : seul `status: published` entre dans les pages publiques, le plan du site, llms.txt, llms-full.txt,
   le flux RSS et la liste. Un brouillon n'existe qu'à une adresse d'aperçu non listée (/apercu/<jeton>/,
   /en/preview/<jeton>/), noindex et interdite aux robots ; le jeton vient d'une clé HMAC hors du dépôt public
   (ACTUALITES_APERCU_CLE, site/.env.local). Sans clé, aucun aperçu n'est construit. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import matter from "gray-matter";
import { marked } from "marked";

export type LocaleA = "fr" | "en";
export type Statut = "draft" | "published";
export type SourceA = { label: string; url: string };
export type Article = {
  slug: string;
  locale: LocaleA;
  fr?: string; // anglais : slug de l'article français
  title: string;
  description: string;
  datePublished: string; // ISO AAAA-MM-JJ
  dateModified: string;
  status: Statut;
  sources: SourceA[];
  outils: string[];
  faq: { q: string; a: string }[];
  markdown: string;
  html: string;
  mots: number;
  fichier: string;
};

export const BASE_ACTUALITES = { fr: "/actualites/", en: "/en/news/" } as const;
export const BASE_APERCU = { fr: "/apercu/", en: "/en/preview/" } as const;
export const cheminArticle = (a: Pick<Article, "slug" | "locale">) => `${BASE_ACTUALITES[a.locale]}${a.slug}/`;

const iso = (v: unknown, champ: string, f: string): string => {
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`${f} : ${champ} invalide (${s || "absent"}), attendu AAAA-MM-JJ`);
  return s;
};

marked.use({ gfm: true });

/* Lit un fichier d'article. Erreur (build arrêté) si un champ obligatoire manque ou si le statut est inconnu. */
export function lireArticle(fichier: string, locale: LocaleA): Article {
  const { data, content } = matter(fs.readFileSync(fichier, "utf8"));
  const f = path.basename(fichier);
  const status = String(data.status ?? "");
  if (status !== "draft" && status !== "published") throw new Error(`${f} : status « ${status} » inconnu (draft | published)`);
  for (const champ of ["title", "description"]) if (!data[champ]) throw new Error(`${f} : ${champ} manquant`);
  const sources = (data.sources ?? []) as SourceA[];
  if (!Array.isArray(sources) || sources.some((s) => !s?.label || !/^https:\/\//.test(String(s.url)))) throw new Error(`${f} : sources mal formées`);
  return {
    slug: f.replace(/\.md$/, ""),
    locale,
    fr: data.fr ? String(data.fr) : undefined,
    title: String(data.title),
    description: String(data.description),
    datePublished: iso(data.datePublished, "datePublished", f),
    dateModified: iso(data.dateModified ?? data.datePublished, "dateModified", f),
    status,
    sources,
    outils: ((data.outils ?? []) as unknown[]).map(String),
    faq: ((data.faq ?? []) as { q: string; a: string }[]).map((x) => ({ q: String(x.q), a: String(x.a) })),
    markdown: content.trim(),
    html: marked.parse(content) as string,
    mots: content.split(/\s+/).filter(Boolean).length,
    fichier,
  };
}

/* Tous les articles d'une langue (brouillons compris), du plus récent au plus ancien. */
export function lireDossier(dir: string, locale: LocaleA): Article[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => lireArticle(path.join(dir, f), locale))
    .sort(parDate);
}

export const parDate = (a: Article, b: Article) => b.datePublished.localeCompare(a.datePublished) || b.dateModified.localeCompare(a.dateModified) || a.slug.localeCompare(b.slug);
export const publies = (xs: Article[]) => xs.filter((a) => a.status === "published");
export const brouillonsDe = (xs: Article[]) => xs.filter((a) => a.status === "draft");

/* Jeton d'aperçu : 32 caractères hexadécimaux d'un HMAC-SHA256. Même calcul côté Python (infra/refresh/actualites.py). */
export function jetonApercu(cle: string, locale: LocaleA | "index", slug = ""): string {
  return crypto.createHmac("sha256", cle).update(`apercu|${locale}|${slug}`).digest("hex").slice(0, 32);
}

/* ---- Plan du site, flux, llms ---- */
export type EntreePlan = { url: string; lastModified: string; alternates?: { languages: Record<string, string> } };

export function entreesPlan(fr: Article[], en: Article[], abs: (p: string) => string): EntreePlan[] {
  const pf = publies(fr);
  const pe = publies(en);
  const paire = (a: Article): EntreePlan["alternates"] => {
    const f = a.locale === "fr" ? a : pf.find((x) => x.slug === a.fr);
    const e = a.locale === "en" ? a : pe.find((x) => x.fr === a.slug);
    return f && e ? { languages: { "fr-CH": abs(cheminArticle(f)), en: abs(cheminArticle(e)), "x-default": abs(cheminArticle(f)) } } : undefined;
  };
  const index: EntreePlan[] = [];
  const idx = { languages: { "fr-CH": abs(BASE_ACTUALITES.fr), en: abs(BASE_ACTUALITES.en), "x-default": abs(BASE_ACTUALITES.fr) } };
  if (pf.length) index.push({ url: abs(BASE_ACTUALITES.fr), lastModified: pf.map((a) => a.dateModified).sort().at(-1)!, alternates: pe.length ? idx : undefined });
  if (pe.length) index.push({ url: abs(BASE_ACTUALITES.en), lastModified: pe.map((a) => a.dateModified).sort().at(-1)!, alternates: pf.length ? idx : undefined });
  return [...index, ...[...pf, ...pe].map((a) => ({ url: abs(cheminArticle(a)), lastModified: a.dateModified, alternates: paire(a) }))];
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rfc822 = (d: string) => new Date(`${d}T07:00:00Z`).toUTCString();

/* Flux RSS 2.0 (20 derniers articles publiés), atom:link rel=self. */
export function fluxRss(articles: Article[], locale: LocaleA, abs: (p: string) => string, maintenant = new Date()): string {
  const pub = publies(articles).sort(parDate).slice(0, 20);
  const fr = locale === "fr";
  const self = abs(`${BASE_ACTUALITES[locale]}feed.xml`);
  const items = pub
    .map((a) => {
      const url = abs(cheminArticle(a));
      return `    <item>\n      <title>${xml(a.title)}</title>\n      <link>${url}</link>\n      <guid isPermaLink="true">${url}</guid>\n      <pubDate>${rfc822(a.datePublished)}</pubDate>\n      <description>${xml(a.description)}</description>\n    </item>`;
    })
    .join("\n");
  const derniere = pub[0]?.dateModified;
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${fr ? "Guide Assurance : actualités" : "Guide Assurance: news"}</title>
    <link>${abs(BASE_ACTUALITES[locale])}</link>
    <atom:link href="${self}" rel="self" type="application/rss+xml"/>
    <description>${fr ? "Primes, taux 3a et règles de l’assurance en Suisse romande, datés et sourcés." : "Premiums, pillar 3a rates and insurance rules in French-speaking Switzerland, dated and sourced."}</description>
    <language>${fr ? "fr-CH" : "en"}</language>
    <lastBuildDate>${derniere ? rfc822(derniere) : maintenant.toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

/* Lignes llms.txt (liste) et blocs llms-full.txt (texte intégral) des articles publiés. */
export function lignesLlms(articles: Article[], abs: (p: string) => string): string[] {
  return publies(articles).map((a) => `- [${a.title}](${abs(cheminArticle(a))})${a.locale === "fr" ? " " : ""}: ${a.description} (${a.datePublished})`);
}

export function texteLlms(a: Article, abs: (p: string) => string): string {
  const fr = a.locale === "fr";
  const out = [
    `# ${a.title}`,
    "",
    `${fr ? "Adresse " : "URL"}: ${abs(cheminArticle(a))}`,
    `${fr ? "Publié le" : "Published on"} ${a.datePublished}${a.dateModified !== a.datePublished ? `, ${fr ? "mis à jour le" : "updated on"} ${a.dateModified}` : ""}`,
    "",
    a.markdown.replace(/\]\(\//g, `](${abs("/")}`),
    "",
  ];
  if (a.faq.length) {
    out.push(`## ${fr ? "Questions fréquentes" : "Frequently asked questions"}`, "");
    for (const f of a.faq) out.push(`### ${f.q}`, "", f.a, "");
  }
  out.push("## Sources", "", ...a.sources.map((s) => `- [${s.label}](${s.url})`), "");
  return out.join("\n");
}
export const textesLlms = (articles: Article[], abs: (p: string) => string) => publies(articles).map((a) => texteLlms(a, abs));
