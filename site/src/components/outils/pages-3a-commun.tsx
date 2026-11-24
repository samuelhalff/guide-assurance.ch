import { FRAIS_COMPTES, FRAIS_VERIFIE_LE, TITRES_3A } from "@/lib/frais3a";
import * as I from "@/lib/engines/impot3a";
import { COMPTES_3A, RELEVE_LE, dateCh } from "@/lib/taux3a";
import { nombre as formaterNombre } from "@/lib/nombres";

/* Éléments communs aux pages « Taux des comptes 3a » (pages-3a.tsx) et « Économie d'impôt 3a » (pages-impot-3a.tsx).
   Les deux pages sont dans des fichiers séparés : le calculateur d'économie d'impôt (composant client, barèmes) ne doit
   pas être chargé par la page des taux, qui ne l'affiche pas. */
export const nfFr = { format: (x: number) => formaterNombre(x, 0, "fr") };
export const nfEn = { format: (x: number) => formaterNombre(x, 0, "en") };
export const P26 = I.PLAFONDS["2026"];
export const P27 = I.PLAFONDS["2027"];
export const NB = COMPTES_3A.length;
export const RELEVE = dateCh(RELEVE_LE);
export const NT = TITRES_3A.length;
export const FRAIS_LE = dateCh(FRAIS_VERIFIE_LE);
export const GRATUITS = COMPTES_3A.filter((c) => FRAIS_COMPTES[c.id]?.tenue_chf === 0).length;
export const mediane = (() => {
  const t = COMPTES_3A.map((c) => c.taux).sort((a, b) => a - b);
  return t.length % 2 ? t[(t.length - 1) / 2] : (t[t.length / 2 - 1] + t[t.length / 2]) / 2;
})();

export const CADENAS = (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M5 9V6a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <rect x="3" y="9" width="14" height="10" rx="1.5" fill="currentColor" />
  </svg>
);

export type Faq = { q: string; a: string };

export function Faqs({ faq, maj }: { faq: Faq[]; maj: string }) {
  return (
    <div className="wrap faq">
      {faq.map((f) => (
        <section key={f.q}>
          <h2>{f.q}</h2>
          <p>{f.a}</p>
        </section>
      ))}
      <p className="maj">{maj}</p>
    </div>
  );
}

