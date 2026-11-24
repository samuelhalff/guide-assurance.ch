"use client";
import { useState } from "react";
import { TELEPHONE_ERREURS, chiffresSaisis, formaterTelephone, normaliserTelephone } from "@shared/demande/telephone";
import { Input } from "@/components/ui/input";
import { ESPACE_FINE as NB } from "@/lib/nombres";

type Locale = "fr" | "en";

const T = {
  fr: {
    tel: "Téléphone",
    aide: "Un numéro suisse, ou un numéro français précédé de +33.",
    ok: { CH: "Numéro suisse", FR: "Numéro français", INTL: "Numéro international" },
  },
  en: {
    tel: "Phone",
    aide: "A Swiss number, or a French number starting with +33.",
    ok: { CH: "Swiss number", FR: "French number", INTL: "International number" },
  },
} as const;

/* Champ téléphone des deux formulaires. Pendant la frappe : erreur en ligne dès que le numéro est assez long ou que le
   champ a été quitté, et confirmation du numéro reconnu ; rien ne bloque avant l'envoi. `erreur` : message de l'envoi refusé. */
export function ChampTelephone({ locale, value, onChange, erreur, id: base = "tel" }: { locale: Locale; value: string; onChange: (v: string) => void; erreur?: string; /** Identifiant du champ (deux formulaires sur une page). */ id?: string }) {
  const t = T[locale];
  const [quitte, setQuitte] = useState(false);
  const r = normaliserTelephone(value);
  const enCours = !r.ok && r.raison !== "vide" && (quitte || chiffresSaisis(value) >= 10 || r.raison === "caracteres" || r.raison === "long");
  const message = erreur ?? (enCours && !r.ok ? TELEPHONE_ERREURS[r.raison][locale] : undefined);
  const id = message ? `err-${base}` : r.ok ? `ok-${base}` : `aide-${base}`;
  return (
    <div className="champ">
      <label htmlFor={base}>{t.tel}</label>
      <Input
        id={base}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="079 123 45 67"
        maxLength={24}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setQuitte(true)}
        aria-describedby={id}
        aria-invalid={message ? true : undefined}
      />
      <div aria-live="polite">
        {message ? (
          <p className="erreur-champ" id={`err-${base}`}>{message}</p>
        ) : r.ok ? (
          <p className="aide tel-ok" id={`ok-${base}`}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t.ok[r.pays]}
            {locale === "fr" ? `${NB}: ` : ": "}
            <span className="tel-num">{formaterTelephone(r.e164)}</span>
          </p>
        ) : (
          <p className="aide" id={`aide-${base}`}>{t.aide}</p>
        )}
      </div>
    </div>
  );
}

/* Erreur d'envoi (null si le numéro est bon) et numéro E.164. */
export function verifierTelephone(value: string, locale: Locale): { erreur: string | null; e164: string | null } {
  const r = normaliserTelephone(value);
  return r.ok ? { erreur: null, e164: r.e164 } : { erreur: TELEPHONE_ERREURS[r.raison][locale], e164: null };
}
