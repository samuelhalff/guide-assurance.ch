/* Tête de l'accueil : le bouquetin en papier plié sur son rocher, devant les Alpes (brand/bouquetin).
   Version de nuit pour le thème sombre. Image décorative : le titre porte le sens. */
export function PaysageAccueil() {
  return (
    <div className="paysage" aria-hidden="true">
      <img className="paysage-jour" src="/brand/bouquetin-paysage.webp?v=2" alt="" width={1448} height={1086} fetchPriority="high" decoding="async" />
      <img className="paysage-nuit" src="/brand/bouquetin-paysage-nuit.webp?v=lune2" alt="" width={1448} height={1086} loading="lazy" decoding="async" />
    </div>
  );
}
