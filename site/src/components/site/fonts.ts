import { Archivo, Archivo_Narrow } from "next/font/google";

/* Polices auto-hébergées au build (aucun appel à Google côté visiteur).
   Archivo variable avec l'axe de largeur : le nom du logo est composé en font-stretch 122 %. */
export const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
export const archivoNarrow = Archivo_Narrow({ subsets: ["latin"], variable: "--font-archivo-narrow", display: "swap" });
