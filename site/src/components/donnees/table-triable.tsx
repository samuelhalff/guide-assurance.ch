"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  className = "table-donnees",
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
  /* Toutes les colonnes après la première sont des nombres : variante « chiffres » (alignées à droite). */
  const chiffres = colonnes.slice(1).every((c) => c.num);
  const droite = (c: Colonne) => (!chiffres && c.num ? "text-right" : undefined);
  return (
    <Table variant={chiffres ? "chiffres" : "default"} className={className}>
      <TableCaption>{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          {colonnes.map((c) => (
            <TableHead
              key={c.cle}
              scope="col"
              className={droite(c)}
              aria-sort={tri.cle === c.cle ? (tri.sens === "asc" ? "ascending" : "descending") : undefined}
            >
              {c.triable === false ? (
                c.titre
              ) : (
                <Button type="button" variant="entete" size="herite" className="tri min-h-8" onClick={() => changer(c.cle, c.num)} aria-label={`${aide}${locale === "fr" ? " " : ""}: ${c.titre}`}>
                  {c.titre}
                  <span className="fleche" aria-hidden="true">{tri.cle === c.cle ? (tri.sens === "asc" ? "▲" : "▼") : "↕"}</span>
                </Button>
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {triees.map((l) => (
          <TableRow key={l.id}>
            {colonnes.map((c, i) => {
              const cell = l.cellules[c.cle];
              const contenu = cell.gras ? <b>{cell.texte}</b> : cell.texte;
              return i === 0 ? (
                <TableHead key={c.cle} scope="row">{contenu}</TableHead>
              ) : (
                <TableCell key={c.cle} className={droite(c)}>{contenu}</TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
