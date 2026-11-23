// Questions propres à une porte (payload `details`) : validation (site et leads) et lignes lisibles (fiche, e-mail).
import { FRANCHISES_LAMAL, PORTES_DEF, PROFILS_PRIMES_MAX, QUAND_CHOIX, QUAND_MAX_JOURS, type ChampDetail, type Locale, type Porte } from "./portes";

export type ValeurDetail = string | number | string[];
export type Details = Record<string, ValeurDetail>;

const JOUR = 86_400_000;
const isoJour = (d: Date) => d.toISOString().slice(0, 10);

/** Bornes d'une date précise : d'hier (fuseaux) à aujourd'hui + QUAND_MAX_JOURS. */
export function bornesQuand(now = new Date()): { min: string; max: string } {
  return { min: isoJour(new Date(now.getTime() - JOUR)), max: isoJour(new Date(now.getTime() + QUAND_MAX_JOURS * JOUR)) };
}

export function champsDetails(porte: Porte, ecran?: 0 | 1 | 2 | 3): ChampDetail[] {
  const tous = PORTES_DEF[porte].details ?? [];
  return ecran === undefined ? tous : tous.filter((c) => c.ecran === ecran);
}

/** Une personne du comparateur : « AAAA.F.A ». */
export interface ProfilPrime {
  annee: number;
  franchise: number;
  accident: boolean;
}
const RE_PROFIL = /^(\d{4})\.(\d{1,4})\.([01])$/;
export function lireProfilPrime(v: string, now = new Date()): ProfilPrime | null {
  const m = RE_PROFIL.exec(v);
  if (!m) return null;
  const annee = Number(m[1]);
  const franchise = Number(m[2]);
  if (annee < 1900 || annee > now.getUTCFullYear() || !(FRANCHISES_LAMAL as readonly number[]).includes(franchise)) return null;
  return { annee, franchise, accident: m[3] === "1" };
}
export const ecrireProfilPrime = (p: ProfilPrime) => `${p.annee}.${p.franchise}.${p.accident ? 1 : 0}`;

function valeurValide(c: ChampDetail, v: ValeurDetail, now: Date): boolean {
  switch (c.type) {
    case "choix":
      return typeof v === "string" && c.choix.some((x) => x.code === v);
    case "choix-multiple":
      return Array.isArray(v) && v.length > 0 && new Set(v).size === v.length && v.every((x) => c.choix.some((y) => y.code === x));
    case "nombre":
      return typeof v === "number" && Number.isInteger(v) && v >= c.min && v <= c.max;
    case "texte":
      return typeof v === "string" && v.trim().length >= 2 && v.length <= c.max && /^[^\p{Cc}<>]+$/u.test(v);
    case "quand": {
      if (typeof v !== "string") return false;
      if (QUAND_CHOIX.some((x) => x.code === v && x.code !== "date")) return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`)) || isoJour(new Date(`${v}T00:00:00Z`)) !== v) return false;
      const { min, max } = bornesQuand(now);
      return v >= min && v <= max;
    }
    case "profils-primes":
      return Array.isArray(v) && v.length > 0 && v.length <= PROFILS_PRIMES_MAX && v.every((x) => lireProfilPrime(x, now) !== null);
  }
}

/** Codes des champs en erreur (inconnus, manquants ou invalides). Tableau vide = valide. */
export function erreursDetails(porte: Porte, details: Details | undefined, now = new Date(), ecran?: 0 | 1 | 2 | 3): string[] {
  const champs = champsDetails(porte, ecran);
  const d = details ?? {};
  const out: string[] = [];
  if (ecran === undefined) for (const k of Object.keys(d)) if (!champs.some((c) => c.code === k)) out.push(k);
  for (const c of champs) {
    const v = d[c.code];
    if (v === undefined) {
      if (!c.optionnel) out.push(c.code);
    } else if (!valeurValide(c, v, now)) out.push(c.code);
  }
  return out;
}

const NNBSP = " ";
const milliers = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "’");

/** Valeur lisible d'un champ (fiche leads, e-mail, récapitulatif). */
export function texteDetail(c: ChampDetail, v: ValeurDetail, locale: Locale = "fr"): string {
  const lib = (code: string, choix: { code: string; label: Record<Locale, string> }[]) => choix.find((x) => x.code === code)?.label[locale] ?? code;
  switch (c.type) {
    case "choix":
      return lib(String(v), c.choix);
    case "choix-multiple":
      return (Array.isArray(v) ? v : [String(v)]).map((x) => lib(x, c.choix)).join(", ");
    case "nombre": {
      const n = typeof v === "number" ? (c.min >= 1000 && c.code !== "miseEnCirculation" ? milliers(v) : String(v)) : String(v);
      return c.unite ? (c.unite[locale] === "CHF" ? `CHF ${n}` : `${n}${locale === "fr" ? NNBSP : " "}${c.unite[locale]}`) : n;
    }
    case "texte":
      return String(v);
    case "quand": {
      const s = String(v);
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, j] = s.split("-");
        return locale === "fr" ? `Le ${j}.${m}.${y}` : `On ${j}.${m}.${y}`;
      }
      return lib(s, QUAND_CHOIX);
    }
    case "profils-primes":
      return (Array.isArray(v) ? v : [String(v)])
        .map((x) => {
          const p = lireProfilPrime(x);
          if (!p) return x;
          return locale === "fr"
            ? `${p.annee}${NNBSP}: franchise CHF ${milliers(p.franchise)}, ${p.accident ? "avec" : "sans"} accident`
            : `${p.annee}: deductible CHF ${milliers(p.franchise)}, ${p.accident ? "with" : "without"} accident cover`;
        })
        .join(locale === "fr" ? `${NNBSP}; ` : "; ");
  }
}

/** Lignes [libellé, valeur] des réponses propres à la porte, dans l'ordre des questions. */
export function lignesDetails(porte: Porte, details: Details | undefined | null, locale: Locale = "fr"): [string, string][] {
  if (!details) return [];
  return champsDetails(porte)
    .filter((c) => details[c.code] !== undefined)
    .map((c) => [(c.court ?? c.label)[locale], texteDetail(c, details[c.code], locale)]);
}
