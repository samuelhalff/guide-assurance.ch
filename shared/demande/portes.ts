// Portes d'entrée du formulaire de demande et leurs étapes (FR/EN).
// Importé par le site (formulaire) et par leads (validation, affichage).
// Aucune dépendance : données pures.

export const PORTES = ["sante", "nouveaux-arrivants", "prevoyance", "entreprises", "frontaliers", "rappel"] as const;
export type Porte = (typeof PORTES)[number];

/** Porte « rappel » : formulaire court d'un seul écran (nom, téléphone, sujet facultatif, moment, NPA facultatif).
 *  Pas d'écran profil ni de santé. Le formulaire en trois écrans ne la propose pas. */
export const PORTE_RAPPEL = "rappel" as const satisfies Porte;
export const PORTES_FORMULAIRE = PORTES.filter((p) => p !== PORTE_RAPPEL) as Exclude<Porte, typeof PORTE_RAPPEL>[];
/** Sujet par défaut du formulaire court. */
export const RAPPEL_SUJET_DEFAUT = "inconnu";

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

type L = Record<Locale, string>;

export interface Choix {
  code: string;
  label: L;
}

export interface PorteDef {
  code: Porte;
  /** Libellé court (tableau, filtres). */
  label: L;
  /** Complément du texte de consentement : « … vous contactera au sujet de {{PORTE}} ». */
  sujet: L;
  /** Écran 1 : puces propres à la porte (choix multiple). */
  besoin: { question: L; choix: Choix[] };
  /** Puces facultatives d'intérêt santé (hospitalisation, dentaire) sur l'écran 1 : porte santé seulement. */
  etapeSante: boolean;
}

export const PORTES_DEF: Record<Porte, PorteDef> = {
  sante: {
    code: "sante",
    label: { fr: "Santé", en: "Health" },
    sujet: { fr: "votre assurance maladie", en: "your health insurance" },
    besoin: {
      question: { fr: "Sur quoi porte votre demande ?", en: "What is your request about?" },
      choix: [
        { code: "lamal", label: { fr: "Assurance de base (LAMal)", en: "Basic insurance (LAMal)" } },
        { code: "complementaires", label: { fr: "Assurances complémentaires", en: "Supplementary insurance" } },
      ],
    },
    etapeSante: true,
  },
  "nouveaux-arrivants": {
    code: "nouveaux-arrivants",
    label: { fr: "Nouveaux arrivants", en: "New arrivals" },
    sujet: { fr: "vos assurances à l'arrivée en Suisse", en: "your insurance on arrival in Switzerland" },
    besoin: {
      question: { fr: "Que devez-vous mettre en place ?", en: "What do you need to set up?" },
      choix: [
        { code: "lamal", label: { fr: "Assurance maladie", en: "Health insurance" } },
        { code: "rc-menage", label: { fr: "RC privée et ménage", en: "Liability and household" } },
        { code: "auto", label: { fr: "Assurance auto", en: "Car insurance" } },
        { code: "prevoyance", label: { fr: "Prévoyance", en: "Pension" } },
      ],
    },
    etapeSante: false,
  },
  prevoyance: {
    code: "prevoyance",
    label: { fr: "Prévoyance", en: "Pension" },
    sujet: { fr: "votre prévoyance", en: "your pension and protection" },
    besoin: {
      question: { fr: "Qu'aimeriez-vous examiner ?", en: "What would you like to look at?" },
      choix: [
        { code: "3a", label: { fr: "3e pilier (3a)", en: "Pillar 3a" } },
        { code: "deces", label: { fr: "Assurance décès", en: "Life cover" } },
        { code: "invalidite", label: { fr: "Incapacité de gain", en: "Disability cover" } },
      ],
    },
    etapeSante: false,
  },
  entreprises: {
    code: "entreprises",
    label: { fr: "Entreprises", en: "Businesses" },
    sujet: { fr: "les assurances de votre entreprise", en: "your business insurance" },
    besoin: {
      question: { fr: "Quelles couvertures concernent votre entreprise ?", en: "Which covers concern your business?" },
      choix: [
        { code: "lpp", label: { fr: "Prévoyance professionnelle (LPP)", en: "Occupational pension (BVG/LPP)" } },
        { code: "laa", label: { fr: "Accidents (LAA)", en: "Accident (UVG/LAA)" } },
        { code: "ijm", label: { fr: "Perte de gain maladie (IJM)", en: "Sickness daily allowance" } },
        { code: "rc-pro", label: { fr: "RC professionnelle", en: "Professional liability" } },
      ],
    },
    etapeSante: false,
  },
  frontaliers: {
    code: "frontaliers",
    label: { fr: "Frontaliers", en: "Cross-border" },
    sujet: { fr: "votre assurance de frontalier", en: "your cross-border insurance" },
    besoin: {
      question: { fr: "Quelle est votre situation ?", en: "What is your situation?" },
      choix: [
        { code: "nouvel-emploi", label: { fr: "Je commence un emploi", en: "I am starting a job" } },
        { code: "changement", label: { fr: "Je veux revoir mon assurance", en: "I want to review my insurance" } },
        { code: "autre", label: { fr: "Autre question", en: "Other question" } },
      ],
    },
    etapeSante: false,
  },
  rappel: {
    code: "rappel",
    label: { fr: "Rappel demandé", en: "Call-back request" },
    sujet: { fr: "vos assurances", en: "your insurance" },
    besoin: {
      question: { fr: "C'est à quel sujet ?", en: "What is it about?" },
      choix: [
        { code: "inconnu", label: { fr: "Je ne sais pas encore", en: "I'm not sure yet" } },
        { code: "sante", label: { fr: "Assurance maladie", en: "Health insurance" } },
        { code: "frontaliers", label: { fr: "Frontalier", en: "Cross-border worker" } },
        { code: "nouveaux-arrivants", label: { fr: "Arrivée en Suisse", en: "Moving to Switzerland" } },
        { code: "prevoyance", label: { fr: "Prévoyance, 3e pilier", en: "Pension, pillar 3a" } },
        { code: "entreprises", label: { fr: "Entreprise", en: "Business" } },
        { code: "autre", label: { fr: "Autre (auto, ménage, RC…)", en: "Other (car, household, liability…)" } },
      ],
    },
    etapeSante: false,
  },
};

