import { nombre } from "@/components/donnees/commun";
import type { Locale } from "@/lib/i18n";
import { enMois } from "@/lib/engines/historique-3a";

/* Graphique SVG d'une série datée (rendu statique, aucune bibliothèque) : une ligne, une bande facultative (par
   exemple du premier au troisième quartile), des repères verticaux datés (décisions de la BNS) et des points isolés
   (par exemple des relevés d'archives).
   Les dates sont « AAAA-MM » (mois) ou « AAAA-MM-JJ » (jour). Couleurs par jetons CSS (.graphique-3a, donnees.css) :
   lisible en thème clair comme en sombre. Les valeurs exactes restent dans un tableau ou un CSV à côté. */

export type PointGraphique = { date: string; valeur: number; bas?: number; haut?: number };
export type PointIsole = { date: string; valeur: number; libelle: string };
export type RepereDate = { date: string; libelle: string };

export { enMois };

export function GraphiqueSerie({
  id,
  locale,
  titre,
  desc,
  points,
  bande = false,
  reperes = [],
  isoles = [],
  legende,
}: {
  id: string;
  locale: Locale;
  titre: string;
  desc: string;
  points: PointGraphique[];
  bande?: boolean;
  reperes?: RepereDate[];
  isoles?: PointIsole[];
  legende: { ligne: string; bande?: string; isoles?: string; reperes?: string };
}) {
  const W = 640, Hh = 260, g = 44, d = 16, h = 16, b = 34;
  const ts = points.map((p) => enMois(p.date));
  const x0 = Math.min(...ts), x1 = Math.max(...ts);
  const hauts = [...points.map((p) => (bande && p.haut !== undefined ? p.haut : p.valeur)), ...isoles.map((p) => p.valeur)];
  const ymax = Math.max(0.5, Math.ceil(Math.max(...hauts) * 4) / 4);
  const X = (t: number) => (x1 === x0 ? (g + W - d) / 2 : g + ((t - x0) / (x1 - x0)) * (W - g - d));
  const Y = (v: number) => h + (1 - v / ymax) * (Hh - h - b);
  const f = (x: number) => x.toFixed(1);
  const ligne = points.map((p, i) => `${f(X(ts[i]))},${f(Y(p.valeur))}`).join(" ");
  const avecBande = bande && points.every((p) => p.bas !== undefined && p.haut !== undefined);
  const poly = avecBande
    ? [...points.map((p, i) => `${f(X(ts[i]))},${f(Y(p.haut!))}`), ...points.map((p, i) => `${f(X(ts[i]))},${f(Y(p.bas!))}`).reverse()].join(" ")
    : "";
  const graduations = Array.from({ length: Math.round(ymax / 0.25) + 1 }, (_, i) => i * 0.25);
  /* Un repère par année (janvier) ; libellé seulement s'il tient dans le cadre. */
  const a0 = Math.ceil(x0 / 12), a1 = Math.floor(x1 / 12);
  const annees = Array.from({ length: Math.max(0, a1 - a0 + 1) }, (_, i) => a0 + i).filter((a) => a * 12 >= x0 && a * 12 <= x1);
  const pas = annees.length > 10 ? 2 : 1;
  const visibles = reperes.filter((r) => enMois(r.date) >= x0 && enMois(r.date) <= x1);
  const dernier = points[points.length - 1];
  return (
    <figure className="graphique-3a">
      <svg viewBox={`0 0 ${W} ${Hh}`} role="img" aria-labelledby={`${id}-titre ${id}-desc`}>
        <title id={`${id}-titre`}>{titre}</title>
        <desc id={`${id}-desc`}>{desc}</desc>
        {graduations.map((v) => (
          <g key={v}>
            <line className="grille" x1={g} x2={W - d} y1={Y(v)} y2={Y(v)} />
            <text className="axe" x={g - 6} y={Y(v) + 4} textAnchor="end">{nombre(v, locale, 2)}</text>
          </g>
        ))}
        {annees.map((a, i) => (
          <g key={a}>
            <line className="grille" x1={X(a * 12)} x2={X(a * 12)} y1={Hh - b} y2={Hh - b + 5} />
            {i % pas === 0 && X(a * 12) > g + 18 && X(a * 12) < W - d - 18 ? (
              <text className="axe" x={X(a * 12)} y={Hh - 10} textAnchor="middle">{a}</text>
            ) : null}
          </g>
        ))}
        {visibles.map((r) => (
          <line key={r.date} className="repere" x1={X(enMois(r.date))} x2={X(enMois(r.date))} y1={h} y2={Hh - b}>
            <title>{r.libelle}</title>
          </line>
        ))}
        {avecBande ? <polygon className="bande" points={poly} /> : null}
        <polyline className="ligne moyenne" points={ligne} />
        {isoles.map((p) => (
          <circle key={`${p.date}-${p.libelle}`} className="point isole" cx={X(enMois(p.date))} cy={Y(p.valeur)} r={3.5}>
            <title>{p.libelle}</title>
          </circle>
        ))}
        {dernier ? <circle className="point moyenne" cx={X(ts[ts.length - 1])} cy={Y(dernier.valeur)} r={4} /> : null}
        <text className="axe" x={g - 6} y={10} textAnchor="end">%</text>
      </svg>
      <figcaption>
        <span className="cle moyenne">{legende.ligne}</span>
        {avecBande && legende.bande ? <span className="cle bande">{legende.bande}</span> : null}
        {isoles.length && legende.isoles ? <span className="cle isole">{legende.isoles}</span> : null}
        {visibles.length && legende.reperes ? <span className="cle repere">{legende.reperes}</span> : null}
      </figcaption>
    </figure>
  );
}
