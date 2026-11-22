/* Tête de l'accueil : le bouquetin en papier plié sur son rocher, devant les Alpes (brand/bouquetin).
   Version de nuit pour le thème sombre. Image décorative : le titre porte le sens.
   Sous 1080 px l'image occupe toute la largeur (accueil.css) : le téléphone charge la variante 720 ou 1080
   selon sa densité d'écran ; au-delà, l'image fait au plus 1448 px. Variantes tirées des originaux (Pillow,
   Lanczos, WebP qualité 88) ; le ?v= change avec l'original. */
const SIZES = "(max-width: 1080px) 100vw, 1448px";
const srcset = (base: string, v: string) => `/brand/${base}-720.webp?v=${v} 720w, /brand/${base}-1080.webp?v=${v} 1080w, /brand/${base}.webp?v=${v} 1448w`;

export function PaysageAccueil() {
  return (
    <div className="paysage" aria-hidden="true">
      <img className="paysage-jour" src="/brand/bouquetin-paysage.webp?v=2" srcSet={srcset("bouquetin-paysage", "2")} sizes={SIZES} alt="" width={1448} height={1086} fetchPriority="high" decoding="async" />
      <img className="paysage-nuit" src="/brand/bouquetin-paysage-nuit.webp?v=lune2" srcSet={srcset("bouquetin-paysage-nuit", "lune2")} sizes={SIZES} alt="" width={1448} height={1086} loading="lazy" decoding="async" />
    </div>
  );
}
