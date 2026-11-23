import { csvRegions } from "@/lib/engines/regions-primes";

/* /data/primes-2027-regions.csv : statistiques des primes LAMal 2027 par région de prime et profil type. */
export const dynamic = "force-static";

export function GET() {
  return new Response(csvRegions(), { headers: { "content-type": "text/csv; charset=utf-8" } });
}
