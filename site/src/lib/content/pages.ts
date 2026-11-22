import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import { remplacementsMesure } from "@/lib/content/mesure";
import { PAGES_EN_FR, PAGES_FR_EN, type Locale } from "@/lib/i18n";
import { lireLanding, type Landing } from "@/lib/landing";

/* Pages rédigées en Markdown (content/fr/*.md), lues au build. Le texte vient de research/06-produits.md. */
export type Rubrique = "particuliers" | "entreprises" | "situations" | "legal";
export type PageContenu = {
  slug: string; // "/assurance-maladie/"
  fr?: string; // pages anglaises : adresse de la page française
  locale: Locale;
  title: string;
  description: string;
  h1: string;
  rubrique: Rubrique;
  updated: string; // ISO
  sources: { label: string; url: string }[];
  outils: string[];
  faq: { q: string; a: string }[];
  landing?: Landing; // page produit en landing (bloc de tête), voir lib/landing.ts
  html: string;
  markdown: string; // texte source (après remplacements), pour llms-full.txt
  mots: number;
};

const DIR = (locale: Locale) => path.join(process.cwd(), "content", locale);
/* Coordonnées de contact : remplacées ici, une seule fois, quand la boîte existe. */
const REMPLACEMENTS: Record<string, string> = { "{{CONTACT_EMAIL}}": process.env.CONTACT_EMAIL ?? "contact@guide-assurance.ch" };

marked.use({ gfm: true });

/* Ordre de lecture des listes : de l'assurance la plus courante à la plus spécialisée. */
const ORDRE = [
  "/assurance-maladie/", "/assurance-maladie/primes/", "/complementaire-sante/", "/assurance-accident/", "/3e-pilier/",
  "/assurance-menage-rc/", "/assurance-batiment/", "/assurance-auto/", "/protection-juridique/", "/assurance-voyage/",
  "/assurance-animaux/", "/cyber-prive/", "/frontaliers/", "/nouveaux-arrivants/", "/entreprises/", "/entreprises/lpp/",
  "/entreprises/laa/", "/entreprises/perte-de-gain-maladie/", "/entreprises/rc-professionnelle/", "/entreprises/assurance-choses/",
  "/entreprises/cyber/",
];
const rang = (slug: string) => (ORDRE.indexOf(slug) + 1 || 999);

const cache: Partial<Record<Locale, PageContenu[]>> = {};
/* Pages d'une langue. Les pages anglaises (content/en) suivent l'ordre de leur page française. */
export function toutesLesPages(locale: Locale = "fr"): PageContenu[] {
  if (cache[locale]) return cache[locale];
  const pages = fs
    .readdirSync(DIR(locale))
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      let brut = fs.readFileSync(path.join(DIR(locale), f), "utf8");
      for (const [k, v] of Object.entries({ ...REMPLACEMENTS, ...remplacementsMesure(locale) })) brut = brut.split(k).join(v);
      const { data, content } = matter(brut);
      const updated = data.updated instanceof Date ? data.updated.toISOString().slice(0, 10) : String(data.updated);
      return {
        slug: String(data.slug),
        fr: data.fr ? String(data.fr) : undefined,
        locale,
        title: String(data.title),
        description: String(data.description),
        h1: String(data.h1),
        rubrique: data.rubrique as Rubrique,
        updated,
        sources: (data.sources ?? []) as PageContenu["sources"],
        outils: (data.outils ?? []) as string[],
        faq: (data.faq ?? []) as PageContenu["faq"],
        landing: lireLanding(data.landing),
        html: marked.parse(content) as string,
        markdown: content.trim(),
        mots: content.split(/\s+/).filter(Boolean).length,
      };
    })
    .sort((a, b) => rang(a.fr ?? a.slug) - rang(b.fr ?? b.slug) || a.slug.localeCompare(b.slug, locale));
  cache[locale] = pages;
  return pages;
}

export const pageParSlug = (slug: string, locale: Locale = "fr") => toutesLesPages(locale).find((p) => p.slug === slug);

/* Équivalent d'une page Markdown dans l'autre langue (undefined si elle n'existe pas). */
export function equivalent(slug: string, locale: Locale): string | undefined {
  if (locale === "en") {
    const fr = pageParSlug(slug, "en")?.fr;
    return fr && pageParSlug(fr, "fr") ? fr : undefined;
  }
  return toutesLesPages("en").find((p) => p.fr === slug)?.slug;
}
export const lecture = (mots: number) => `${Math.max(2, Math.round(mots / 200))} min`;

/* Adresse de la même page dans l'autre langue : pages TSX (PAGES_FR_EN) puis pages Markdown. */
export function autreLangue(path: string, locale: Locale): string | undefined {
  const fixe = locale === "fr" ? PAGES_FR_EN[path] : PAGES_EN_FR[path];
  return fixe ?? equivalent(path, locale);
}
