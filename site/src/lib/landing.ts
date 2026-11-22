import type { Rubrique } from "@/lib/nav";

/* Pages produit en « landing » : bloc de tête (H1, réponse en une ligne, action principale, faits utiles avant une
   demande d'offre) au-dessus du guide. Opt-in par le bloc `landing:` du frontmatter (content/{fr,en}/*.md).
   Actions : outil public quand les prix sont publics (§ « données publiques d'abord »), sinon rappel par un conseiller. */
export type ActionLanding = "comparateur" | "simulateur" | "lettre" | "rappel";

/* Sujets du formulaire court « Être rappelé » (shared/demande/portes.ts, porte rappel). Aucun nouveau code ici :
   le schéma de leads n'accepte que ceux-là. Les branches sans sujet propre (auto, ménage, RC…) passent par « autre ». */
export const SUJETS_RAPPEL = ["sante", "frontaliers", "nouveaux-arrivants", "entreprises", "autre"] as const;
export type SujetRappel = (typeof SUJETS_RAPPEL)[number];

export type Landing = {
  action: ActionLanding;
  sujet: SujetRappel;
  objet: string; // « Un conseiller vous rappelle au sujet de {objet} »
  service: string; // schema.org Service.serviceType
  reponse: string;
  demande: string[];
  varie: string[];
  varieTitre?: string;
  demandeTitre?: string;
};

export function lireLanding(v: unknown): Landing | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const liste = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : []);
  const action = (["comparateur", "simulateur", "lettre", "rappel"] as const).find((a) => a === o.action);
  const sujet = SUJETS_RAPPEL.find((s) => s === o.sujet);
  if (!action || !sujet || typeof o.objet !== "string" || typeof o.service !== "string" || typeof o.reponse !== "string") {
    throw new Error(`Bloc landing incomplet : ${JSON.stringify(o).slice(0, 120)}`);
  }
  return {
    action,
    sujet,
    objet: o.objet,
    service: o.service,
    reponse: o.reponse,
    demande: liste(o.demande),
    varie: liste(o.varie),
    ...(typeof o.varieTitre === "string" ? { varieTitre: o.varieTitre } : {}),
    ...(typeof o.demandeTitre === "string" ? { demandeTitre: o.demandeTitre } : {}),
  };
}

/* Rubrique de navigation active d'une page produit (adresse française). */
export function rubriqueDePage(slugFr: string | undefined): Rubrique | undefined {
  if (!slugFr) return undefined;
  if (slugFr.startsWith("/assurance-maladie/") || slugFr === "/complementaire-sante/") return "sante";
  if (slugFr === "/frontaliers/") return "frontaliers";
  if (slugFr === "/nouveaux-arrivants/") return "arrivee";
  if (slugFr.startsWith("/entreprises/")) return "entreprises";
  return undefined;
}

/* Pages produit liées entre elles (adresses françaises). L'anglais passe par l'équivalent de chaque page. */
export const PRODUITS_LIES: Record<string, string[]> = {
  "/assurance-maladie/": ["/assurance-maladie/primes/", "/complementaire-sante/", "/assurance-accident/", "/nouveaux-arrivants/"],
  "/assurance-maladie/primes/": ["/assurance-maladie/", "/complementaire-sante/", "/frontaliers/"],
  "/complementaire-sante/": ["/assurance-maladie/", "/assurance-voyage/", "/assurance-accident/"],
  "/frontaliers/": ["/assurance-maladie/", "/nouveaux-arrivants/", "/assurance-accident/"],
  "/nouveaux-arrivants/": ["/assurance-maladie/", "/assurance-menage-rc/", "/assurance-auto/", "/assurance-accident/"],
  "/assurance-accident/": ["/assurance-maladie/", "/entreprises/laa/", "/assurance-voyage/"],
  "/assurance-menage-rc/": ["/assurance-batiment/", "/assurance-animaux/", "/protection-juridique/", "/cyber-prive/"],
  "/assurance-batiment/": ["/assurance-menage-rc/", "/protection-juridique/"],
  "/assurance-auto/": ["/assurance-menage-rc/", "/protection-juridique/", "/assurance-voyage/"],
  "/assurance-voyage/": ["/assurance-maladie/", "/complementaire-sante/", "/assurance-auto/"],
  "/assurance-animaux/": ["/assurance-menage-rc/", "/protection-juridique/"],
  "/protection-juridique/": ["/assurance-menage-rc/", "/assurance-auto/", "/cyber-prive/"],
  "/cyber-prive/": ["/assurance-menage-rc/", "/protection-juridique/", "/entreprises/cyber/"],
  "/entreprises/": ["/entreprises/lpp/", "/entreprises/laa/", "/entreprises/perte-de-gain-maladie/", "/entreprises/rc-professionnelle/"],
  "/entreprises/lpp/": ["/entreprises/laa/", "/entreprises/perte-de-gain-maladie/", "/entreprises/"],
  "/entreprises/laa/": ["/entreprises/lpp/", "/entreprises/perte-de-gain-maladie/", "/assurance-accident/"],
  "/entreprises/perte-de-gain-maladie/": ["/entreprises/laa/", "/entreprises/lpp/", "/entreprises/"],
  "/entreprises/rc-professionnelle/": ["/entreprises/cyber/", "/entreprises/assurance-choses/", "/entreprises/"],
  "/entreprises/cyber/": ["/entreprises/rc-professionnelle/", "/entreprises/assurance-choses/", "/cyber-prive/"],
  "/entreprises/assurance-choses/": ["/entreprises/rc-professionnelle/", "/entreprises/cyber/", "/assurance-batiment/"],
};

