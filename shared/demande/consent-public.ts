// Site public : seulement les textes de la version courante (les anciennes versions ne partent pas dans le JS).
import { CURRENT_CONSENT_TEXTS } from "./consent.current.generated";
import type { ConsentKind, ConsentText } from "./consent-core";

export * from "./consent-core";

export function findConsent(kind: ConsentKind, locale: string, version: string): ConsentText | undefined {
  return CURRENT_CONSENT_TEXTS.find((t) => t.kind === kind && t.locale === locale && t.version === version);
}
