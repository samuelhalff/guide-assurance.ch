/* Après l'affichage : fin du chargement de la page, puis un moment libre (3 s au plus). Les événements attendent dans `file`. */
export function apresChargement(f: () => void) {
  if (typeof window === "undefined") return;
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  const plusTard = () => (w.requestIdleCallback ? w.requestIdleCallback(f, { timeout: 3000 }) : setTimeout(f, 1));
  if (document.readyState === "complete") plusTard();
  else window.addEventListener("load", plusTard, { once: true });
}

/* Lance `charger` une seule fois, après l'affichage de la page. Par défaut : fin du chargement (load), puis un moment
   libre du navigateur. Avec `interaction`, le premier geste du visiteur (appui, touche, défilement) la lance aussitôt ;
   avec `immediat`, elle part tout de suite ; avec `delaiMax`, elle part au premier geste ou après ce délai (en ms), sans
   attendre la fin du chargement. Sert à garder hors du chemin du premier affichage le code qui n'a rien à montrer dans
   le HTML initial. Renvoie la fonction de nettoyage de l'effet. */
export function chargerApresAffichage(charger: () => void, opts: { interaction?: boolean; immediat?: boolean; delaiMax?: number } = {}): () => void {
  let lance = false;
  const une = () => {
    if (lance) return;
    lance = true;
    charger();
  };
  const evenements = opts.interaction ? (["pointerdown", "keydown", "scroll"] as const) : [];
  for (const e of evenements) window.addEventListener(e, une, { once: true, passive: true });
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  if (opts.immediat) une();
  else if (opts.delaiMax !== undefined) minuteur = setTimeout(une, opts.delaiMax);
  else apresChargement(une);
  return () => {
    for (const e of evenements) window.removeEventListener(e, une);
    if (minuteur !== undefined) clearTimeout(minuteur);
  };
}
