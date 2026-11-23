/* Bande de confiance : calculs purs, sans alias d'import (testés par tests/confiance.test.mts).
   Aucun chiffre écrit à la main : tout se compte dans les fichiers de données au moment du build.
   Avis clients : rien ne s'affiche, et aucune note n'est émise en JSON-LD, tant que l'adresse publique des avis
   (NEXT_PUBLIC_TRUSTPILOT_URL) et des chiffres réels (src/data/avis.json) ne sont pas renseignés. */

type Prime = { a: (number | null)[]; s: (number | null)[] };
export type CantonPrimes = { primes: Record<string, Partial<Record<string, Record<string, Prime>>>> };

/* Offres LAMal de l'année : une offre = un produit d'un assureur dans une région de primes. Profil de référence
   adulte, franchise 300, avec accident (celui de l'accueil) ; une case vide (produit absent de la région) ne compte pas. */
export function compterOffres(cantons: CantonPrimes[]): { offres: number; regions: number } {
  let offres = 0;
  let regions = 0;
  for (const c of cantons) {
    for (const r of Object.values(c.primes)) {
      const a = r.adulte?.["300"]?.a;
      if (!a) continue;
      regions++;
      offres += a.filter((x) => x !== null).length;
    }
  }
  return { offres, regions };
}

export type Avis = {
  source: string | null;
  url: string | null;
  note: number | null; // sur 5
  nombre: number | null;
  date: string | null; // AAAA-MM-JJ, jour du relevé
};
export type AvisValides = { source: string; url: string; note: number; nombre: number; date: string };

/* Seuil unique (Sam, 23.11.2026) : sous 10 avis, ni étoiles, ni note, ni AggregateRating en JSON-LD. */
export const NOMBRE_MIN_AVIS = 10;

/* Les avis ne s'affichent que si l'adresse publique est configurée, que le fichier donne des chiffres complets et
   plausibles, et que le seuil est atteint. L'adresse du fichier, si elle est remplie, doit être la même. */
/* Même page d'avis : adresse identique, ou même chemin sur deux sous-domaines de trustpilot.com (www, fr…). */
function memePage(a: string, b: string): boolean {
  if (a === b) return true;
  try {
    const x = new URL(a);
    const y = new URL(b);
    const tp = (h: string) => /(^|\.)trustpilot\.com$/.test(h);
    return tp(x.hostname) && tp(y.hostname) && x.pathname.replace(/\/$/, "") === y.pathname.replace(/\/$/, "");
  } catch {
    return false;
  }
}

export function avisAffichables(a: Avis, urlEnv: string | undefined): AvisValides | null {
  const url = (urlEnv ?? "").trim();
  if (!/^https:\/\/\S+$/.test(url)) return null;
  if (a.url && !memePage(a.url, url)) return null;
  if (!a.source || a.note === null || a.nombre === null || !a.date) return null;
  if (!(a.note >= 1 && a.note <= 5) || !Number.isInteger(a.nombre) || a.nombre < 1) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date)) return null;
  if (a.nombre < NOMBRE_MIN_AVIS) return null;
  return { source: a.source, url, note: a.note, nombre: a.nombre, date: a.date };
}

/* Nœud JSON-LD de la note, rattaché à l'organisation ; null sans avis affichables (même seuil). */
export function avisJsonLd(v: AvisValides | null, orgId: string) {
  if (!v || v.nombre < NOMBRE_MIN_AVIS) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": orgId,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: v.note,
      bestRating: 5,
      worstRating: 1,
      ratingCount: v.nombre,
      url: v.url,
    },
  };
}
