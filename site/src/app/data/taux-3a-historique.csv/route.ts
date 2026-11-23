import { csvHistorique } from "@/lib/engines/historique-3a";

/* /data/taux-3a-historique.csv : un relevé par date et par compte 3a (src/data/taux-3a-historique.json). */
export const dynamic = "force-static";

export function GET() {
  return new Response(csvHistorique(), { headers: { "content-type": "text/csv; charset=utf-8" } });
}
