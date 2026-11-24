/* Tête de l'accueil : le bouquetin en papier plié sur son rocher, devant les Alpes (brand/bouquetin).
   Version de nuit pour le thème sombre. Image décorative : le titre porte le sens.
   Sous 1080 px l'image occupe toute la largeur (accueil.css) : le téléphone charge la variante 720 ou 1080
   selon sa densité d'écran ; au-delà, l'image fait au plus 1448 px. next/image construit le srcset, le chargeur
   (lib/chargeur-images.ts) sert les variantes de public/brand ; le ?v= change avec l'original. */
import Image from "next/image";

const SIZES = "(max-width: 1080px) 100vw, 1448px";

export function PaysageAccueil() {
  return (
    <div className="paysage" aria-hidden="true">
      <Image className="paysage-jour" src="/brand/bouquetin-paysage.webp?v=2" sizes={SIZES} alt="" width={1448} height={1086} priority />
      <Image className="paysage-nuit" src="/brand/bouquetin-paysage-nuit.webp?v=lune2" sizes={SIZES} alt="" width={1448} height={1086} />
    </div>
  );
}
