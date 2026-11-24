/* Rappels d'échéance au format iCalendar (RFC 5545), créés dans le navigateur : rien n'est envoyé ni gardé.
   Fonctions pures, testées par tests/ics.test.mts. Les événements sont des journées entières (DTSTART;VALUE=DATE),
   en heure « flottante » : le 30 novembre reste le 30 novembre quel que soit le fuseau de l'agenda.
   Règles appliquées : lignes terminées par CRLF, repliées à 75 octets sans couper un caractère UTF-8 (§3.1),
   texte échappé (§3.3.11), UID et DTSTAMP sur chaque VEVENT (§3.6.1), alarmes VALARM avec ACTION, DESCRIPTION
   et TRIGGER (§3.6.6). */
import { d0, dateTexte, dim } from "./dates.ts";
import { ESPACE_FINE as N } from "./nombres.ts";

export type Alarme = { joursAvant: number; heure?: number };

export type EvenementIcs = {
  uid: string;
  date: Date; // journée entière, date locale
  titre: string;
  description: string;
  url?: string;
  annuel?: boolean; // RRULE:FREQ=YEARLY
  alarmes?: Alarme[];
};

const DOMAINE_UID = "guide-assurance.ch";
const CRLF = "\r\n";
const p2 = (n: number) => String(n).padStart(2, "0");

export const dateIcs = (d: Date) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`;
export const horodatageIcs = (d: Date) =>
  `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}T${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}Z`;
const lendemain = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

/* Échappement d'une valeur TEXT : barre oblique inverse, point-virgule, virgule, retour à la ligne. */
export function echapper(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
}

/* Repli d'une ligne de contenu à 75 octets au plus (CRLF non compris). La suite commence par une espace,
   qui compte dans les 75 octets. Un caractère UTF-8 n'est jamais coupé. */
export function replier(ligne: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  let octets = 0;
  let max = 75;
  for (const ch of ligne) {
    const n = enc.encode(ch).length;
    if (octets + n > max) {
      out.push(cur);
      cur = " ";
      octets = 1;
      max = 75;
    }
    cur += ch;
    octets += n;
  }
  out.push(cur);
  return out.join(CRLF);
}

/* Déclencheur d'une alarme : n jours avant la journée, à l'heure dite (9 h par défaut).
   L'événement commence à 0 h : 14 jours avant à 9 h = -P13DT15H ; le jour même à 9 h = PT9H. */
export function declencheur(a: Alarme): string {
  const h = a.heure ?? 9;
  if (a.joursAvant <= 0) return `PT${h}H`;
  return h === 0 ? `-P${a.joursAvant}D` : `-P${a.joursAvant - 1}DT${24 - h}H`;
}

/* UID stable : réimporter le même rappel met à jour l'événement au lieu de le doubler. */
export const uidIcs = (cle: string, date: Date) =>
  `${cle.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "")}-${dateIcs(date)}@${DOMAINE_UID}`;

export function calendrierIcs(evenements: EvenementIcs[], { maintenant = new Date(), nom = "Guide Assurance", langue = "FR" } = {}): string {
  const stamp = horodatageIcs(maintenant);
  const L: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Guide Assurance//Rappels d'echeance//${langue}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${echapper(nom)}`,
  ];
  for (const e of evenements) {
    L.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateIcs(e.date)}`,
      `DTEND;VALUE=DATE:${dateIcs(lendemain(e.date))}`,
      `SUMMARY:${echapper(e.titre)}`,
      `DESCRIPTION:${echapper(e.description)}`,
    );
    if (e.url) L.push(`URL:${e.url}`);
    if (e.annuel) L.push("RRULE:FREQ=YEARLY");
    L.push("TRANSP:TRANSPARENT");
    for (const a of e.alarmes ?? []) {
      L.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${echapper(e.titre)}`, `TRIGGER:${declencheur(a)}`, "END:VALARM");
    }
    L.push("END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return L.map(replier).join(CRLF) + CRLF;
}

/* ---- Échéances fixes ---- */

