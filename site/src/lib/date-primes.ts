/* Date du relevé des primes LAMal 2027, lue dans le texte `source` que le script de construction écrit
   (« relevées le 22.11.2026 »). Lu côté serveur seulement ; le comparateur reçoit la date en propriété. */
import PRIMES from "@/data/primes-2027-resume.json";

const m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(PRIMES.source);
export const DATE_PRIMES = m ? `${m[3]}-${m[2]}-${m[1]}` : "2026-11-22";
