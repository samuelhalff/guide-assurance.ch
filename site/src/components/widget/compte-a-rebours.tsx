"use client";
import { useEffect, useState } from "react";
import { jours, lamal } from "@/lib/engines/delais";
import type { Locale } from "@/lib/i18n";
import { d0, dateTexte } from "@/lib/dates";
import { ESPACE_FINE as T } from "@/lib/nombres";

/* Compte à rebours jusqu'au dernier jour de réception de la résiliation LAMal (30 novembre, art. 7, al. 2, LAMal).
   Calculé avec la date de l'appareil ; le HTML statique porte la date du build, remplacée dès l'affichage. */

export function CompteARebours({ l, aujourdhuiIso, lien }: { l: Locale; aujourdhuiIso: string; lien: string }) {
  const fr = l === "fr";
  const [today, setToday] = useState(() => d0(new Date(`${aujourdhuiIso}T00:00`)));
  useEffect(() => setToday(d0(new Date())), []);
  const r = lamal(today, false);
  const dl = r.dl!;
  const debut = new Date(r.fin!.getFullYear() + 1, 0, 1);
  const n = jours(today, dl);
  const date = dateTexte(dl, fr ? "fr" : "en", { jour: true });
  const annee = debut.getFullYear();
  return (
    <>
      <p className="w-titre">{fr ? `Changer d’assurance de base pour ${annee}` : `Changing basic health insurance for ${annee}`}</p>
      <p className="w-chiffre" aria-live="polite">
        {n === 0 ? (
          <span className="w-accent">{fr ? "Dernier jour" : "Last day"}</span>
        ) : (
          <>
            {n}
            <small>{fr ? (n > 1 ? "jours" : "jour") : n > 1 ? "days left" : "day left"}</small>
          </>
        )}
      </p>
      <p className="w-texte">
        {fr
          ? `L’assureur doit recevoir la lettre de résiliation au plus tard le ${date} pour un changement au 1er janvier ${annee} (art. 7, al. 2, LAMal). Mieux vaut poster le recommandé une semaine avant.`
          : `Your insurer must receive the cancellation letter by ${date} at the latest for a change on 1 January ${annee} (art. 7 para. 2 LAMal). Posting it by registered mail a week earlier is safer.`}
      </p>
      <p className="w-texte">
        <a className="w-action" href={lien} target="_blank" rel="noopener">
          {fr ? `Préparer la lettre${T}: date limite et modèle` : "Prepare the letter: deadline and template"}
        </a>
      </p>
    </>
  );
}
