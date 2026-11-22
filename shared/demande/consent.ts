// Registre des textes de consentement versionnés (serveur : toutes les versions).
// Le payload d'intake porte `consentVersion` / `healthConsentVersion`, jamais le texte.
import { CONSENT_TEXTS } from "./consent.generated";
import type { ConsentKind, ConsentText } from "./consent-core";

export * from "./consent-core";
export { CONSENT_TEXTS };

export function findConsent(kind: ConsentKind, locale: string, version: string): ConsentText | undefined {
  return CONSENT_TEXTS.find((t) => t.kind === kind && t.locale === locale && t.version === version);
}

export function isKnownConsentVersion(kind: ConsentKind, version: string): boolean {
  return CONSENT_TEXTS.some((t) => t.kind === kind && t.version === version);
}
