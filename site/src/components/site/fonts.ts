import { Archivo_Narrow } from "next/font/google";
import localFont from "next/font/local";

/* Polices auto-hébergées au build (aucun appel à Google côté visiteur).
   Archivo : sous-ensemble latin de la police variable officielle, ramené à l'axe de graisse 400 à 800 (la largeur est
   fixée à 100 %, 33 Ko au lieu de 90 Ko). Le nom du logo, seul texte composé en largeur 122 %, a sa propre face réduite
   à ses lettres (2 Ko, largeur 122 % et graisse 500 à 800 gravées dans le fichier). Les deux fichiers sont dérivés de
   la police variable d'Archivo (licence OFL) avec fontTools (varLib.instancer, subset). */
export const archivo = localFont({
  src: "../../fonts/archivo-latin-wght.woff2",
  weight: "400 800",
  style: "normal",
  variable: "--font-archivo",
  display: "swap",
  adjustFontFallback: "Arial",
});
export const archivoLogo = localFont({
  src: "../../fonts/archivo-logo.woff2",
  weight: "500 800",
  style: "normal",
  variable: "--font-archivo-logo",
  display: "swap",
  adjustFontFallback: "Arial",
});
export const archivoNarrow = Archivo_Narrow({ subsets: ["latin"], variable: "--font-archivo-narrow", display: "swap" });
