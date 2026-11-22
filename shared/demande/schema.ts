// Payload d'intake POST /api/demande (zod). Partagé par le site (formulaire) et leads (validation serveur).
import { z } from "zod";
import { isKnownConsentVersion } from "./consent";
import { codesBesoin, CRENEAUX, LOCALES, PERSONNES, PORTE_RAPPEL, PORTES, PORTES_DEF, SANTE_CHOIX } from "./portes";

const txt = (max: number) => z.string().trim().min(1).max(max);
// Pas de caractères de contrôle dans les champs libres courts (noms).
const nom = txt(120).regex(/^[^\p{Cc}<>]+$/u, "caractères non admis");

export const utmSchema = z
  .object({
    source: z.string().max(100).optional(),
    medium: z.string().max(100).optional(),
    campaign: z.string().max(100).optional(),
    term: z.string().max(100).optional(),
    content: z.string().max(100).optional(),
  })
  .strict();

const currentYear = new Date().getUTCFullYear();

export const demandeSchema = z
  .object({
    porte: z.enum(PORTES),
    locale: z.enum(LOCALES),
    source: z.enum(["form", "assistant"]),
    /** Chemin de la page d'origine (sans domaine ni requête). */
    sourcePage: z
      .string()
      .max(300)
      .regex(/^\/[A-Za-z0-9\-_/.]*$/)
      .optional(),
    utm: utmSchema.optional(),
    /** Écran 1 : puces de la porte (choix multiple). */
    besoin: z.array(z.string().max(40)).min(1).max(6),
    /** Écran 2. « J'habite en Suisse » = non : le site affiche un écran d'information et n'envoie rien.
     *  Obligatoire et complet pour toutes les portes sauf « rappel » : là, absent, ou NPA seul. */
    residence: z
      .object({
        livesInSwitzerland: z.literal(true),
        npa: z.string().regex(/^\d{4}$/),
        birthYear: z.number().int().min(1900).max(currentYear).optional(),
        /** 1, 2, 3 ou 4 (= 4 ou plus). */
        householdSize: z.number().int().min(1).max(PERSONNES[PERSONNES.length - 1]).optional(),
      })
      .strict()
      .optional(),
    /** Puces santé de l'écran 1 (porte santé, facultatives) : intérêt seulement. */
    health: z
      .object({ products: z.array(z.enum(SANTE_CHOIX)).min(1).max(SANTE_CHOIX.length) })
      .strict()
      .optional(),
    contact: z
      .object({
        /** Nom complet (un seul champ). */
        fullName: nom,
        /** E.164, normalisé par libphonenumber-js côté navigateur, revérifié côté serveur. */
        phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
        email: z.email().max(200).optional(),
        callbackSlot: z.enum(CRENEAUX).optional(),
      })
      .strict(),
    consent: z.literal(true),
    consentVersion: z.string().max(10),
    healthConsent: z.boolean().optional(),
    healthConsentVersion: z.string().max(10).optional(),
    /** Absent tant que le widget Turnstile n'est pas déployé (TURNSTILE_DISABLED=1 côté leads). */
    turnstileToken: z.string().min(1).max(2048).optional(),
    /** Pot de miel : champ caché, rempli seulement par un robot. Non vide → 202 silencieux, rien n'est stocké. */
    website: z.string().max(200).optional(),
    /** Millisecondes entre l'ouverture du formulaire et l'envoi. Moins de 3 s → 202 silencieux, rien n'est stocké. */
    elapsedMs: z.number().int().min(0).max(86_400_000).optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    const allowed = codesBesoin(d.porte);
    if (d.besoin.some((c) => !allowed.includes(c)) || new Set(d.besoin).size !== d.besoin.length) {
      ctx.addIssue({ code: "custom", path: ["besoin"], message: "code inconnu pour cette porte" });
    }
    if (d.porte === PORTE_RAPPEL) {
      // Formulaire court : un seul sujet, NPA facultatif, pas de profil.
      if (d.besoin.length !== 1) ctx.addIssue({ code: "custom", path: ["besoin"], message: "un seul sujet" });
      if (d.residence && (d.residence.birthYear !== undefined || d.residence.householdSize !== undefined)) {
        ctx.addIssue({ code: "custom", path: ["residence"], message: "profil hors formulaire court" });
      }
    } else if (!d.residence || d.residence.birthYear === undefined || d.residence.householdSize === undefined) {
      ctx.addIssue({ code: "custom", path: ["residence"], message: "profil requis" });
    }
    if (!isKnownConsentVersion("contact", d.consentVersion)) {
      ctx.addIssue({ code: "custom", path: ["consentVersion"], message: "version inconnue" });
    }
    if (d.health) {
      if (!PORTES_DEF[d.porte].etapeSante) {
        ctx.addIssue({ code: "custom", path: ["health"], message: "étape santé hors porte santé" });
      }
      if (d.healthConsent !== true) {
        ctx.addIssue({ code: "custom", path: ["healthConsent"], message: "consentement santé requis" });
      }
      if (!d.healthConsentVersion || !isKnownConsentVersion("health", d.healthConsentVersion)) {
        ctx.addIssue({ code: "custom", path: ["healthConsentVersion"], message: "version inconnue" });
      }
    } else if (d.healthConsent || d.healthConsentVersion) {
      // Un consentement santé sans données santé n'a pas d'objet : on refuse plutôt que de l'enregistrer.
      ctx.addIssue({ code: "custom", path: ["healthConsent"], message: "consentement santé sans données santé" });
    }
  });

export type Demande = z.infer<typeof demandeSchema>;

/** Délai minimal entre l'ouverture du formulaire et l'envoi (anti-robot, avec le pot de miel `website`). */
export const MIN_ELAPSED_MS = 3000;

/** Robot probable : pot de miel rempli ou envoi trop rapide. */
export function isLikelyBot(d: Pick<Demande, "website" | "elapsedMs">): boolean {
  return Boolean(d.website?.trim()) || (d.elapsedMs !== undefined && d.elapsedMs < MIN_ELAPSED_MS);
}

/** Réponse de l'API (identique pour un doublon). */
export interface DemandeAccepted {
  ok: true;
  ref: string;
}