/** Écran 2 : « J'habite en Suisse » (oui par défaut). Non → écran d'information, aucune demande n'est créée. */
export const RESIDENCE = {
  question: { fr: "J'habite en Suisse", en: "I live in Switzerland" } as L,
  francaisInfo: {
    fr: "Nous ne pouvons pas encore traiter les demandes des personnes qui habitent en France. Nos guides et le simulateur frontalier restent à votre disposition.",
    en: "We cannot yet handle requests from people living in France. Our guides and the cross-border calculator remain available.",
  } as L,
};

/** Intérêt santé (écran 1, porte santé, facultatif). Intérêt seulement : pas de question grossesse, pas de champ libre.
 *  Choisir une puce fait apparaître la case de consentement santé séparée sur l'écran 3. */
export const SANTE_CHOIX = ["hospitalisation", "dentaire"] as const;
export type SanteChoix = (typeof SANTE_CHOIX)[number];
export const SANTE_LABELS: Record<SanteChoix, L> = {
  hospitalisation: { fr: "Hospitalisation (division privée ou semi-privée)", en: "Hospital (private or semi-private ward)" },
  dentaire: { fr: "Soins dentaires", en: "Dental care" },
};

/** Créneau de rappel (écran 3, facultatif). */
export const CRENEAUX = ["matin", "midi", "apres-midi", "soir"] as const;
export type Creneau = (typeof CRENEAUX)[number];
export const CRENEAU_LABELS: Record<Creneau, L> = {
  matin: { fr: "Matin (de 8 h à 11 h)", en: "Morning (8 to 11 am)" },
  midi: { fr: "Midi (de 11 h à 14 h)", en: "Midday (11 am to 2 pm)" },
  "apres-midi": { fr: "Après-midi (de 14 h à 17 h)", en: "Afternoon (2 to 5 pm)" },
  soir: { fr: "Fin de journée (de 17 h à 19 h)", en: "Early evening (5 to 7 pm)" },
};

/** Nombre de personnes : 1, 2, 3, 4+ (4 = « 4 ou plus »). */
export const PERSONNES = [1, 2, 3, 4] as const;
export const PERSONNES_LABELS: Record<(typeof PERSONNES)[number], string> = { 1: "1", 2: "2", 3: "3", 4: "4+" };

/** Trois écrans : besoin (puces), profil (NPA, année, personnes, résidence), contact + envoi. */
export const ETAPES: Record<Locale, string[]> = {
  fr: ["Votre besoin", "Votre profil", "Vos coordonnées"],
  en: ["Your need", "Your profile", "Your details"],
};

export const SUBMIT_LABEL: L = { fr: "Envoyer ma demande", en: "Send my request" };

/**
 * Préremplissage depuis les outils (simulateur, lettre) : sessionStorage seulement, jamais l'URL.
 * Contenu admis : { porte?, besoin?, npa?, birthYear?, householdSize? } — aucune coordonnée.
 */
export const PREFILL_STORAGE_KEY = "ga-demande-prefill";

/**
 * Mesure du tunnel : PostHog seulement (jamais GTM), sans aucune valeur saisie.
 * demande_ouverte {porte} · demande_etape {n, porte} · demande_envoyee {porte}
 * Formulaire court : porte = "rappel" ; sur le site, rappel_ouvert {emplacement} au clic sur un appel « Être rappelé ».
 */
export const FUNNEL_EVENTS = {
  ouverte: "demande_ouverte",
  etape: "demande_etape",
  envoyee: "demande_envoyee",
} as const;

export function codesBesoin(porte: Porte): string[] {
  return PORTES_DEF[porte].besoin.choix.map((c) => c.code);
}
