import { jsonArchives } from "@/lib/engines/historique-3a";

/* /data/taux-3a-archives.json : points des banques affichées sur la page de l'historique 3a, chargés seulement quand
   le lecteur déplie la liste d'une banque (la page reste légère). Mêmes points que /data/taux-3a-archives.csv. */
export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(jsonArchives()), { headers: { "content-type": "application/json; charset=utf-8" } });
}
