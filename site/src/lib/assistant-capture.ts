/* Bloc de demande en ligne de l'assistant : quand l'ouvrir et avec quel sujet. Fonctions pures, testées par
   tests/assistant-capture.test.mts. Le sujet est un code de la porte « rappel » choisi de façon déterministe ; aucun
   texte de la conversation n'en sort. */
import { PORTES_DEF, PORTE_RAPPEL, RAPPEL_SUJET_DEFAUT, type Porte } from "../../../shared/demande/portes.ts";

type MessageCapture = { role: "user" | "assistant"; content: string; offre?: { porte: Porte } | null; erreur?: boolean; capture?: string };

/* Pages du site → porte (FR et EN). Sert seulement à choisir le sujet du rappel, jamais à transmettre du texte. */
const PORTES_CHEMINS: [RegExp, Porte][] = [
  [/^\/(assurance-maladie|complementaire-sante|en\/health-insurance|en\/supplementary-health-insurance)(\/|$)/, "sante"],
  [/^\/(frontaliers|simulateur-frontalier|en\/cross-border-workers|en\/cross-border-calculator)(\/|$)/, "frontaliers"],
  [/^\/(nouveaux-arrivants|en\/moving-to-switzerland)(\/|$)/, "nouveaux-arrivants"],
  [/^\/(3e-pilier|en\/pillar-3a)(\/|$)/, "prevoyance"],
  [/^\/(entreprises|en\/business)(\/|$)/, "entreprises"],
  [/^\/(assurance-menage-rc|en\/household-and-liability-insurance)(\/|$)/, "menage-rc"],
  [/^\/(protection-juridique|en\/legal-protection-insurance)(\/|$)/, "protection-juridique"],
  [/^\/(assurance-auto|en\/car-insurance)(\/|$)/, "auto"],
];
export function porteDeChemin(chemin: string): Porte | undefined {
  return PORTES_CHEMINS.find(([re]) => re.test(chemin))?.[1];
}

const RE_LIEN = /\]\((?:https:\/\/guide-assurance\.ch)?(\/[^)\s#]*)/g;
const RE_SOURCES = /(^|\n)\s*Sources?\s?\u202f?:/;
const RE_RAPPEL = /\/demande\/rappel\/|\/en\/request\/call-back\//;

/* Réponse utile : une vraie réponse, avec sa ligne « Sources » (les refus hors sujet n'en ont pas). */
export const estReponseUtile = (m: MessageCapture) => m.role === "assistant" && !m.erreur && RE_SOURCES.test(m.content);
/* Offre de rappel faite par l'assistant (bouton de l'offre, ou lien vers le formulaire court quand le visiteur veut être appelé). */
export const estOffreRappel = (m: MessageCapture) => m.role === "assistant" && !m.erreur && (Boolean(m.offre) || RE_RAPPEL.test(m.content));

/* Faut-il ouvrir le bloc sous la dernière réponse ? Une seule fois par conversation : à la 2e réponse utile, ou tout de
   suite quand l'assistant propose le rappel. */
export function captureAOuvrir(messages: MessageCapture[]): boolean {
  if (messages.some((m) => m.capture)) return false;
  const dernier = messages[messages.length - 1];
  if (!dernier || dernier.role !== "assistant" || dernier.erreur || !dernier.content) return false;
  return estOffreRappel(dernier) || messages.filter(estReponseUtile).length >= 2;
}

/* Sujet du rappel (code de la porte « rappel ») : porte de l'offre la plus récente, sinon première page citée par la
   réponse la plus récente qui en cite une, sinon page en cours, sinon « je ne sais pas encore ». */
export function sujetRappel(messages: MessageCapture[], chemin: string): string {
  const codes = PORTES_DEF[PORTE_RAPPEL].besoin.choix.map((c) => c.code);
  const ok = (p: Porte | undefined) => (p && codes.includes(p) ? p : undefined);
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant" || m.erreur) continue;
    const o = ok(m.offre?.porte);
    if (o) return o;
    for (const l of m.content.matchAll(RE_LIEN)) {
      const p = ok(porteDeChemin(l[1]));
      if (p) return p;
    }
  }
  return ok(porteDeChemin(chemin)) ?? RAPPEL_SUJET_DEFAUT;
}
