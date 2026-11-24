"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { abs } from "@/lib/site";
import { DICT, type Locale } from "@/lib/i18n";
import { suivre } from "@/lib/analytics";

/* « Partager l'outil » : Web Share API, sinon copie du lien. L'adresse partagée est toujours l'adresse canonique
   de l'outil : elle ne porte jamais de revenu, de date ni aucune donnée saisie. */
export function PartagerOutil({ path, title, text, locale = "fr" }: { path: string; title: string; text: string; locale?: Locale }) {
  const [etat, setEtat] = useState("");
  const t = DICT[locale];
  async function partager() {
    const url = abs(path);
    suivre("outil_partage", { outil: path });
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        if ((e as DOMException)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setEtat(t.lienCopie);
    } catch {
      setEtat(locale === "en" ? `Could not copy the link: ${url}` : `Le lien n’a pas pu être copié : ${url}`);
    }
  }
  return (
    <div className="partage">
      <Button type="button" variant="commande" size="commande" className="font-narrow text-base text-lac-encre" onClick={partager}>
        <svg className="size-[18px]" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 13V3M6 6.5L10 2.5l4 4M4 10v6.5h12V10" />
        </svg>
        {t.partager}
      </Button>
      <span className="partage-ok" role="status">{etat}</span>
    </div>
  );
}
