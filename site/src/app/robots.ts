import type { MetadataRoute } from "next";
import { INDEXABLE, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

/* Tant que INDEXABLE est faux (src/lib/site.ts), l'exploration est bloquée ; les pages portent aussi noindex.
   Ouvert (Sam, 22.11.2026 : « Go public ») : moteurs de recherche et robots d'IA explicitement accueillis (GEO),
   formulaires de demande exclus de l'exploration. */
const IA = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "MistralAI-User", "CCBot"];
const FERME = ["/demande/", "/en/request/", "/demande-envoyee/", "/en/request-sent/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: INDEXABLE
      ? [{ userAgent: "*", allow: "/", disallow: FERME }, { userAgent: IA, allow: "/", disallow: FERME }]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
