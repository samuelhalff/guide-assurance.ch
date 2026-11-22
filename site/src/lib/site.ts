/* Réglages du site. INDEXABLE est le seul interrupteur de l'indexation :
   à false, toutes les pages portent noindex et robots.txt bloque l'exploration. */
export const INDEXABLE = true;

export const SITE_URL = "https://guide-assurance.ch";
export const SITE_NAME = "Guide Assurance";

/* Date des données affichées (primes OFSP 2027, mise à jour des pages). */
export const MAJ_ISO = "2026-11-22";

export const abs = (path: string) => `${SITE_URL}${path}`;
