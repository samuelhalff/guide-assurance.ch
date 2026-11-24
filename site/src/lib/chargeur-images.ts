/* Chargeur next/image pour l'export statique : pas de serveur d'optimisation, on sert les variantes
   préparées dans public/ (Pillow, Lanczos, WebP qualité 88). next/image construit le srcset à partir de
   images.deviceSizes (next.config.ts). Le src donné à <Image> est le nom de l'image sans largeur
   (« /brand/bouquetin-paysage.webp ») ; chaque variante porte sa largeur dans son nom (-720, -1080, -1448).
   Pour chaque largeur demandée, on rend la plus petite variante qui la couvre, sinon la plus grande.
   Le ?v= (cache) est conservé. Une image sans variantes est servie telle quelle (prop unoptimized). */
const VARIANTES: Record<string, readonly number[]> = {
  "/brand/bouquetin-paysage.webp": [720, 1080, 1448],
  "/brand/bouquetin-paysage-nuit.webp": [720, 1080, 1448],
};

export default function chargeurImages({ src, width }: { src: string; width: number; quality?: number }) {
  const [chemin, requete] = src.split("?");
  const variantes = VARIANTES[chemin];
  const largeur = variantes && (variantes.find((w) => w >= width) ?? variantes[variantes.length - 1]);
  const url = largeur ? chemin.replace(/\.webp$/, `-${largeur}.webp`) : chemin;
  return requete ? `${url}?${requete}` : url;
}

/* Propriétés d'une balise img ordinaire (rendue côté serveur) pour une image de public/ : srcset construit avec le
   chargeur ci-dessus aux largeurs de images.deviceSizes (next.config.ts). Remplace le composant Image de next/image,
   dont le code client (une dizaine de Ko) serait sinon téléchargé et hydraté sur chaque page. */
const LARGEURS = [720, 1080, 1448] as const;
export function proprietesImage(src: string, o: { width: number; height: number; sizes: string; alt: string; priority?: boolean }) {
  return {
    src: chargeurImages({ src, width: LARGEURS[LARGEURS.length - 1] }),
    srcSet: LARGEURS.map((w) => `${chargeurImages({ src, width: w })} ${w}w`).join(", "),
    sizes: o.sizes,
    width: o.width,
    height: o.height,
    alt: o.alt,
    loading: o.priority ? ("eager" as const) : ("lazy" as const),
    decoding: "async" as const,
    ...(o.priority ? { fetchPriority: "high" as const } : {}),
  };
}
