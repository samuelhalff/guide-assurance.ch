/* Données et libellés de la page « Primes UE/AELE/UK » (OFSP, Prämien_EU, publiées sur priminfo.admin.ch). */
import D from "@/data/primes-eu-2027.json";
import type { DonneesUe } from "@/lib/engines/primes-ue";

export const DONNEES_UE = D as DonneesUe;
/* Date de lecture de la source (la page de l'OFSP et le fichier ouvert ont les mêmes montants). */
export const DATE_PRIMES_UE = "2026-11-24";

/* Pays voisins d'abord (ordre fixe), puis les autres par ordre alphabétique de la langue de la page. */
export const VOISINS = ["FR", "DE", "IT", "AT"] as const;

export const PAYS_UE: Record<string, { fr: string; en: string }> = {
  AT: { fr: "Autriche", en: "Austria" },
  BE: { fr: "Belgique", en: "Belgium" },
  BG: { fr: "Bulgarie", en: "Bulgaria" },
  CY: { fr: "Chypre", en: "Cyprus" },
  CZ: { fr: "Tchéquie", en: "Czechia" },
  DE: { fr: "Allemagne", en: "Germany" },
  DK: { fr: "Danemark", en: "Denmark" },
  EE: { fr: "Estonie", en: "Estonia" },
  ES: { fr: "Espagne", en: "Spain" },
  FI: { fr: "Finlande", en: "Finland" },
  FR: { fr: "France", en: "France" },
  GR: { fr: "Grèce", en: "Greece" },
  HR: { fr: "Croatie", en: "Croatia" },
  HU: { fr: "Hongrie", en: "Hungary" },
  IE: { fr: "Irlande", en: "Ireland" },
  IS: { fr: "Islande", en: "Iceland" },
  IT: { fr: "Italie", en: "Italy" },
  LT: { fr: "Lituanie", en: "Lithuania" },
  LU: { fr: "Luxembourg", en: "Luxembourg" },
  LV: { fr: "Lettonie", en: "Latvia" },
  MT: { fr: "Malte", en: "Malta" },
  NL: { fr: "Pays-Bas", en: "Netherlands" },
  NO: { fr: "Norvège", en: "Norway" },
  PL: { fr: "Pologne", en: "Poland" },
  PT: { fr: "Portugal", en: "Portugal" },
  RO: { fr: "Roumanie", en: "Romania" },
  SE: { fr: "Suède", en: "Sweden" },
  SI: { fr: "Slovénie", en: "Slovenia" },
  SK: { fr: "Slovaquie", en: "Slovakia" },
  UK: { fr: "Royaume-Uni", en: "United Kingdom" },
};

export function listePays(locale: "fr" | "en"): { code: string; nom: string }[] {
  const tous = Object.keys(DONNEES_UE.pays).map((code) => ({ code, nom: PAYS_UE[code][locale] }));
  const voisins = VOISINS.map((c) => tous.find((p) => p.code === c)!);
  const autres = tous.filter((p) => !(VOISINS as readonly string[]).includes(p.code)).sort((a, b) => a.nom.localeCompare(b.nom, locale));
  return [...voisins, ...autres];
}
