/* Chiffres clés des assureurs LAMal, OFSP, Statistique de l'assurance-maladie obligatoire 2024 (tableaux T 5.01, 5.03,
   5.07 et 5.10). Fichier produit par data/scripts/build_kvstat.py à partir de data/sources/kvstat-2024/. */
import D from "@/data/caisses-lamal-2024.json";

export type CodeCanton = (typeof D.cantons)[number];
export type Assureur = {
  no: number;
  nom: string;
  court?: string;
  effectifMoyen: number;
  fraisAdminParAssure: number;
  fraisAdminPctDepenses: number;
  reservesParAssure: number;
  resultatParAssure: number;
  solvabilitePct?: number;
  solvabiliteNote?: string;
  assures: Partial<Record<CodeCanton | "CH", number>>;
  part: Partial<Record<CodeCanton | "CH", number>>;
};
export type Zone = CodeCanton | "CH";
export type Tri = "nom" | "assures" | "frais" | "solvabilite";

export const META = D.meta;
/* Ligne « Total / Moyenne » du tableau 5.01. */
export const MOYENNE = D.moyenneCH;
export const CANTONS = D.cantons as CodeCanton[];
export const ASSUREURS: Assureur[] = D.assureurs as Assureur[];

/* Nom affiché : le nom court quand le fichier en donne un (début du nom officiel), sinon le nom officiel. */
export const nomAffiche = (a: Assureur) => a.court ?? a.nom;

export const NOM_CANTON: Record<"fr" | "en", Record<CodeCanton, string>> = {
  fr: { ZH: "Zurich", BE: "Berne", LU: "Lucerne", UR: "Uri", SZ: "Schwytz", OW: "Obwald", NW: "Nidwald", GL: "Glaris", ZG: "Zoug", FR: "Fribourg", SO: "Soleure", BS: "Bâle-Ville", BL: "Bâle-Campagne", SH: "Schaffhouse", AR: "Appenzell Rhodes-Extérieures", AI: "Appenzell Rhodes-Intérieures", SG: "Saint-Gall", GR: "Grisons", AG: "Argovie", TG: "Thurgovie", TI: "Tessin", VD: "Vaud", VS: "Valais", NE: "Neuchâtel", GE: "Genève", JU: "Jura" },
  en: { ZH: "Zurich", BE: "Bern", LU: "Lucerne", UR: "Uri", SZ: "Schwyz", OW: "Obwalden", NW: "Nidwalden", GL: "Glarus", ZG: "Zug", FR: "Fribourg", SO: "Solothurn", BS: "Basel-City", BL: "Basel-Landschaft", SH: "Schaffhausen", AR: "Appenzell Outer Rhodes", AI: "Appenzell Inner Rhodes", SG: "St. Gallen", GR: "Graubünden", AG: "Aargau", TG: "Thurgau", TI: "Ticino", VD: "Vaud", VS: "Valais", NE: "Neuchâtel", GE: "Geneva", JU: "Jura" },
};

/* Cantons romands d'abord (et Berne), puis les autres par ordre alphabétique du nom. */
export const PREMIERS: CodeCanton[] = ["GE", "VD", "VS", "FR", "NE", "JU", "BE"];
export function ordreCantons(locale: "fr" | "en"): CodeCanton[] {
  const reste = CANTONS.filter((c) => !PREMIERS.includes(c)).sort((a, b) => NOM_CANTON[locale][a].localeCompare(NOM_CANTON[locale][b], locale));
  return [...PREMIERS, ...reste];
}

/* Assureurs ayant des assurés dans la zone au 31.12.2024 (T 5.07). */
export const assuresDans = (a: Assureur, z: Zone) => a.assures[z] ?? 0;
export const partDans = (a: Assureur, z: Zone) => a.part[z] ?? 0;

/* Tri neutre : la valeur manquante (taux de solvabilité absent du tableau 5.03) va toujours en fin de liste. */
export function lignes(zone: Zone, tri: Tri, decroissant: boolean, locale: "fr" | "en" = "fr"): Assureur[] {
  const liste = ASSUREURS.filter((a) => assuresDans(a, zone) > 0);
  const valeur = (a: Assureur): number | undefined =>
    tri === "assures" ? assuresDans(a, zone) : tri === "frais" ? a.fraisAdminParAssure : tri === "solvabilite" ? a.solvabilitePct : undefined;
  const nom = (a: Assureur, b: Assureur) => nomAffiche(a).localeCompare(nomAffiche(b), locale, { sensitivity: "base" });
  return liste.sort((a, b) => {
    if (tri === "nom") return decroissant ? nom(b, a) : nom(a, b);
    const va = valeur(a);
    const vb = valeur(b);
    if (va === undefined && vb === undefined) return nom(a, b);
    if (va === undefined) return 1;
    if (vb === undefined) return -1;
    return (decroissant ? vb - va : va - vb) || nom(a, b);
  });
}

/* Chiffres cités dans le texte de la page, calculés sur les données. */
export function chiffresCles() {
  const frais = ASSUREURS.map((a) => a.fraisAdminParAssure);
  const total = ASSUREURS.reduce((s, a) => s + (a.assures.CH ?? 0), 0);
  const sol = ASSUREURS.filter((a) => a.solvabilitePct !== undefined);
  const parCanton = Object.fromEntries(CANTONS.map((c) => [c, ASSUREURS.filter((a) => assuresDans(a, c) > 0).length])) as Record<CodeCanton, number>;
  return {
    nb: ASSUREURS.length,
    totalAssures: total,
    fraisMin: Math.min(...frais),
    fraisMax: Math.max(...frais),
    pctMin: Math.min(...ASSUREURS.map((a) => a.fraisAdminPctDepenses)),
    pctMax: Math.max(...ASSUREURS.map((a) => a.fraisAdminPctDepenses)),
    nbSolvabilite: sol.length,
    solMin: Math.min(...sol.map((a) => a.solvabilitePct!)),
    solMax: Math.max(...sol.map((a) => a.solvabilitePct!)),
    sousCent: sol.filter((a) => a.solvabilitePct! < 100).length,
    parCanton,
  };
}

/* 2025-01-01 -> 1.1.2025 ; 2024-12-31 -> 31.12.2024 */
export const dateCourte = (iso: string) => iso.split("-").reverse().map(Number).join(".");
