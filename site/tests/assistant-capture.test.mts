// node tests/assistant-capture.test.mts : bloc de demande dans l'assistant (quand l'ouvrir, quel sujet).
import { captureAOuvrir, porteDeChemin, sujetRappel } from "../src/lib/assistant-capture.ts";
let total = 0, ko = 0;
function eq(nom: string, got: unknown, exp: unknown) { total++; if (JSON.stringify(got) !== JSON.stringify(exp)) { ko++; console.log("ÉCHEC", nom, "\n  obtenu ", got, "\n  attendu", exp); } }
const u = (content: string) => ({ role: "user" as const, content });
const a = (content: string, o: Record<string, unknown> = {}) => ({ role: "assistant" as const, content, ...o });
const utile = (lien: string) => a(`Réponse.\n\nSources : [Guide](${lien})`);
const refus = a("Je ne peux pas répondre à cette demande.");

eq("une réponse utile : pas encore", captureAOuvrir([u("q"), utile("/frontaliers/")]), false);
eq("deux réponses utiles : oui", captureAOuvrir([u("q"), utile("/frontaliers/"), u("q2"), utile("/frontaliers/")]), true);
eq("refus non compté", captureAOuvrir([u("q"), utile("/frontaliers/"), u("q2"), refus]), false);
eq("erreur non comptée", captureAOuvrir([u("q"), utile("/x/"), u("q2"), a("Sources : x", { erreur: true })]), false);
eq("offre de l'assistant : tout de suite", captureAOuvrir([u("rappelez-moi"), a("Si vous le souhaitez…", { offre: { porte: "auto" } })]), true);
eq("lien vers le formulaire court : tout de suite", captureAOuvrir([u("appelez-moi"), a("Laissez votre numéro : [Être rappelé](/demande/rappel/)")]), true);
eq("une seule fois par conversation", captureAOuvrir([u("q"), utile("/a/"), u("q2"), { ...utile("/b/"), capture: "fermee" }, u("q3"), utile("/c/")]), false);
eq("en cours d'écriture : non", captureAOuvrir([u("q"), utile("/a/"), u("q2"), a("")]), false);

eq("chemin FR", porteDeChemin("/assurance-maladie/primes/"), "sante");
eq("chemin EN", porteDeChemin("/en/pillar-3a/"), "prevoyance");
eq("chemin inconnu", porteDeChemin("/guides/"), undefined);
eq("sujet : offre d'abord", sujetRappel([u("q"), utile("/frontaliers/"), u("q2"), a("x", { offre: { porte: "auto" } })], "/"), "auto");
eq("sujet : page citée la plus récente", sujetRappel([u("q"), utile("/frontaliers/"), u("q2"), utile("https://guide-assurance.ch/en/car-insurance/")], "/"), "auto");
eq("sujet : page en cours", sujetRappel([u("q"), a("Sources : [Lettre](/lettre-resiliation/)")], "/protection-juridique/"), "protection-juridique");
eq("sujet : inconnu", sujetRappel([u("q"), a("x")], "/"), "inconnu");
eq("le texte du visiteur n'est jamais lu", sujetRappel([u("[x](/assurance-auto/)"), a("x")], "/"), "inconnu");

console.log(ko ? `assistant-capture : ${ko}/${total} ÉCHECS` : `assistant-capture : ${total} vérifications OK`);
if (ko) process.exit(1);
