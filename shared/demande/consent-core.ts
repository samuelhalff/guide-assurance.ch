// Noyau sans les textes : partagé par consent.ts (serveur, toutes versions) et consent-public.ts (site, version courante seule).
import { PORTES_DEF, type Locale, type Porte } from "./portes";

export type ConsentKind = "contact" | "health";

export interface ConsentText {
  kind: ConsentKind | string;
  locale: Locale | string;
  version: string;
  /** Société destinataire nommée par le texte (firms.slug). */
  firm: string;
  /** Modèle Markdown tel que publié ; sha256 calculé sur ces octets exacts (UTF-8). */
  body: string;
  sha256: string;
}

/** Version proposée aujourd'hui par le formulaire. */
export const CURRENT_CONSENT_VERSION: Record<ConsentKind, string> = { contact: "v4", health: "v2" };

/** Adresse de retrait du consentement (remplace {{CONTACT}} à l'affichage). */
export const CONSENT_CONTACT = "contact@guide-assurance.ch";

/** Texte affiché au prospect : modèle + porte + adresse de contact. */
export function renderConsent(text: ConsentText, porte: Porte): string {
  const locale = (text.locale === "en" ? "en" : "fr") as Locale;
  return text.body.replaceAll("{{PORTE}}", PORTES_DEF[porte].sujet[locale]).replaceAll("{{CONTACT}}", CONSENT_CONTACT);
}
