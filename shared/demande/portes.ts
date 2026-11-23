// Portes d'entrée du formulaire de demande et leurs étapes (FR/EN).
// Importé par le site (formulaire) et par leads (validation, affichage).
// Aucune dépendance : données pures.

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
  /** Une seule puce de besoin (boutons radio) au lieu d'un choix multiple. */
  besoinUnique?: boolean;
  /** Puces cochées d'office à l'ouverture. */
  besoinDefaut?: string[];
  /** Écran 2 : année de naissance et nombre de personnes demandés. Absent = les deux (portes historiques). */
  profil?: { annee: boolean; personnes: boolean };
  /** Questions propres à la porte (payload `details`), avec l'écran où elles apparaissent. */
  details?: ChampDetail[];
}

/** Question propre à une porte. Écran 1 (besoin), 2 (profil) ou 3 (après les coordonnées, toujours facultative). */
export type ChampDetail = { code: string; label: L; /** Libellé de la fiche et de l'e-mail, si la question ne s'y prête pas. */ court?: L; ecran: 1 | 2 | 3; optionnel?: boolean; aide?: L } & (
  | { type: "choix"; choix: Choix[] }
  | { type: "choix-multiple"; choix: Choix[] }
  | { type: "nombre"; min: number; max: number; placeholder?: string; unite?: L }
  | { type: "texte"; max: number; placeholder?: L }
  /** Date souhaitée : « dès que possible », « dans le mois », « d'ici trois mois », ou une date (AAAA-MM-JJ). */
  | { type: "quand" }
);

export const QUAND_CHOIX: Choix[] = [
  { code: "asap", label: { fr: "Dès que possible", en: "As soon as possible" } },
  { code: "1-mois", label: { fr: "Dans le mois", en: "Within a month" } },
  { code: "3-mois", label: { fr: "D'ici trois mois", en: "Within three months" } },
  { code: "date", label: { fr: "À une date précise", en: "On a specific date" } },
];
/** Une date précise peut aller jusqu'à deux ans. */
export const QUAND_MAX_JOURS = 730;