/* Cantons couverts par le site (Service.areaServed). Berne : le Jura bernois seulement, comme le comparateur. */
export const ZONE_DESSERVIE = [
  { "@type": "AdministrativeArea", name: "Genève" },
  { "@type": "AdministrativeArea", name: "Vaud" },
  { "@type": "AdministrativeArea", name: "Valais" },
  { "@type": "AdministrativeArea", name: "Fribourg" },
  { "@type": "AdministrativeArea", name: "Neuchâtel" },
  { "@type": "AdministrativeArea", name: "Jura" },
  { "@type": "AdministrativeArea", name: "Jura bernois" },
];

const N = " ";

export const TEXTE_LANDING = {
  fr: {
    rappelTitre: (objet: string) => `Un conseiller vous rappelle au sujet de ${objet}`,
    rappelBouton: "Être rappelé",
    rappelDetail: "Il suffit de votre nom et de votre numéro. L’appel est gratuit et ne vous engage à rien.",
    rappelSecond: `Une question avant de vous lancer${N}?`,
    rappelSecondLien: "Être rappelé par un conseiller",
    demandeTitre: `Que vous demandera-t-on${N}?`,
    varieTitre: `Qu’est-ce qui fait varier la prime${N}?`,
    integrite: "Aucun assureur ne paie pour figurer dans nos listes ni pour leur ordre. Le rappel vient d’un conseiller d’un courtier partenaire, sans frais pour vous.",
    integriteLien: "Nos liens avec les assureurs",
    integriteHref: "/independance/",
    simulateurTitre: `Frontalier${N}: LAMal ou assurance française${N}?`,
    simulateurTexte: "Le simulateur calcule, pour votre foyer, la prime LAMal 2027 et la cotisation française, à partir des chiffres de l’OFSP et de l’Urssaf.",
    simulateurBouton: "Lancer le simulateur",
    lettreBouton: "Préparer ma lettre",
    comparerTitre: "Comparer les primes LAMal 2027",
    lamalLien: "Voir d’abord les primes LAMal 2027 de votre commune",
    autresTitre: "Autres assurances",
  },
  en: {
    rappelTitre: (objet: string) => `An adviser calls you back about ${objet}`,
    rappelBouton: "Call me back",
    rappelDetail: "We only need your name and number. The call is free and commits you to nothing.",
    rappelSecond: "A question before you start?",
    rappelSecondLien: "Ask an adviser to call you back",
    demandeTitre: "What will you be asked?",
    varieTitre: "What changes the premium?",
    integrite: "No insurer pays to appear in our lists or for their order. The call comes from an adviser at a partner broker, at no cost to you.",
    integriteLien: "Our ties with insurers",
    integriteHref: "/en/independence/",
    simulateurTitre: "Cross-border worker: LAMal or French insurance?",
    simulateurTexte: "The calculator works out the 2027 LAMal premium and the French contribution for your household, from FOPH and Urssaf figures.",
    simulateurBouton: "Open the calculator",
    lettreBouton: "Prepare my letter",
    comparerTitre: "Compare 2027 LAMal premiums",
    lamalLien: "See the 2027 LAMal premiums for your area first",
    autresTitre: "Other insurance",
  },
} as const;

/* Typographie française du texte simple (frontmatter) : espace fine insécable avant ; : ? ! et après « (avant »). */
export function typoFr(s: string) {
  return s.replace(/ ([;:?!»])/g, `${N}$1`).replace(/« /g, `«${N}`);
}
