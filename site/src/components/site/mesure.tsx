"use client";
import { useEffect, useState } from "react";
import { CONSENTEMENT_REQUIS, MESURE_ACTIVE, apresChargement, demarrerPostHog, ecrireChoix, lireChoix } from "@/lib/analytics";

const TXT = {
  fr: {
    texte: "Nous utilisons des cookies de mesure d’audience pour améliorer les guides. Vous pouvez les refuser.",
    oui: "Accepter",
    non: "Refuser",
    lien: "En savoir plus",
    href: "/confidentialite/#mesure",
    region: "Cookies",
  },
  en: {
    texte: "We use analytics cookies to improve the guides. You can decline them.",
    oui: "Accept",
    non: "Decline",
    lien: "Learn more",
    href: "/en/privacy/#measurement",
    region: "Cookies",
  },
} as const;

/* Démarre PostHog et affiche le bandeau tant qu'aucun choix n'est enregistré. Les états Google par défaut
   (par région) et GTM sont posés par le script du <head> (amorceGTM). Les deux boutons ont le même poids. */
export function Mesure({ locale = "fr" }: { locale?: "fr" | "en" }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!MESURE_ACTIVE) return;
    const c = lireChoix();
    /* PostHog (environ 220 Ko) se charge après l'affichage ; les événements antérieurs attendent dans la file. */
    apresChargement(() => void demarrerPostHog(lireChoix() === "oui"));
    if (CONSENTEMENT_REQUIS && c === null) setVisible(true);
    const rouvrir = () => setVisible(true);
    window.addEventListener("mesure:rouvrir", rouvrir);
    return () => window.removeEventListener("mesure:rouvrir", rouvrir);
  }, []);
  if (!visible) return null;
  const t = TXT[locale];
  const choisir = (c: "oui" | "non") => {
    ecrireChoix(c);
    void demarrerPostHog(c === "oui");
    setVisible(false);
  };
  return (
    <div className="consentement" role="region" aria-label={t.region}>
      <p>
        {t.texte} <a href={t.href}>{t.lien}</a>
      </p>
      <div className="consentement-actions">
        <button type="button" className="commande-cadre" onClick={() => choisir("non")}>
          {t.non}
        </button>
        <button type="button" className="commande-cadre" onClick={() => choisir("oui")}>
          {t.oui}
        </button>
      </div>
    </div>
  );
}

/* Lien « Cookies » du pied de page pour revoir son choix. */
export function RouvrirMesure() {
  if (!CONSENTEMENT_REQUIS) return null;
  return (
    <button type="button" className="lien-pied" onClick={() => window.dispatchEvent(new Event("mesure:rouvrir"))}>
      Cookies
    </button>
  );
}
