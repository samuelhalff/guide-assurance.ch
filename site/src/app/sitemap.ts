import type { MetadataRoute } from "next";
import { abs } from "@/lib/site";
import { DATE_PAGE, DATE_PAGE_DONNEES } from "@/lib/donnees";
import { OUTILS, PAGES_DONNEES, SLUG_CANTON_3A } from "@/lib/nav";
import { PAGES_FR_EN } from "@/lib/i18n";
import { autreLangue, dateIndexGuides, toutesLesPages } from "@/lib/content/pages";
import { pagesIdees } from "@/lib/pages-idees";
import { entreesPlan, tousLesArticles } from "@/lib/actualites";

export const dynamic = "force-static";

/* Plan du site : <loc>, <lastmod> et paires de langues seulement, sans priority ni changefreq (Google les ignore,
   spec SEO §2.1). lastmod = date du dernier changement de fond de la page : texte (DATE_TEXTE) ou données
   (lib/donnees.ts) pour les pages TSX, champ `updated` pour les guides Markdown. Jamais la date du build. */
/* Pages TSX publiées. Leur équivalent anglais vient de PAGES_FR_EN (src/lib/i18n.ts) ; les pages Markdown
   (content/fr et content/en) sont ajoutées automatiquement, avec leur paire de langues. */
const PAGES: { path: string; lastmod: string; lastmodEn?: string }[] = [
  { path: "/", lastmod: DATE_PAGE.accueil },
  { path: OUTILS.simulateur, lastmod: DATE_PAGE.simulateur },
  { path: OUTILS.lettre, lastmod: DATE_PAGE.lettre },
  { path: OUTILS.comparateur, lastmod: DATE_PAGE.comparateur },
  { path: OUTILS.taux3a, lastmod: DATE_PAGE.taux3a },
  { path: OUTILS.impot3a, lastmod: DATE_PAGE.impot3a },
  { path: "/guides/", lastmod: dateIndexGuides("fr"), lastmodEn: dateIndexGuides("en") },
  { path: PAGES_DONNEES.chiffres, lastmod: DATE_PAGE_DONNEES.chiffres },
  { path: PAGES_DONNEES.regions, lastmod: DATE_PAGE_DONNEES.regions },
  { path: PAGES_DONNEES.historique3a, lastmod: DATE_PAGE_DONNEES.historique3a },
  { path: PAGES_DONNEES.communes3a, lastmod: DATE_PAGE_DONNEES.communes3a },
  ...Object.values(SLUG_CANTON_3A.fr).map((s) => ({ path: `${PAGES_DONNEES.communes3a}${s}/`, lastmod: DATE_PAGE_DONNEES.communes3a })),
];

const paire = (fr?: string, en?: string) =>
  fr && en ? { languages: { "fr-CH": abs(fr), en: abs(en), "x-default": abs(fr) } } : undefined;

export default function sitemap(): MetadataRoute.Sitemap {
  const fr = PAGES.map((p) => ({ url: abs(p.path), lastModified: p.lastmod, alternates: paire(p.path, PAGES_FR_EN[p.path]) }));
  const contenusFr = toutesLesPages("fr").map((p) => ({
    url: abs(p.slug),
    lastModified: p.updated,
    alternates: paire(p.slug, autreLangue(p.slug, "fr")),
  }));
  const en = PAGES.filter((p) => PAGES_FR_EN[p.path]).map((p) => ({
    url: abs(PAGES_FR_EN[p.path]),
    lastModified: p.lastmodEn ?? p.lastmod,
    alternates: paire(p.path, PAGES_FR_EN[p.path]),
  }));
  const contenusEn = toutesLesPages("en").map((p) => ({
    url: abs(p.slug),
    lastModified: p.updated,
    alternates: paire(autreLangue(p.slug, "en"), p.slug),
  }));
  /* Pages des idées 1, 4, 7 et 8 (lib/pages-idees.ts), chacune avec sa paire FR/EN et la date de ses données. */
  const idees = pagesIdees().flatMap((p) => [
    { url: abs(p.fr), lastModified: p.lastmod, alternates: paire(p.fr, p.en) },
    { url: abs(p.en), lastModified: p.lastmod, alternates: paire(p.fr, p.en) },
  ]);
  /* Actualités publiées seulement (les brouillons n'existent qu'en aperçu), liste comprise dès le premier article. */
  const actualites = entreesPlan(tousLesArticles("fr"), tousLesArticles("en"), abs);
  return [...fr, ...contenusFr, ...en, ...contenusEn, ...idees, ...actualites];
}
