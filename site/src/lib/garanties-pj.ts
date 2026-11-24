/* Garanties des contrats de protection juridique privée et circulation, relevées dans les conditions générales (CGA)
   publiques des assureurs (src/data/garanties-pj.json). Ordre alphabétique de l'assureur, puis du produit ; aucun
   score, aucun classement. Une valeur que le document ne donne pas reste « non précisé ». */
import DATA from "@/data/garanties-pj.json";
import { ESPACE_FINE as N } from "@/lib/nombres";
import type { Locale } from "@/lib/i18n";

export type Txt = { fr: string; en: string };
export type Statut = "oui" | "option" | "conseil" | "non" | "nd";
export const DOMAINES = [
  "travail",
  "bail",
  "contrats",
  "assurances",
  "patients",
  "dommages",
  "penal",
  "circulation",
  "voyage",
  "internet",
  "propriete",
  "famille",
  "fiscal",
  "administratif",
] as const;
export type Domaine = (typeof DOMAINES)[number];

export type Contrat = {
  id: string;
  /* Marque sous laquelle le contrat est vendu ; `porteur` : l'assureur nommé dans les CGA. */
  assureur: string;
  porteur: string;
  produit: string;
  couverture: "prive" | "circulation" | "prive-circulation";
  variante?: Txt;
  doc: { titre: string; version: string; url: string; langue: string };
  domaines: Record<Domaine, { s: Statut; note?: Txt }>;
  plafond: { suisse: Txt; europe: Txt; monde: Txt };
  carence: Txt;
  franchise: Txt;
  valeurMin: Txt;
  libreChoix: Txt;
  exclusions: { fr: string[]; en: string[] };
};

export const LU_LE: string = DATA.lu_le;
export const CONTRATS: Contrat[] = (DATA.contrats as Contrat[])
  .slice()
  .sort((a, b) => a.assureur.localeCompare(b.assureur, "fr") || a.produit.localeCompare(b.produit, "fr"));
export const NB_ASSUREURS = new Set(CONTRATS.map((c) => c.assureur)).size;
export const NB_CONTRATS = CONTRATS.length;
export const NB_PORTEURS = new Set(CONTRATS.map((c) => c.porteur)).size;

export const NOM_DOMAINE: Record<Locale, Record<Domaine, string>> = {
  fr: {
    travail: "Droit du travail",
    bail: "Bail (locataire)",
    contrats: "Contrats (achats, services)",
    assurances: "Litiges avec une assurance",
    patients: "Droit des patients",
    dommages: "Réclamer des dommages-intérêts",
    penal: "Défense pénale",
    circulation: "Circulation routière",
    voyage: "Voyage",
    internet: "Internet et e-réputation",
    propriete: "Propriété et voisinage",
    famille: "Famille et succession",
    fiscal: "Droit fiscal",
    administratif: "Droit administratif",
  },
  en: {
    travail: "Employment law",
    bail: "Tenancy (tenant)",
    contrats: "Contracts (purchases, services)",
    assurances: "Disputes with an insurer",
    patients: "Patients’ rights",
    dommages: "Claiming damages",
    penal: "Criminal defence",
    circulation: "Road traffic",
    voyage: "Travel",
    internet: "Internet and online reputation",
    propriete: "Property and neighbours",
    famille: "Family and inheritance",
    fiscal: "Tax law",
    administratif: "Administrative law",
  },
};

export const NOM_STATUT: Record<Locale, Record<Statut, string>> = {
  fr: { oui: "Couvert", option: "En option", conseil: "Conseil seulement", non: "Non couvert", nd: "Non précisé" },
  en: { oui: "Covered", option: "Optional", conseil: "Advice only", non: "Not covered", nd: "Not stated" },
};

export const NOM_COUVERTURE: Record<Locale, Record<Contrat["couverture"], string>> = {
  fr: { prive: "Privé", circulation: "Circulation", "prive-circulation": "Privé et circulation" },
  en: { prive: "Private", circulation: "Traffic", "prive-circulation": "Private and traffic" },
};

/* Version texte du tableau pour llms-full.txt : un bloc par contrat, mêmes valeurs que la page. */
export function garantiesPjMarkdown(l: Locale, url: string): string {
  const fr = l === "fr";
  const out = [
    fr ? `## Protection juridique${N}: ce que couvrent les contrats` : "## Legal protection insurance: what the policies cover",
    "",
    fr
      ? `Source${N}: ${url}. Conditions générales lues le ${LU_LE}, ordre alphabétique, sans prime ni classement. Le contrat et ses CGA font foi.`
      : `Source: ${url}. General terms read on ${LU_LE}, alphabetical order, no premiums or ranking. The policy and its terms prevail.`,
  ];
  for (const c of CONTRATS) {
    const couverts = DOMAINES.filter((d) => c.domaines[d].s === "oui").map((d) => NOM_DOMAINE[l][d]);
    const options = DOMAINES.filter((d) => c.domaines[d].s === "option").map((d) => NOM_DOMAINE[l][d]);
    out.push(
      "",
      `### ${c.assureur}, ${c.produit}`,
      "",
      `- ${fr ? "Assureur" : "Insurer"}${fr ? N : ""}: ${c.porteur}${c.variante ? ` (${c.variante[l]})` : ""}`,
      `- ${fr ? "Document" : "Document"}${fr ? N : ""}: ${c.doc.titre}, ${c.doc.version}, ${c.doc.url}`,
      `- ${fr ? "Plafond par cas, Suisse / Europe / monde" : "Limit per case, Switzerland / Europe / worldwide"}${fr ? N : ""}: ${c.plafond.suisse[l]} / ${c.plafond.europe[l]} / ${c.plafond.monde[l]}`,
      `- ${fr ? "Délai de carence" : "Waiting period"}${fr ? N : ""}: ${c.carence[l]}`,
      `- ${fr ? "Franchise" : "Excess"}${fr ? N : ""}: ${c.franchise[l]}`,
      `- ${fr ? "Libre choix de l’avocat" : "Free choice of lawyer"}${fr ? N : ""}: ${c.libreChoix[l]}`,
      `- ${fr ? "Domaines couverts" : "Areas covered"}${fr ? N : ""}: ${couverts.join(", ") || "-"}`,
      ...(options.length ? [`- ${fr ? "En option" : "Optional"}${fr ? N : ""}: ${options.join(", ")}`] : []),
    );
  }
  return out.join("\n") + "\n";
}
