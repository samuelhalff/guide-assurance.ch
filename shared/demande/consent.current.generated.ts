// GÉNÉRÉ par scripts/gen-consent.mjs à partir de consent/*.md. Ne pas modifier à la main.
// Un texte publié est immuable : toute correction = nouvelle version (v2…).
import type { ConsentText } from "./consent-core";

export const CURRENT_CONSENT_TEXTS: readonly ConsentText[] = [
  {
    "kind": "contact",
    "locale": "en",
    "version": "v4",
    "firm": "",
    "body": "Your request will be passed to a single partner insurance broker in French-speaking Switzerland. One of its advisers will contact you about {{PORTE}} at the time you chose. Guide Assurance records your request and passes it to no one else. You can withdraw your consent at any time by writing to {{CONTACT}}. For more information, see the [privacy policy](/en/privacy/).\n\nI agree that Guide Assurance passes my request and contact details to this partner broker so that it can contact me.\n",
    "sha256": "bc5008a50833300f776430c5b248b912dddd0609ddc2b2812a0fddd8f7fca19c"
  },
  {
    "kind": "contact",
    "locale": "fr",
    "version": "v4",
    "firm": "",
    "body": "Votre demande sera transmise à un seul courtier en assurances partenaire, en Suisse romande. Un de ses conseillers vous contactera au sujet de {{PORTE}}, au moment choisi. Guide Assurance enregistre votre demande et ne la transmet à personne d'autre. Vous pouvez retirer votre accord à tout moment en écrivant à {{CONTACT}}. Pour en savoir plus, consultez la [politique de confidentialité](/confidentialite/).\n\nJ'accepte que Guide Assurance transmette ma demande et mes coordonnées à ce courtier partenaire pour qu'il me contacte.\n",
    "sha256": "0281a29057a4f24f3743dfd5656ed71e190416ce3622acad9461da8c190e727d"
  },
  {
    "kind": "health",
    "locale": "en",
    "version": "v2",
    "firm": "",
    "body": "I agree that the health cover needs I have indicated are processed and passed to this partner broker to prepare an offer, and for no other purpose.\n",
    "sha256": "4de80b70f605a83dd5928f4a836a714e3967588b2092cb8350a7d3897a7d9833"
  },
  {
    "kind": "health",
    "locale": "fr",
    "version": "v2",
    "firm": "",
    "body": "J'accepte que mes besoins de couverture santé indiqués soient traités et transmis à ce courtier partenaire pour préparer une offre, et à aucune autre fin.\n",
    "sha256": "9931aa30024383905f351268d83cb23bbf3a4e255eab33e878930a37f317351b"
  }
] as const;
