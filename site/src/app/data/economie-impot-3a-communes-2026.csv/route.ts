import { csvCommunes3a } from "@/lib/engines/communes-3a";

/* /data/economie-impot-3a-communes-2026.csv : économie d'impôt 3a par commune, profil type des pages par commune. */
export const dynamic = "force-static";

export function GET() {
  return new Response(csvCommunes3a(), { headers: { "content-type": "text/csv; charset=utf-8" } });
}
