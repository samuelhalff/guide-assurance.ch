/* Dates des jeux de données, lues dans les fichiers eux-mêmes : un relevé automatique (infra/refresh) qui
   réécrit un fichier déplace la date des pages qui en dépendent (dateModified, « Mis à jour le… », sitemap,
   llms.txt) sans retouche à la main. Les guides Markdown gardent leur date `updated`. */
import { MAJ_ISO } from "@/lib/site";
import { DATE_PRIMES } from "@/lib/date-primes";
import IMPOTS from "@/data/impots-2026.json";
import { RELEVE_LE } from "@/lib/taux3a";

export const maxIso = (...d: string[]) => d.reduce((a, b) => (b > a ? b : a));

export { DATE_PRIMES };
/* Taux 3a (relevé hebdomadaire). */
export const DATE_TAUX_3A = RELEVE_LE;
/* Barèmes d'impôt (calculateur d'économie d'impôt 3a). */
export const DATE_IMPOTS = IMPOTS.lu_le;

/* Date de modification d'une page outil : la plus récente entre son texte (MAJ_ISO) et ses données. */
export const DATE_PAGE = {
  comparateur: maxIso(MAJ_ISO, DATE_PRIMES),
  taux3a: maxIso(MAJ_ISO, DATE_TAUX_3A),
  impot3a: maxIso(MAJ_ISO, DATE_IMPOTS),
  /* L'accueil affiche les primes moyennes et les taux 3a. */
  accueil: maxIso(MAJ_ISO, DATE_PRIMES, DATE_TAUX_3A),
} as const;
