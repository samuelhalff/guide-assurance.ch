/* Chiffres de la bande de confiance, lus dans les données du site au build (composants serveur seulement : les
   fichiers de primes ne doivent pas partir dans le JavaScript du navigateur). */
import GE from "../../public/data/primes-2027/GE.json" with { type: "json" };
import VD from "../../public/data/primes-2027/VD.json" with { type: "json" };
import VS from "../../public/data/primes-2027/VS.json" with { type: "json" };
import FR from "../../public/data/primes-2027/FR.json" with { type: "json" };
import NE from "../../public/data/primes-2027/NE.json" with { type: "json" };
import JU from "../../public/data/primes-2027/JU.json" with { type: "json" };
import BE from "../../public/data/primes-2027/BE.json" with { type: "json" };
import PJ from "@/data/garanties-pj.json";
import AVIS from "@/data/avis.json";
import { ANNEE } from "@/lib/engines/primes";
import { avisAffichables, compterOffres, type Avis, type CantonPrimes } from "@/lib/confiance-core";

const CANTONS = [GE, VD, VS, FR, NE, JU, BE] as unknown as CantonPrimes[];

export const CONFIANCE = {
  annee: ANNEE,
  ...compterOffres(CANTONS),
  contratsPj: PJ.contrats.length,
};

export const AVIS_VALIDES = avisAffichables(AVIS as Avis, process.env.NEXT_PUBLIC_TRUSTPILOT_URL);
