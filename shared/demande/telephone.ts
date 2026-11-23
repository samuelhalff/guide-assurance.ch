// Numéro de téléphone du formulaire : normalisation en E.164 et refus des saisies manifestement fausses.
// Même fonction côté navigateur (site) et côté serveur (leads). Aucune dépendance.
//   Suisse : +41 ou 0 suivi de 9 chiffres, mobile 074 à 079, fixe selon les indicatifs régionaux.
//   France : +33 suivi de 9 chiffres, fixe 01 à 05 et 09, mobile 06 et 07. Sans +33, un numéro qui commence par 0 est lu
//   comme suisse s'il en a l'indicatif (061, 079…), sinon comme français (06 52…, 01…, 070…), sauf 09.
//   Autres pays : + puis 8 à 15 chiffres (E.164).

export type PaysTelephone = "CH" | "FR" | "INTL";
export type RaisonTelephone = "vide" | "caracteres" | "court" | "long" | "prefixe-ch" | "prefixe-fr" | "repetitif";
export type ResultatTelephone =
  | { ok: true; e164: string; pays: PaysTelephone; type?: "mobile" | "fixe" }
  | { ok: false; raison: RaisonTelephone };

const CH_MOBILE = /^7[4-9]/;
/** Indicatifs régionaux suisses (021 à 091) et 058 (réseaux d'entreprise). Pas de 0800, 084x ni 0900. */
const CH_FIXE = /^(2[1-7]|3[1-4]|4[1-4]|5[2-8]|6[12]|71|81|91)/;
const FR_MOBILE = /^[67]/;
const FR_FIXE = /^[1-59]/;

/** Saisie manifestement fausse : les 7 derniers chiffres identiques, ou une longue suite d'un même chiffre. */
function repetitif(chiffres: string): boolean {
  return /^(\d)\1{6}$/.test(chiffres.slice(-7)) || /(\d)\1{7}/.test(chiffres);
}

export function normaliserTelephone(brut: string): ResultatTelephone {
  // « +41 (0)79 … » : le (0) national entre parenthèses se retire avant tout.
  let s = brut.trim().replace(/\(0\)/g, "");
  if (!s) return { ok: false, raison: "vide" };
  if (/[^\d\s+().\-/]/.test(s) || /.\+/.test(s.replace(/\s/g, ""))) return { ok: false, raison: "caracteres" };
  s = s.replace(/[\s().\-/]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;

  let international: string;
  if (s.startsWith("+")) international = s.slice(1);
  else if (s.startsWith("0")) {
    const nsn = s.slice(1);
    const suisse = CH_MOBILE.test(nsn) || CH_FIXE.test(nsn);
    // 09 exclu du repli : un 0900 suisse (surtaxé) doit rester refusé.
    international = !suisse && nsn.length === 9 && /^[1-7]/.test(nsn) ? `33${nsn}` : `41${nsn}`;
  }
  else return s.length < 9 ? { ok: false, raison: "court" } : { ok: false, raison: "prefixe-ch" };

  if (!/^[1-9]\d*$/.test(international)) return { ok: false, raison: international.startsWith("0") ? "caracteres" : "court" };

  for (const [cc, pays] of [["41", "CH"], ["33", "FR"]] as const) {
    if (!international.startsWith(cc)) continue;
    let nsn = international.slice(cc.length);
    // « +41 079 … » ou « +33 06 … » : le 0 national ajouté par habitude.
    if (nsn.length === 10 && nsn.startsWith("0")) nsn = nsn.slice(1);
    if (nsn.length < 9) return { ok: false, raison: "court" };
    if (nsn.length > 9) return { ok: false, raison: "long" };
    const mobile = pays === "CH" ? CH_MOBILE.test(nsn) : FR_MOBILE.test(nsn);
    const fixe = pays === "CH" ? CH_FIXE.test(nsn) : FR_FIXE.test(nsn);
    if (!mobile && !fixe) return { ok: false, raison: pays === "CH" ? "prefixe-ch" : "prefixe-fr" };
    if (repetitif(nsn)) return { ok: false, raison: "repetitif" };
    return { ok: true, e164: `+${cc}${nsn}`, pays, type: mobile ? "mobile" : "fixe" };
  }

  if (international.length < 8) return { ok: false, raison: "court" };
  if (international.length > 15) return { ok: false, raison: "long" };
  if (repetitif(international.slice(1))) return { ok: false, raison: "repetitif" };
  return { ok: true, e164: `+${international}`, pays: "INTL" };
}

/** Vrai si la valeur est déjà un numéro E.164 accepté (contrôle serveur du payload). */
export function estTelephoneE164Valide(v: string): boolean {
  const r = normaliserTelephone(v);
  return r.ok && r.e164 === v;
}

/** Affichage lisible d'un numéro normalisé : +41 79 123 45 67, +33 6 12 34 56 78, sinon tel quel. */
export function formaterTelephone(e164: string): string {
  const ch = /^\+41(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  if (ch) return `+41 ${ch[1]} ${ch[2]} ${ch[3]} ${ch[4]}`;
  const fr = /^\+33(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(e164);
  if (fr) return `+33 ${fr.slice(1).join(" ")}`;
  return e164;
}

/** Nombre de chiffres saisis (pour n'afficher une erreur en cours de frappe qu'une fois le numéro assez long). */
export const chiffresSaisis = (brut: string) => brut.replace(/\D/g, "").length;

const NB = " ";

/** Messages d'erreur du champ téléphone (formulaire complet et formulaire court). */
export const TELEPHONE_ERREURS: Record<RaisonTelephone, { fr: string; en: string }> = {
  vide: { fr: "Indiquez le numéro auquel le conseiller peut vous appeler.", en: "Enter the number the adviser can call you on." },
  caracteres: { fr: "Gardez seulement les chiffres, les espaces et le signe +.", en: "Use only digits, spaces and the + sign." },
  court: {
    fr: "Il manque des chiffres. Un numéro suisse en compte dix, par exemple 079 123 45 67.",
    en: "Some digits are missing. A Swiss number has ten, for example 079 123 45 67.",
  },
  long: { fr: `Ce numéro a trop de chiffres. Pouvez-vous le vérifier${NB}?`, en: "This number has too many digits. Could you check it?" },
  "prefixe-ch": {
    fr: "Ce numéro ne correspond à aucun numéro suisse. S’il est français, commencez par +33.",
    en: "This does not match any Swiss number. If it is French, start with +33.",
  },
  "prefixe-fr": {
    fr: "Après +33, un numéro français commence par 1 à 7 ou par 9.",
    en: "After +33, a French number starts with 1 to 7 or with 9.",
  },
  repetitif: { fr: "Ce numéro ne semble pas réel. Vérifiez les chiffres.", en: "This number does not look real. Please check the digits." },
};
