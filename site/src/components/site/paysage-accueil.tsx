/* Tête de l'accueil : le bouquetin en papier plié sur son rocher, devant les Alpes (brand/bouquetin).
   Version de nuit pour le thème sombre. Image décorative : le titre porte le sens.
   Sous 1080 px l'image occupe toute la largeur (accueil.css) : le téléphone charge la variante 720 ou 1080
   selon sa densité d'écran ; au-delà, l'image fait au plus 1448 px. proprietesImage (lib/chargeur-images.ts, variantes de public/brand ; le ?v= change avec l'original)
   rend une balise img ordinaire dans le HTML : pas de composant Image de next/image côté client, donc pas de code
   d'image à télécharger ni à hydrater sur chaque page. L'image du jour est chargée en priorité haute (fetchPriority) : elle est dans le HTML du premier écran, sans lien de préchargement, car un lien de préchargement entre dans la charge utile RSC de l'accueil et ferait télécharger l'image par toute page qui préchargerait l'accueil (lien du logo). */
import { proprietesImage } from "@/lib/chargeur-images";

const SIZES = "(max-width: 1080px) 100vw, 1448px";
const BASE = { sizes: SIZES, alt: "", width: 1448, height: 1086 } as const;

export function PaysageAccueil() {
  const jour = proprietesImage("/brand/bouquetin-paysage.webp?v=2", { ...BASE, priority: true });
  const nuit = proprietesImage("/brand/bouquetin-paysage-nuit.webp?v=lune2", BASE);
  return (
    <div className="paysage" aria-hidden="true">
      <picture>
        <img {...jour} alt="" className="paysage-jour" />
      </picture>
      <picture>
        <img {...nuit} alt="" className="paysage-nuit" />
      </picture>
    </div>
  );
}
