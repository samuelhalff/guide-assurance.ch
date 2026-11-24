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
