"use client";
import { useMemo, useState } from "react";

/* Tableau HTML triable : rendu complet côté serveur (lisible sans JavaScript, indexable), tri au clic sur l'en-tête
   (bouton dans le <th>, aria-sort). Le tri ne touche que l'ordre d'affichage ; aucune valeur n'est envoyée. */
export type Colonne = { cle: string; titre: string; num?: boolean; triable?: boolean };
export type LigneTable = { id: string; cellules: Record<string, { texte: string; v: number | string; gras?: boolean }> };

export function TableTriable({
  colonnes,
  lignes,
  caption,
  triInitial,
  locale = "fr",
  className = "assureurs table-donnees",
}: {
  colonnes: Colonne[];
  lignes: LigneTable[];
  caption: string;
  triInitial: { cle: string; sens: "asc" | "desc" };
  locale?: "fr" | "en";
  className?: string;
}) {
  const [tri, setTri] = useState(triInitial);
  const triees = useMemo(() => {
    const out = [...lignes];
    const f = tri.sens === "asc" ? 1 : -1;
    out.sort((a, b) => {
      const x = a.cellules[tri.cle].v;
      const y = b.cellules[tri.cle].v;
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), locale === "fr" ? "fr" : "en");
      return c * f || a.id.localeCompare(b.id);
    });
    return out;
  }, [lignes, tri, locale]);
  const changer = (cle: string, num?: boolean) =>
    setTri((t) => (t.cle === cle ? { cle, sens: t.sens === "asc" ? "desc" : "asc" } : { cle, sens: num ? "desc" : "asc" }));
  const aide = locale === "fr" ? "Trier par" : "Sort by";
  return (
    <div className="defile-table">
      <table className={className}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {colonnes.map((c) => (
              <th
                key={c.cle}
                scope="col"
                className={c.num ? "num" : undefined}
                aria-sort={tri.cle === c.cle ? (tri.sens === "asc" ? "ascending" : "descending") : undefined}
              >
                {c.triable === false ? (
                  c.titre
                ) : (
                  <button type="button" className="tri" onClick={() => changer(c.cle, c.num)} aria-label={`${aide}${locale === "fr" ? " " : ""}: ${c.titre}`}>
                    {c.titre}
                    <span className="fleche" aria-hidden="true">{tri.cle === c.cle ? (tri.sens === "asc" ? "▲" : "▼") : "↕"}</span>
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {triees.map((l) => (
            <tr key={l.id}>
              {colonnes.map((c, i) => {
                const cell = l.cellules[c.cle];
                const contenu = cell.gras ? <b>{cell.texte}</b> : cell.texte;
                return i === 0 ? (
                  <th key={c.cle} scope="row">{contenu}</th>
                ) : (
                  <td key={c.cle} className={c.num ? "num" : undefined}>{contenu}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
