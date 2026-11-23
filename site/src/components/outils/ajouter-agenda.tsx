"use client";
import { useState } from "react";
import { suivre, versGA } from "@/lib/analytics";
import { calendrierIcs, type EvenementIcs } from "@/lib/ics";
import type { Locale } from "@/lib/i18n";

/* « Ajouter à mon agenda » : le fichier .ics est créé dans le navigateur et téléchargé ; rien ne part vers un serveur.
   Mesure : ics_telecharge { type } seulement, jamais une date ni un nom saisi. */
export type TypeIcs = "lamal" | "semestre" | "3a" | "echeances" | "lettre_lamal" | "lettre_lca" | "contrats";

export function telechargerIcs(contenu: string, fichier: string) {
  const blob = new Blob([contenu], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function IconeAgenda({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4M12 13v5M9.5 15.5h5" />
    </svg>
  );
}

export function BoutonAgenda({
  type,
  evenements,
  fichier,
  locale = "fr",
  className = "bouton second",
  children,
  disabled,
}: {
  type: TypeIcs;
  evenements: () => EvenementIcs[];
  fichier: string;
  locale?: Locale;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const [etat, setEtat] = useState("");
  const en = locale === "en";
  function ajouter() {
    const ev = evenements();
    if (!ev.length) return;
    telechargerIcs(calendrierIcs(ev, { langue: en ? "EN" : "FR" }), fichier);
    suivre("ics_telecharge", { type });
    versGA("file_download", { file_extension: "ics", file_name: `${type}.ics` });
    setEtat(
      en
        ? "The calendar file has been downloaded. Open it to add the reminder to your calendar."
        : "Le fichier d’agenda est téléchargé. Ouvrez-le pour ajouter le rappel à votre agenda.",
    );
  }
  return (
    <>
      <button type="button" className={`${className} bouton-agenda`} onClick={ajouter} disabled={disabled}>
        <IconeAgenda size={17} />
        {children}
      </button>
      <span className="agenda-ok" role="status">{etat}</span>
    </>
  );
}
