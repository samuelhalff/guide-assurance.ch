/* Données des frais du 3e pilier (src/data/frais-3a.json) ; règles de tri et de présentation dans lib/engines/frais3a.ts. */
import D from "@/data/frais-3a.json";
import { trierTitres, type FraisCompte, type Titres3a } from "@/lib/engines/frais3a";

export * from "@/lib/engines/frais3a";
export const FRAIS_VERIFIE_LE: string = D.verifie_le;
export const FRAIS_COMPTES = D.comptes as Record<string, FraisCompte>;
export const TITRES_3A: Titres3a[] = trierTitres(D.titres as Titres3a[]);
