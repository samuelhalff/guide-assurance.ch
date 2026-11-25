"use client";
import { useState } from "react";
import type { LigneArchive } from "@/lib/engines/historique-3a";
import type { Locale } from "@/lib/i18n";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/* Liste dépliable des copies archivées d'une banque : chargée à l'ouverture (/data/taux-3a-archives.json), pour ne pas
   mettre les quelque 300 liens dans le HTML initial. Sans JavaScript, le lien vers le CSV donne les mêmes lignes. */
const URL_JSON = "/data/taux-3a-archives.json";
let cache: Promise<Record<string, LigneArchive[]>> | null = null;
const charger = () => (cache ??= fetch(URL_JSON).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))));

const dc = (iso: string) => iso.split("-").reverse().join(".");
const taux = (x: number, locale: Locale) => {
  const s = Math.abs(x * 100 - Math.round(x * 100)) < 1e-9 ? x.toFixed(2) : x.toFixed(3);
  return locale === "fr" ? s.replace(".", ",") : s;
};

/* Date de validité indiquée par la page : taux annoncé à l'avance (postérieure à la copie) ou en vigueur depuis. */
const validite = (l: LigneArchive, locale: Locale) => {
  const fr = locale === "fr";
  if (!l.v) return fr ? "non indiquée" : "not stated";
  if (l.v > l.d) return fr ? `annoncé, valable dès le ${dc(l.v)}` : `announced, valid from ${dc(l.v)}`;
  return fr ? `en vigueur depuis le ${dc(l.v)}` : `in force since ${dc(l.v)}`;
};

export function ListeArchives({ id, locale, titre, csv }: { id: string; locale: Locale; titre: string; csv: string }) {
  const fr = locale === "fr";
  const [lignes, setLignes] = useState<LigneArchive[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const ouvrir = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (!e.currentTarget.open || lignes) return;
    setErreur(false); // nouvel essai après un échec
    charger()
      .then((d) => {
        setLignes(d[id] ?? []);
        setErreur(false);
      })
      .catch(() => {
        cache = null;
        setErreur(true);
      });
  };
  return (
    <details className="archives-detail" onToggle={ouvrir}>
      <summary>{titre}</summary>
      {erreur ? (
        <p>
          {fr ? "Liste indisponible pour l’instant (refermez puis rouvrez pour réessayer). " : "List unavailable right now (close and reopen to try again). "}
          <a href={csv}>{fr ? "Toutes les copies (CSV)" : "All copies (CSV)"}</a>
        </p>
      ) : !lignes ? (
        <p aria-live="polite">{fr ? "Chargement…" : "Loading…"}</p>
      ) : (
        <Table variant="chiffres" className="table-donnees">
          <TableCaption>{fr ? "Taux de base du compte 3a mentionné dans chaque copie archivée, en % par an" : "Base rate of the pillar 3a account stated in each archived copy, in % a year"}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{fr ? "Copie archivée" : "Archived copy"}</TableHead>
              <TableHead scope="col">{fr ? "Taux mentionné dans la copie" : "Rate stated in the copy"}</TableHead>
              <TableHead scope="col">{fr ? "Validité indiquée" : "Validity stated"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...lignes].reverse().map((l) => (
              <TableRow key={`${l.d}-${l.t}`}>
                <TableHead scope="row">
                  <a href={l.u} rel="noopener nofollow">
                    <time dateTime={l.d}>{dc(l.d)}</time>
                  </a>
                </TableHead>
                <TableCell>
                  <b>{taux(l.t, locale)}</b>
                  {l.r ? <small>{fr ? "taux recommandé" : "recommended rate"}</small> : null}
                </TableCell>
                <TableCell>{validite(l, locale)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </details>
  );
}
