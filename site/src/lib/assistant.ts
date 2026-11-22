/* Assistant : textes, appel de /api/assistant (flux NDJSON) et rendu sûr du markdown des réponses.
   La conversation reste dans l'onglet (sessionStorage) : rien n'est enregistré côté serveur. */
import { PORTES_DEF, type Porte } from "@shared/demande/portes";

const N = " ";

export const TEXTE_ASSISTANT = {
  fr: {
    ouvrir: "Poser une question à l’assistant",
    bouton: `Une question${N}?`,
    titre: "Assistant Guide Assurance",
    sousTitre: "Réponses tirées de nos guides et des textes de loi",
    fermer: "Fermer l’assistant",
    nouvelle: "Nouvelle conversation",
    accueil: `Bonjour. Je réponds aux questions sur les assurances en Suisse à partir des guides du site, avec leurs sources. Je ne compare pas les assureurs et je ne dis pas lequel choisir.`,
    exemples: [
      `Je peux encore changer de caisse pour janvier${N}?`,
      `Frontalier à Genève${N}: LAMal ou assurance française${N}?`,
      `Combien verser sur un 3e pilier en 2027${N}?`,
    ],
    exemplesTitre: "Par exemple",
    champ: "Votre question",
    placeholder: "Votre question…",
    envoyer: "Envoyer",
    reflexion: "L’assistant écrit…",
    pied: "Guide Assurance n’enregistre pas cette conversation. Merci de ne pas y indiquer d’informations de santé.",
    piedLien: "Confidentialité",
    piedHref: "/confidentialite/#assistant",
    rappelTitre: "Être rappelé par un conseiller",
    rappelTexte: "C’est gratuit et sans engagement. Le formulaire reprend ces éléments, que vous vérifiez avant de donner votre accord dans le formulaire lui-même.",
    rappelBouton: "Ouvrir le formulaire",
    ne: (a: number) => `Né(e) en ${a}`,
    personnes: (n: number) => (n >= 4 ? "4 personnes ou plus" : n === 1 ? "1 personne" : `${n} personnes`),
    npa: (n: string) => `NPA ${n}`,
    erreurs: {
      reseau: "La réponse n’est pas arrivée. Vérifiez votre connexion et réessayez.",
      limite: "Trop de messages en peu de temps. Réessayez dans quelques minutes.",
      session: "Cette conversation a atteint sa limite de 20 messages. Commencez-en une nouvelle.",
      quotidien: "L’assistant a atteint sa limite du jour. Nos guides restent à votre disposition.",
      indisponible: "L’assistant est momentanément indisponible. Nos guides restent à votre disposition.",
      verification: "La vérification anti-robot n’a pas abouti. Réessayez dans un instant.",
      long: "Votre message est trop long (600 caractères au plus).",
    },
  },
  en: {
    ouvrir: "Ask the assistant a question",
    bouton: "A question?",
    titre: "Guide Assurance assistant",
    sousTitre: "Answers drawn from our guides and the law",
    fermer: "Close the assistant",
    nouvelle: "New conversation",
    accueil: "Hello. I answer questions about insurance in Switzerland from the site’s guides, with their sources. I don’t compare insurers or tell you which one to choose.",
    exemples: [
      "Can I still switch health insurer for January?",
      "I just moved to Lausanne, do I need health insurance?",
      "How much can I pay into pillar 3a in 2027?",
    ],
    exemplesTitre: "For example",
    champ: "Your question",
    placeholder: "Your question…",
    envoyer: "Send",
    reflexion: "The assistant is writing…",
    pied: "Guide Assurance does not record this conversation. Please don’t share health information.",
    piedLien: "Privacy",
    piedHref: "/en/privacy/#assistant",
    rappelTitre: "Get a call back from an adviser",
    rappelTexte: "It is free and without commitment. The form picks up these details, which you check before giving your consent in the form itself.",
    rappelBouton: "Open the form",
    ne: (a: number) => `Born in ${a}`,
    personnes: (n: number) => (n >= 4 ? "4 or more people" : n === 1 ? "1 person" : `${n} people`),
    npa: (n: string) => `Postcode ${n}`,
    erreurs: {
      reseau: "The answer did not come through. Check your connection and try again.",
      limite: "Too many messages in a short time. Try again in a few minutes.",
      session: "This conversation has reached its limit of 20 messages. Start a new one.",
      quotidien: "The assistant has reached its daily limit. Our guides are still available.",
      indisponible: "The assistant is temporarily unavailable. Our guides are still available.",
      verification: "The anti-robot check did not complete. Try again in a moment.",
      long: "Your message is too long (600 characters at most).",
    },
  },
} as const;

export type Offre = { porte: Porte; besoin?: string[]; npa?: string; birthYear?: number; householdSize?: number };
export type Message = { role: "user" | "assistant"; content: string; notice?: string; offre?: Offre | null; erreur?: boolean };

/* Puces lisibles des critères repris dans le formulaire. */
export function pucesOffre(o: Offre, locale: "fr" | "en"): string[] {
  const t = TEXTE_ASSISTANT[locale];
  const def = PORTES_DEF[o.porte];
  const out: string[] = [];
  const besoins = (o.besoin ?? []).map((c) => def.besoin.choix.find((x) => x.code === c)?.label[locale]).filter((x): x is string => Boolean(x));
  if (besoins.length) out.push(...besoins);
  else out.push(def.label[locale]);
  if (o.npa) out.push(t.npa(o.npa));
  if (o.birthYear) out.push(t.ne(o.birthYear));
  if (o.householdSize) out.push(t.personnes(o.householdSize));
  return out;
}

