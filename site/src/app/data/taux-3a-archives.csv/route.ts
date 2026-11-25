import { csvArchives } from "@/lib/engines/historique-3a";

/* /data/taux-3a-archives.csv : taux 3a par banque lus dans les copies archivées (Internet Archive) des pages des
   banques (src/data/taux-3a-archives.json, copie de data/sources/), points ambigus exclus. Licence CC BY 4.0. */
export const dynamic = "force-static";

export function GET() {
  return new Response(csvArchives(), { headers: { "content-type": "text/csv; charset=utf-8" } });
}