const SITE = "https://guide-assurance.ch";
/* Prochaine occurrence (aujourd'hui compris) du jour j du mois m (0 = janvier). */
export function prochain(today: Date, m: number, j: number): Date {
  const t = d0(today);
  const c = new Date(t.getFullYear(), m, j);
  return c >= t ? c : new Date(t.getFullYear() + 1, m, j);
}

export type TypeFixe = "lamal" | "semestre" | "3a";
export type Langue = "fr" | "en";

const RAPPEL = { fr: `${SITE}/demande/rappel/?utm_source=agenda&utm_medium=ics`, en: `${SITE}/en/request/call-back/?utm_source=agenda&utm_medium=ics` };
const LIENS = {
  fr: { lettre: `${SITE}/lettre-resiliation/`, comparateur: `${SITE}/assurance-maladie/comparateur/`, taux3a: `${SITE}/3e-pilier/taux-3a/`, impot3a: `${SITE}/3e-pilier/economie-impot/`, rappels: `${SITE}/rappels-echeances/` },
  en: { lettre: `${SITE}/en/cancellation-letter/`, comparateur: `${SITE}/en/health-insurance/compare/`, taux3a: `${SITE}/en/pillar-3a/interest-rates/`, impot3a: `${SITE}/en/pillar-3a/tax-savings/`, rappels: `${SITE}/en/renewal-reminders/` },
};
export const lienRappel = (l: Langue) => RAPPEL[l];

export function evenementFixe(type: TypeFixe, today: Date, l: Langue = "fr"): EvenementIcs {
  const fr = l === "fr";
  const k = LIENS[l];
  if (type === "lamal") {
    const date = prochain(today, 10, 30);
    return {
      uid: uidIcs("lamal-30-novembre", date),
      date,
      annuel: true,
      titre: fr ? "Dernier jour de réception pour résilier l’assurance de base" : "Last day for your insurer to receive a basic health insurance cancellation",
      description: fr
        ? `Pour changer d’assureur au 1er janvier, votre assureur doit recevoir la lettre de résiliation au plus tard aujourd’hui (art. 7, al. 2, LAMal). Mieux vaut l’envoyer en recommandé une semaine avant.\n\nPréparer la lettre${N}: ${k.lettre}\nComparer les primes${N}: ${k.comparateur}\nÊtre rappelé par un conseiller${N}: ${RAPPEL.fr}`
        : `To change insurer on 1 January, your insurer must receive the cancellation letter by today at the latest (art. 7 para. 2 LAMal). Sending it by registered mail a week earlier is safer.\n\nPrepare the letter: ${k.lettre}\nCompare premiums: ${k.comparateur}\nGet a call back from an adviser: ${RAPPEL.en}`,
      url: k.lettre,
      alarmes: [{ joursAvant: 14 }, { joursAvant: 7 }],
    };
  }
  if (type === "semestre") {
    const date = prochain(today, 2, 31);
    return {
      uid: uidIcs("lamal-31-mars", date),
      date,
      annuel: true,
      titre: fr ? "Dernier jour pour résilier l’assurance de base au 30 juin (franchise de 300 francs)" : "Last day to cancel basic health insurance for 30 June (CHF 300 deductible)",
      description: fr
        ? `Seulement si vous avez la franchise de 300 francs et le libre choix du médecin. Une lettre reçue par l’assureur au plus tard aujourd’hui permet de changer d’assureur au 1er juillet (art. 7, al. 1, LAMal). Avec une autre franchise ou un modèle alternatif, le changement n’est possible qu’en fin d’année.\n\nPréparer la lettre${N}: ${k.lettre}\nÊtre rappelé par un conseiller${N}: ${RAPPEL.fr}`
        : `Only if you have the CHF 300 deductible and free choice of doctor. A letter your insurer receives by today at the latest lets you change insurer on 1 July (art. 7 para. 1 LAMal). With another deductible or an alternative model, you can only change at the end of the year.\n\nPrepare the letter: ${k.lettre}\nGet a call back from an adviser: ${RAPPEL.en}`,
      url: k.lettre,
      alarmes: [{ joursAvant: 14 }, { joursAvant: 7 }],
    };
  }
  const date = prochain(today, 11, 31);
  return {
    uid: uidIcs("3a-31-decembre", date),
    date,
    annuel: true,
    titre: fr ? "Dernier jour pour un versement 3a déductible cette année" : "Last day for a pillar 3a payment deductible this year",
    description: fr
      ? `Pour être déduit du revenu de cette année, le versement doit être crédité sur le compte 3a au plus tard le 31 décembre. Pour les virements, beaucoup de banques fixent une date limite quelques jours plus tôt ; vérifiez celle de votre banque.\n\nTaux des comptes 3a${N}: ${k.taux3a}\nÉconomie d’impôt${N}: ${k.impot3a}\nÊtre rappelé par un conseiller${N}: ${RAPPEL.fr}`
      : `To be deducted from this year’s income, the payment must be credited to the 3a account by 31 December at the latest. Many banks set a cut-off date for transfers a few days earlier, so it is worth checking with yours.\n\n3a interest rates: ${k.taux3a}\nTax savings: ${k.impot3a}\nGet a call back from an adviser: ${RAPPEL.en}`,
    url: k.taux3a,
    alarmes: [{ joursAvant: 21 }, { joursAvant: 7 }],
  };
}