export type Evt =
  | { t: "start"; session: string }
  | { t: "d"; v: string }
  | { t: "replace"; v: string }
  | { t: "done"; notice: string; offer: Offre | null }
  | { t: "error"; error: string };

export class ErreurAssistant extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

/* Envoie la conversation et lit la réponse en flux, événement par événement. */
export async function demander(
  corps: { locale: "fr" | "en"; messages: { role: "user" | "assistant"; content: string }[]; session?: string; turnstileToken?: string },
  surEvt: (e: Evt) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
    signal,
  });
  if (!res.ok || !res.body) {
    let code = "server";
    try {
      code = ((await res.json()) as { error?: string }).error ?? code;
    } catch {
      /* corps illisible */
    }
    throw new ErreurAssistant(code, res.status);
  }
  const lecteur = res.body.getReader();
  const dec = new TextDecoder();
  let tampon = "";
  for (;;) {
    const { value, done } = await lecteur.read();
    if (done) break;
    tampon += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = tampon.indexOf("\n")) !== -1) {
      const ligne = tampon.slice(0, nl).trim();
      tampon = tampon.slice(nl + 1);
      if (!ligne) continue;
      try {
        surEvt(JSON.parse(ligne) as Evt);
      } catch {
        /* ligne incomplète ou invalide : ignorée */
      }
    }
  }
}

/* ===== Markdown restreint : paragraphes, listes, gras, liens ===== */
export type Inline = { k: "t"; v: string } | { k: "b"; v: string } | { k: "a"; v: string; href: string; ext: boolean };
export type Bloc = { k: "p"; v: Inline[] } | { k: "ul"; v: Inline[][] } | { k: "ol"; v: Inline[][] };

const RE_INLINE = /\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g;

/* Lien admis : chemin du site, ou https. Le reste reste du texte. */
export function lienSur(href: string): { href: string; ext: boolean } | null {
  if (/^\/[A-Za-z0-9\-_/.#]*$/.test(href) && !href.startsWith("//")) return { href, ext: false };
  try {
    const u = new URL(href);
    /* Lien complet vers le site lui-même (ex. comparateur prérempli « #npa=…&p=… ») : même onglet. */
    if (u.protocol === "https:" && u.hostname === "guide-assurance.ch") return { href: u.pathname + u.hash, ext: false };
    if (u.protocol === "https:") return { href: u.toString(), ext: true };
  } catch {
    /* adresse invalide */
  }
  return null;
}

export function inline(s: string): Inline[] {
  const out: Inline[] = [];
  let i = 0;
  for (const m of s.matchAll(RE_INLINE)) {
    if (m.index! > i) out.push({ k: "t", v: s.slice(i, m.index) });
    if (m[1]) out.push({ k: "b", v: m[1] });
    else {
      const l = lienSur(m[3]);
      out.push(l ? { k: "a", v: m[2], ...l } : { k: "t", v: m[2] });
    }
    i = m.index! + m[0].length;
  }
  if (i < s.length) out.push({ k: "t", v: s.slice(i) });
  return out;
}

export function blocs(md: string): Bloc[] {
  const out: Bloc[] = [];
  for (const para of md.replace(/\r/g, "").split(/\n{2,}/)) {
    const lignes = para.split("\n").filter((l) => l.trim());
    if (!lignes.length) continue;
    const puces = lignes.every((l) => /^\s*[-*•]\s+/.test(l));
    const nums = lignes.every((l) => /^\s*\d+[.)]\s+/.test(l));
    if (puces) out.push({ k: "ul", v: lignes.map((l) => inline(l.replace(/^\s*[-*•]\s+/, ""))) });
    else if (nums) out.push({ k: "ol", v: lignes.map((l) => inline(l.replace(/^\s*\d+[.)]\s+/, ""))) });
    else {
      /* Paragraphe suivi d'une liste sans ligne vide : on sépare. */
      const premiere = lignes.findIndex((l) => /^\s*[-*•]\s+/.test(l));
      if (premiere > 0 && lignes.slice(premiere).every((l) => /^\s*[-*•]\s+/.test(l))) {
        out.push({ k: "p", v: inline(lignes.slice(0, premiere).join(" ")) });
        out.push({ k: "ul", v: lignes.slice(premiere).map((l) => inline(l.replace(/^\s*[-*•]\s+/, ""))) });
      } else out.push({ k: "p", v: inline(lignes.join(" ")) });
    }
  }
  return out;
}

const CLE = "ga-assistant-fil";

export function lireFil(): { messages: Message[]; session?: string } {
  try {
    const v: unknown = JSON.parse(sessionStorage.getItem(CLE) ?? "null");
    if (v && typeof v === "object" && Array.isArray((v as { messages?: unknown }).messages)) return v as { messages: Message[]; session?: string };
  } catch {
    /* rien */
  }
  return { messages: [] };
}

export function ecrireFil(f: { messages: Message[]; session?: string }) {
  try {
    if (!f.messages.length) sessionStorage.removeItem(CLE);
    else sessionStorage.setItem(CLE, JSON.stringify(f));
  } catch {
    /* navigation privée */
  }
}
