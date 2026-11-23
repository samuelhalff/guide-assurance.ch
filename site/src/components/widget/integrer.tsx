"use client";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import { suivre } from "@/lib/analytics";
import { Choix } from "@/components/outils/choix";

/* Code d'intégration d'un widget : aperçu (iframe), code à copier, choix de la région pour la prime.
   Aucune mesure ici : la copie du code n'est pas comptée. */
export type Choix = { valeur: string; libelle: string };

export function CodeWidget({
  base,
  chemin,
  titre,
  hauteur,
  locale = "fr",
  choix,
  libelleChoix,
}: {
  base: string; // adresse absolue du widget, avec barre finale (code à copier)
  chemin: string; // même adresse, relative (aperçu sur la page)
  titre: string;
  hauteur: number | Record<string, number>;
  locale?: Locale;
  choix?: Choix[];
  libelleChoix?: string;
}) {
  const en = locale === "en";
  const [sel, setSel] = useState(choix?.[0]?.valeur ?? "");
  const [etat, setEtat] = useState("");
  const src = sel ? `${base}${sel}/` : base;
  const apercu = sel ? `${chemin}${sel}/` : chemin;
  const h = typeof hauteur === "number" ? hauteur : (hauteur[sel] ?? hauteur[""] ?? 300);
  const code = `<iframe src="${src}" title="${titre}" width="100%" height="${h}" style="border:0;max-width:420px" loading="lazy"></iframe>`;
  const id = base.replace(/[^a-z0-9]+/gi, "-");
  async function copier() {
    try {
      await navigator.clipboard.writeText(code);
      setEtat(en ? "Code copied." : "Code copié.");
      suivre("code_integration_copie", { widget: id, methode: "bouton" });
    } catch {
      setEtat(en ? "Copying did not work. Select the code by hand." : "La copie n’a pas fonctionné. Sélectionnez le code à la main.");
    }
  }
  return (
    <div className="widget-bloc">
      {choix ? (
        <div className="champ">
          <label htmlFor={`choix-${id}`}>{libelleChoix}</label>
          <Choix id={`choix-${id}`} value={sel} onChange={(v) => { setSel(v); setEtat(""); }} options={choix.map((c) => ({ value: c.valeur, label: c.libelle }))} />
        </div>
      ) : null}
      <iframe className="widget-apercu" src={apercu} title={titre} width="100%" height={h} loading="lazy" />
      <label className="code-label" htmlFor={`code-${id}`}>{en ? "Code to paste into your page" : "Code à coller dans votre page"}</label>
      <textarea id={`code-${id}`} className="saisie code-widget" readOnly rows={4} value={code} onFocus={(e) => e.currentTarget.select()} />
      <div className="actions">
        <button type="button" className="bouton second" onClick={copier}>{en ? "Copy the code" : "Copier le code"}</button>
        <span className="copie-ok" role="status">{etat}</span>
      </div>
    </div>
  );
}