/* Date limite calculée par la lettre de résiliation (assurance de base ou complémentaire). */
export function evenementLettre(type: "lamal" | "lca", dl: Date, fin: Date, l: Langue = "fr"): EvenementIcs {
  const fr = l === "fr";
  const k = LIENS[l];
  const f = (d: Date) => dateTexte(d, fr ? "fr" : "en");
  const quoi = type === "lamal" ? (fr ? "l’assurance de base" : "basic health insurance") : fr ? "la complémentaire" : "supplementary insurance";
  const base = type === "lamal" ? (fr ? "art. 7 LAMal" : "art. 7 LAMal") : fr ? "art. 35a LCA" : "art. 35a LCA";
  return {
    uid: uidIcs(`lettre-${type}`, dl),
    date: dl,
    titre: fr ? `Dernier jour de réception de la lettre de résiliation de ${quoi}` : `Last day for your insurer to receive the letter cancelling ${quoi}`,
    description: fr
      ? `D’après le calcul de la lettre de résiliation, votre assureur doit recevoir la lettre au plus tard aujourd’hui pour une fin de contrat le ${f(fin)} (${base}). Mieux vaut l’envoyer en recommandé une semaine avant.${type === "lca" ? " Pour une complémentaire, attendez d’être accepté par le nouvel assureur avant de résilier." : ""}\n\nRefaire la lettre${N}: ${k.lettre}\nÊtre rappelé par un conseiller${N}: ${RAPPEL.fr}`
      : `According to the cancellation letter calculation, your insurer must receive the letter by today at the latest for the contract to end on ${f(fin)} (${base}). Sending it by registered mail a week earlier is safer.${type === "lca" ? " For supplementary insurance, wait until the new insurer has accepted you before cancelling." : ""}\n\nRedo the letter: ${k.lettre}\nGet a call back from an adviser: ${RAPPEL.en}`,
    url: k.lettre,
    alarmes: [{ joursAvant: 14 }, { joursAvant: 7 }],
  };
}

/* ---- Échéances des contrats saisies par le visiteur (page « Rappels d'échéance ») ---- */

export type TypeContrat = "auto" | "menage" | "complementaire" | "juridique" | "vie" | "autre";
export type Contrat = { type: TypeContrat; nom?: string; echeance: Date; preavis: number };

