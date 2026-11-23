import { abs } from "@/lib/site";
import { fluxRss, tousLesArticles } from "@/lib/actualites";

export const dynamic = "force-static";

export function GET() {
  return new Response(fluxRss(tousLesArticles("en"), "en", abs), { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
