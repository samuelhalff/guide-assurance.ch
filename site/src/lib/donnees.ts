/* Dates des jeux de données, lues dans les fichiers eux-mêmes : un relevé automatique (infra/refresh) qui
   réécrit un fichier déplace la date des pages qui en dépendent (dateModified, « Mis à jour le… », sitemap,
   llms.txt) sans retouche à la main. Les guides Markdown gardent leur date `updated`. */
import { DATE_PRIMES } from "@/lib/date-primes";
import IMPOTS from "@/data/impots-2026.json";
import { RELEVE_LE } from "@/lib/taux3a";
import H3A from "@/data/taux-3a-historique.json";

export const maxIso = (...d: string[]) => d.reduce((a, b) => (b > a ? b : a));

export { DATE_PRIMES };
/* Taux 3a (relevé hebdomadaire). */
export const DATE_TAUX_3A = RELEVE_LE;
/* Barèmes d'impôt (calculateur d'économie d'impôt 3a). */
export const DATE_IMPOTS = IMPOTS.lu_le;

/* Date du dernier changement de fond du texte de chaque page TSX (règles, chiffres, questions ; pas une retouche de
   forme ni un bouton) : à avancer à la main quand ce texte change. Combinée à la date des données, elle donne
   dateModified, « Mis à jour le… », le sitemap et les images de partage. Les guides Markdown ont leur `updated`. */
export const DATE_TEXTE = {
  accueil: "2026-11-23", // questions fréquentes ajoutées
  comparateur: "2026-11-22",
  simulateur: "2026-11-22",
  lettre: "2026-11-22",
  taux3a: "2026-11-22",
  impot3a: "2026-11-23", // canton du Jura ajouté
  outils: "2026-11-23", // page « Outils et chiffres » créée ; calculateur ménage et garanties PJ ajoutés
  sommeMenage: "2026-11-23", // calculateur de la somme d'assurance ménage créé
  garantiesPj: "2026-11-23", // tableau des garanties de protection juridique créé (CGA lues le 23.11.2026)
  guides: "2026-11-23", // questions fréquentes ajoutées ; la liste suit aussi la date des guides (lib/content/pages.ts)
} as const;

/* Date de modification d'une page outil : la plus récente entre son texte et ses données. */
export const DATE_PAGE = {
  comparateur: maxIso(DATE_TEXTE.comparateur, DATE_PRIMES),
  taux3a: maxIso(DATE_TEXTE.taux3a, DATE_TAUX_3A),
  impot3a: maxIso(DATE_TEXTE.impot3a, DATE_IMPOTS),
  simulateur: DATE_TEXTE.simulateur,
  lettre: DATE_TEXTE.lettre,
  sommeMenage: DATE_TEXTE.sommeMenage,
  garantiesPj: DATE_TEXTE.garantiesPj,
  /* L'accueil affiche les primes moyennes et les taux 3a. */
  accueil: maxIso(DATE_TEXTE.accueil, DATE_PRIMES, DATE_TAUX_3A),
} as const;

/* Pages de données (régions de primes, chiffres clés, historique 3a, économie d'impôt par commune). */
const DERNIER_RELEVE_3A = H3A.releves.map((r) => r.date).reduce((a, b) => (b > a ? b : a));
export const DATE_HISTORIQUE_3A = DERNIER_RELEVE_3A;
export const DATE_PAGE_DONNEES = {
  regions: maxIso("2026-11-23", DATE_PRIMES),
  historique3a: maxIso("2026-11-23", DERNIER_RELEVE_3A),
  communes3a: maxIso("2026-11-23", DATE_IMPOTS),
  chiffres: maxIso("2026-11-23", DATE_PRIMES, DATE_TAUX_3A, DATE_IMPOTS),
} as const;
/* « Outils et chiffres » : reprend les chiffres des outils et des pages de données. */
export const DATE_PAGE_OUTILS = maxIso(DATE_TEXTE.outils, DATE_PAGE.accueil, DATE_PAGE_DONNEES.chiffres, DATE_PAGE_DONNEES.historique3a);
/* Licence des agrégats publiés par Guide Assurance (CSV des pages de données, dépôt public) : CC BY 4.0, en
   citant les sources (OFSP, pages des banques, administrations fiscales). */
export const LICENCE_DONNEES = "https://creativecommons.org/licenses/by/4.0/";
