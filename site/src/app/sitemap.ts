import type { MetadataRoute } from "next";
import { MAJ_ISO, abs } from "@/lib/site";
import { DATE_PAGE } from "@/lib/donnees";
import { OUTILS } from "@/lib/nav";
import { PAGES_FR_EN } from "@/lib/i18n";
import { autreLangue, toutesLesPages } from "@/lib/content/pages";

export const dynamic = "force-static";

/* Pages TSX publiées. Leur équivalent anglais vient de PAGES_FR_EN (src/lib/i18n.ts) ; les pages Markdown
   (content/fr et content/en) sont ajoutées automatiquement, avec leur paire de langues. */
/* lastmod : date des données pour les pages qui en dépendent (lib/donnees.ts), sinon MAJ_ISO. */
const PAGES: { path: string; priority: number; lastmod: string }[] = [
  { path: "/", priority: 1, lastmod: DATE_PAGE.accueil },
  { path: OUTILS.simulateur, priority: 0.9, lastmod: MAJ_ISO },
  { path: OUTILS.lettre, priority: 0.9, lastmod: MAJ_ISO },
  { path: OUTILS.comparateur, priority: 0.9, lastmod: DATE_PAGE.comparateur },
  { path: OUTILS.taux3a, priority: 0.9, lastmod: DATE_PAGE.taux3a },
  { path: OUTILS.impot3a, priority: 0.9, lastmod: DATE_PAGE.impot3a },
  { path: "/guides/", priority: 0.7, lastmod: MAJ_ISO },
];

const paire = (fr?: string, en?: string) =>
  fr && en ? { languages: { "fr-CH": abs(fr), en: abs(en), "x-default": abs(fr) } } : undefined;

export default function sitemap(): MetadataRoute.Sitemap {
  const fr = PAGES.map((p) => ({ url: abs(p.path), lastModified: p.lastmod, priority: p.priority, alternates: paire(p.path, PAGES_FR_EN[p.path]) }));
  const contenusFr = toutesLesPages("fr").map((p) => ({
    url: abs(p.slug),
    lastModified: p.updated,
    priority: p.rubrique === "legal" ? 0.3 : 0.8,
    alternates: paire(p.slug, autreLangue(p.slug, "fr")),
  }));
  const en = PAGES.filter((p) => PAGES_FR_EN[p.path]).map((p) => ({
    url: abs(PAGES_FR_EN[p.path]),
    lastModified: p.lastmod,
    priority: Math.round(p.priority * 8) / 10,
    alternates: paire(p.path, PAGES_FR_EN[p.path]),
  }));
  const contenusEn = toutesLesPages("en").map((p) => ({
    url: abs(p.slug),
    lastModified: p.updated,
    priority: p.rubrique === "legal" ? 0.2 : 0.6,
    alternates: paire(autreLangue(p.slug, "en"), p.slug),
  }));
  return [...fr, ...contenusFr, ...en, ...contenusEn];
}
