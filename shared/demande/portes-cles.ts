// Copie légère de l'essentiel de portes.ts (portes d'entrée, porte « rappel », clé de préremplissage). Le site (en-tête, lien
// « Être rappelé », pages de guide) n'importe que ceci, sans les définitions complètes des écrans (portes.ts, une vingtaine
// de Ko compressés) : un morceau de moins à télécharger sur chaque page. portes.ts reste la source pour le tunnel et pour
// leads ; site/tests/portes-cles.test.mts vérifie que les deux fichiers disent la même chose.

export const PORTES = [
  "sante",
  "nouveaux-arrivants",
  "prevoyance",
  "entreprises",
  "frontaliers",
  "menage-rc",
  "protection-juridique",
  "auto",
  "rappel",
] as const;
export type Porte = (typeof PORTES)[number];

/** Porte « rappel » : formulaire court d'un seul écran (nom, téléphone, sujet facultatif, moment, NPA facultatif).
 *  Pas d'écran profil ni de santé. Le formulaire en trois écrans ne la propose pas. */
export const PORTE_RAPPEL = "rappel" as const satisfies Porte;
export const PORTES_FORMULAIRE = PORTES.filter((p) => p !== PORTE_RAPPEL) as Exclude<Porte, typeof PORTE_RAPPEL>[];
/** Sujet par défaut du formulaire court. */
export const RAPPEL_SUJET_DEFAUT = "inconnu";

/**
 * Préremplissage depuis les outils (simulateur, lettre) : sessionStorage seulement, jamais l'URL.
 * Contenu admis : { porte?, besoin?, npa?, birthYear?, householdSize? } — aucune coordonnée.
 */
export const PREFILL_STORAGE_KEY = "ga-demande-prefill";