const GUIDE: Record<TypeContrat, { fr: string; en: string }> = {
  auto: { fr: "/assurance-auto/", en: "/en/car-insurance/" },
  menage: { fr: "/assurance-menage-rc/", en: "/en/household-and-liability-insurance/" },
  complementaire: { fr: "/complementaire-sante/", en: "/en/supplementary-health-insurance/" },
  juridique: { fr: "/protection-juridique/", en: "/en/legal-protection-insurance/" },
  vie: { fr: "/3e-pilier/", en: "/en/pillar-3a/" },
  autre: { fr: "/guides/", en: "/en/guides/" },
};
export const NOM_CONTRAT: Record<TypeContrat, { fr: string; en: string }> = {
  auto: { fr: "Assurance auto", en: "Car insurance" },
  menage: { fr: "Assurance ménage et RC privée", en: "Household and personal liability insurance" },
  complementaire: { fr: "Complémentaire santé", en: "Supplementary health insurance" },
  juridique: { fr: "Protection juridique", en: "Legal protection insurance" },
  vie: { fr: "Assurance vie ou 3e pilier", en: "Life insurance or pillar 3a policy" },
  autre: { fr: "Autre contrat", en: "Other contract" },
};
export const guideContrat = (t: TypeContrat, l: Langue) => `${SITE}${GUIDE[t][l]}`;

/* Recule de n mois ; une fin de mois reste une fin de mois (31.12 - 3 mois = 30.09), comme src/lib/engines/delais.ts. */
export function moinsMoisIcs(d: Date, n: number): Date {
  const fin = d.getDate() === dim(d.getFullYear(), d.getMonth());
  let m = d.getMonth() - n, y = d.getFullYear();
  while (m < 0) { m += 12; y--; }
  return new Date(y, m, fin ? dim(y, m) : Math.min(d.getDate(), dim(y, m)));
}

/* Un contrat donne un événement annuel au dernier jour de réception de la résiliation (échéance moins le préavis),
   avec une alarme un mois avant, puis une semaine avant. Si cette date est passée, on prend l'échéance suivante. */
export function evenementContrat(c: Contrat, i: number, today: Date, l: Langue = "fr"): EvenementIcs {
  const fr = l === "fr";
  const t = d0(today);
  let ech = d0(c.echeance);
  let dl = moinsMoisIcs(ech, c.preavis);
  for (let k = 0; dl < t && k < 50; k++) {
    ech = new Date(ech.getFullYear() + 1, ech.getMonth(), ech.getDate());
    dl = moinsMoisIcs(ech, c.preavis);
  }
  /* RRULE annuelle sur un 29 février : on ramène au 28 pour que le rappel revienne chaque année. */
  if (dl.getMonth() === 1 && dl.getDate() === 29) dl = new Date(dl.getFullYear(), 1, 28);
  const nom = (c.nom ?? "").trim().slice(0, 80) || NOM_CONTRAT[c.type][l];
  const f = (d: Date) => dateTexte(d, fr ? "fr" : "en", { annee: false });
  const mois = fr ? `${c.preavis} mois` : `${c.preavis} month${c.preavis > 1 ? "s" : ""}`;
  return {
    uid: uidIcs(`contrat-${i + 1}-${c.type}`, dl),
    date: dl,
    annuel: true,
    titre: fr ? `${nom}${N}: dernier jour pour résilier` : `${nom}: last day to cancel`,
    description: fr
      ? `Votre contrat arrive à échéance le ${f(ech)}. Avec un préavis de ${mois}, l’assureur doit recevoir votre résiliation au plus tard aujourd’hui ; sinon, le contrat se renouvelle en général pour un an. Le préavis exact figure dans votre police et vos conditions générales (art. 35a LCA pour la règle légale).\n\nGuide${N}: ${guideContrat(c.type, l)}\nÊtre rappelé par un conseiller${N}: ${RAPPEL.fr}`
      : `Your contract renews on ${f(ech)}. With ${mois}’ notice, your insurer must receive your cancellation by today at the latest; otherwise the contract usually renews for a year. The exact notice period is in your policy and general terms and conditions (art. 35a LCA for the legal rule).\n\nGuide: ${guideContrat(c.type, l)}\nGet a call back from an adviser: ${RAPPEL.en}`,
    url: guideContrat(c.type, l),
    alarmes: [{ joursAvant: 30 }, { joursAvant: 7 }],
  };
}