const QUAND: ChampDetail = { code: "debut", type: "quand", ecran: 2, label: { fr: "Pour quand ?", en: "From when?" }, court: { fr: "Début souhaité", en: "Desired start" } };
const ANNEE_COURANTE = new Date().getUTCFullYear();

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
  "menage-rc": {
    code: "menage-rc",
    label: { fr: "Ménage et RC", en: "Household and liability" },
    sujet: { fr: "votre assurance ménage et RC privée", en: "your household and liability insurance" },
    besoin: {
      question: { fr: "Qu'aimeriez-vous assurer ?", en: "What would you like to insure?" },
      choix: [
        { code: "menage", label: { fr: "Mes affaires (ménage)", en: "My belongings (household)" } },
        { code: "rc", label: { fr: "Les dégâts causés à autrui (RC privée)", en: "Damage I cause to others (liability)" } },
      ],
    },
    besoinDefaut: ["menage", "rc"],
    etapeSante: false,
    profil: { annee: false, personnes: true },
    details: [
      {
        code: "logement",
        type: "choix",
        ecran: 1,
        label: { fr: "Vous habitez", en: "You live in" },
        court: { fr: "Logement", en: "Home" },
        choix: [
          { code: "appartement", label: { fr: "Un appartement", en: "A flat" } },
          { code: "maison", label: { fr: "Une maison", en: "A house" } },
        ],
      },
      {
        code: "pieces",
        court: { fr: "Pièces", en: "Rooms" },
        type: "choix",
        ecran: 1,
        label: { fr: "Nombre de pièces", en: "Number of rooms" },
        choix: [
          { code: "1", label: { fr: "1 ou 1,5", en: "1 or 1.5" } },
          { code: "2", label: { fr: "2 ou 2,5", en: "2 or 2.5" } },
          { code: "3", label: { fr: "3 ou 3,5", en: "3 or 3.5" } },
          { code: "4", label: { fr: "4 ou 4,5", en: "4 or 4.5" } },
          { code: "5", label: { fr: "5 ou plus", en: "5 or more" } },
        ],
      },
      QUAND,
      {
        code: "somme",
        court: { fr: "Somme d'assurance", en: "Sum insured" },
        type: "nombre",
        ecran: 3,
        optionnel: true,
        min: 5000,
        max: 2_000_000,
        placeholder: "60000",
        unite: { fr: "CHF", en: "CHF" },
        label: { fr: "Valeur estimée de vos affaires", en: "Estimated value of your belongings" },
        aide: { fr: "Ce qu'il faudrait pour tout racheter à neuf.", en: "What it would cost to replace everything new." },
      },
      {
        code: "objets",
        court: { fr: "Objets de valeur", en: "Valuables" },
        type: "choix-multiple",
        ecran: 3,
        optionnel: true,
        label: { fr: "Objets de valeur à signaler", en: "Valuables worth mentioning" },
        choix: [
          { code: "bijoux", label: { fr: "Bijoux, montres", en: "Jewellery, watches" } },
          { code: "art", label: { fr: "Art, collections", en: "Art, collections" } },
          { code: "instruments", label: { fr: "Instruments de musique", en: "Musical instruments" } },
          { code: "electronique", label: { fr: "Matériel photo ou informatique", en: "Camera or computer equipment" } },
          { code: "velo", label: { fr: "Vélo électrique", en: "E-bike" } },
        ],
      },
    ],
  },
  "protection-juridique": {
    code: "protection-juridique",
    label: { fr: "Protection juridique", en: "Legal protection" },
    sujet: { fr: "votre protection juridique", en: "your legal protection insurance" },
    besoin: {
      question: { fr: "Quelle protection vous faut-il ?", en: "Which protection do you need?" },
      choix: [
        { code: "privee", label: { fr: "Vie privée", en: "Private life" } },
        { code: "circulation", label: { fr: "Circulation", en: "Traffic" } },
        { code: "privee-circulation", label: { fr: "Les deux", en: "Both" } },
        { code: "entreprise", label: { fr: "Entreprise", en: "Business" } },
      ],
    },
    besoinUnique: true,
    etapeSante: false,
    profil: { annee: false, personnes: false },
    details: [
      {
        code: "foyer",
        type: "choix",
        ecran: 1,
        label: { fr: "Pour qui ?", en: "For whom?" },
        court: { fr: "Assurés", en: "Insured" },
        choix: [
          { code: "seul", label: { fr: "Moi seul", en: "Just me" } },
          { code: "famille", label: { fr: "Mon ménage, ma famille", en: "My household, my family" } },
        ],
      },
      QUAND,
    ],
  },
  auto: {
    code: "auto",
    label: { fr: "Auto", en: "Car" },
    sujet: { fr: "votre assurance auto", en: "your car insurance" },
    besoin: {
      question: { fr: "Quelle couverture cherchez-vous ?", en: "Which cover are you looking for?" },
      choix: [
        { code: "rc", label: { fr: "RC seule (obligatoire)", en: "Liability only (compulsory)" } },
        { code: "partielle", label: { fr: "RC et casco partielle", en: "Liability and partial cover" } },
        { code: "complete", label: { fr: "RC et casco complète", en: "Liability and full cover" } },
      ],
    },
    besoinUnique: true,
    etapeSante: false,
    profil: { annee: false, personnes: false },
    details: [
      {
        code: "vehicule",
        court: { fr: "Véhicule", en: "Vehicle" },
        type: "texte",
        ecran: 1,
        max: 80,
        label: { fr: "Marque et modèle", en: "Make and model" },
        placeholder: { fr: "VW Golf", en: "VW Golf" },
      },
      {
        code: "miseEnCirculation",
        court: { fr: "1re mise en circulation", en: "First registered" },
        type: "nombre",
        ecran: 1,
        min: 1950,
        max: ANNEE_COURANTE + 1,
        placeholder: String(ANNEE_COURANTE - 4),
        label: { fr: "Année de première mise en circulation", en: "Year first registered" },
      },
      {
        code: "usage",
        court: { fr: "Usage", en: "Use" },
        type: "choix",
        ecran: 2,
        label: { fr: "Usage du véhicule", en: "Vehicle use" },
        choix: [
          { code: "prive", label: { fr: "Privé", en: "Private" } },
          { code: "trajets", label: { fr: "Privé et trajets au travail", en: "Private and commuting" } },
          { code: "professionnel", label: { fr: "Professionnel", en: "Business" } },
        ],
      },
      {
        code: "ageConducteur",
        court: { fr: "Âge du conducteur", en: "Driver age" },
        type: "nombre",
        ecran: 2,
        min: 18,
        max: 99,
        placeholder: "35",
        unite: { fr: "ans", en: "years" },
        label: { fr: "Âge du conducteur principal", en: "Age of the main driver" },
      },
      QUAND,
      {
        code: "sinistres",
        court: { fr: "Sinistres (5 ans)", en: "Claims (5 years)" },
        type: "nombre",
        ecran: 3,
        optionnel: true,
        min: 0,
        max: 20,
        placeholder: "0",
        label: { fr: "Sinistres ces cinq dernières années", en: "Claims in the last five years" },
        aide: { fr: "Leur nombre suffit.", en: "Just the number." },
      },
    ],
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
        { code: "menage-rc", label: { fr: "Ménage et RC privée", en: "Household and liability" } },
        { code: "auto", label: { fr: "Assurance auto", en: "Car insurance" } },
        { code: "protection-juridique", label: { fr: "Protection juridique", en: "Legal protection" } },
        { code: "autre", label: { fr: "Autre sujet", en: "Something else" } },
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
