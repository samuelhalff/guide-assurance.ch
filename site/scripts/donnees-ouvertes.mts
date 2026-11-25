/* Fichiers CSV des données ouvertes (licence CC BY 4.0), produits avec les mêmes moteurs que les pages du site :
     primes-2027-regions.csv               statistiques des primes LAMal 2027 par région de prime et profil type
     economie-impot-3a-communes-2026.csv   économie d'impôt d'un versement 3a, commune par commune, profil type
     taux-3a-historique.csv                relevés hebdomadaires des taux des comptes 3a
     taux-3a-archives.csv                  taux 3a par banque lus dans les copies archivées (Internet Archive) des pages des banques
   Usage : node --no-warnings scripts/donnees-ouvertes.mts <dossier>   (depuis site/) */
import fs from "node:fs";
import path from "node:path";
import { csvRegions } from "../src/lib/engines/regions-primes.ts";
import { csvCommunes3a } from "../src/lib/engines/communes-3a.ts";
import { csvArchives, csvHistorique } from "../src/lib/engines/historique-3a.ts";

const dossier = process.argv[2];
if (!dossier) throw new Error("dossier de sortie manquant");
fs.mkdirSync(dossier, { recursive: true });
const fichiers: Record<string, string> = {
  "primes-2027-regions.csv": csvRegions(),
  "economie-impot-3a-communes-2026.csv": csvCommunes3a(),
  "taux-3a-historique.csv": csvHistorique(),
  "taux-3a-archives.csv": csvArchives(),
};
for (const [nom, contenu] of Object.entries(fichiers)) {
  fs.writeFileSync(path.join(dossier, nom), contenu);
  console.log(`${nom} : ${contenu.trim().split("\n").length - 1} lignes`);
}
