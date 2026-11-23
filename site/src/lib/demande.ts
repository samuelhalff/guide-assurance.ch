import { PORTES_FORMULAIRE, PREFILL_STORAGE_KEY, type Porte } from "@shared/demande/portes";

/* Formulaire de demande : adresses, porte d'une page guide, préremplissage (sessionStorage, jamais l'URL). */
export const DEMANDE = { fr: "/demande/", en: "/en/request/" } as const;
export const DEMANDE_ENVOYEE = { fr: "/demande-envoyee/", en: "/en/request-sent/" } as const;

/* Formulaire court « Être rappelé » : sous /demande/ pour garder la mise en page et la politique de sécurité du formulaire. */
export const RAPPEL = { fr: "/demande/rappel/", en: "/en/request/call-back/" } as const;

/* Formulaire ouvert sur une porte : /demande/<porte>/ (l'ancienne forme ?porte= reste lue par le formulaire). */
export const lienDemande = (locale: "fr" | "en", porte: Porte) => `${DEMANDE[locale]}${porte}/`;

/* Portes d'offre directe (ménage et RC, protection juridique, auto) : leurs guides mènent au formulaire de la porte
   en haut de page, après l'introduction et en fin de page, avec la barre collante sur mobile. */
export const PORTES_OFFRE = ["menage-rc", "protection-juridique", "auto"] as const satisfies readonly Porte[];
export const estPorteOffre = (p: Porte | undefined): p is (typeof PORTES_OFFRE)[number] => (PORTES_OFFRE as readonly string[]).includes(p ?? "");

/* Portes du formulaire en trois écrans (la porte « rappel » a son propre formulaire). */
export const estPorte = (v: unknown): v is Porte => typeof v === "string" && (PORTES_FORMULAIRE as readonly string[]).includes(v);

/* Porte d'une page guide, d'après son adresse française (les pages anglaises portent la leur dans `fr`).
   Les autres pages n'ont pas d'appel au formulaire. */
export function porteDePage(slugFr: string | undefined): Porte | undefined {
  if (!slugFr) return undefined;
  if (["/assurance-maladie/", "/assurance-maladie/primes/", "/complementaire-sante/"].includes(slugFr)) return "sante";
  if (slugFr === "/frontaliers/") return "frontaliers";
  if (slugFr === "/nouveaux-arrivants/") return "nouveaux-arrivants";
  if (slugFr === "/3e-pilier/") return "prevoyance";
  if (slugFr === "/entreprises/" || slugFr.startsWith("/entreprises/")) return "entreprises";
  if (slugFr === "/assurance-menage-rc/") return "menage-rc";
  if (slugFr === "/protection-juridique/") return "protection-juridique";
  if (slugFr === "/assurance-auto/") return "auto";
  return undefined;
}

export type Preremplissage = { porte?: Porte; besoin?: string[]; npa?: string; birthYear?: number; householdSize?: number };

export function ecrirePreremplissage(p: Preremplissage) {
  try {
    sessionStorage.setItem(PREFILL_STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* navigation privée : le formulaire s'ouvre vide */
  }
}

export function lirePreremplissage(): Preremplissage {
  try {
    const brut: unknown = JSON.parse(sessionStorage.getItem(PREFILL_STORAGE_KEY) ?? "null");
    if (!brut || typeof brut !== "object") return {};
    const o = brut as Record<string, unknown>;
    const out: Preremplissage = {};
    if (estPorte(o.porte)) out.porte = o.porte;
    if (Array.isArray(o.besoin)) out.besoin = o.besoin.filter((x): x is string => typeof x === "string");
    if (typeof o.npa === "string" && /^\d{4}$/.test(o.npa)) out.npa = o.npa;
    if (typeof o.birthYear === "number" && Number.isInteger(o.birthYear)) out.birthYear = o.birthYear;
    if (typeof o.householdSize === "number" && [1, 2, 3, 4].includes(o.householdSize)) out.householdSize = o.householdSize;
    return out;
  } catch {
    return {};
  }
}

export function effacerPreremplissage() {
  try {
    sessionStorage.removeItem(PREFILL_STORAGE_KEY);
  } catch {
    /* rien à faire */
  }
}

export const TEXTE_CTA = {
  fr: {
    bouton: "Comparer avec un conseiller, gratuit",
    rassurance: "C’est gratuit et sans engagement, et un seul conseiller vous appelle.",
    fermer: "Masquer",
  },
  en: {
    bouton: "Compare with an adviser, free",
    rassurance: "It is free and without commitment, and only one adviser calls you.",
    fermer: "Hide",
  },
} as const;

const NNBSP = "\u202f";

/* Appels « Être rappelé » (tête, accueil, zone d'appel des guides) et formulaire court. Aucun délai promis. */
export const TEXTE_RAPPEL = {
  fr: {
    tete: "Être rappelé",
    teteCourt: "Rappel",
    accueilQ: `Pas envie de tout lire${NNBSP}?`,
    accueilLien: "Un conseiller vous rappelle",
    guideQ: `Pas le temps de lire${NNBSP}?`,
    guideLien: "Demandez un rappel",
    guideSuite: ", votre nom et votre numéro suffisent.",
  },
  en: {
    tete: "Call me back",
    teteCourt: "Call back",
    accueilQ: "Rather not read it all?",
    accueilLien: "An adviser will call you back",
    guideQ: "No time to read?",
    guideLien: "Ask for a call back",
    guideSuite: ", your name and number are enough.",
  },
} as const;
