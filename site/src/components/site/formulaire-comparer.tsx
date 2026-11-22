"use client";
import { useRef, useState } from "react";
import { outils } from "@/lib/nav";
import { suivre } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n";
import * as P from "@/lib/engines/primes";

/* Formulaire court du comparateur LAMal (NPA ou localité + année de naissance) pour la tête des pages produit santé.
   Même comportement que le formulaire de l'accueil (accueil-feuille.tsx, non modifié ici) : il mène au comparateur avec
   le profil après le # (#npa=1201&p=1990.300.0 = année.franchise.accident), relu puis retiré de l'adresse par le
   comparateur. Sans JavaScript, les champs n'ont pas de name : le bouton mène au comparateur sans rien dans l'adresse. */
const TXT = {
  fr: {
    form: "Comparer les primes LAMal 2027",
    lieu: "NPA ou localité",
    lieuPh: "1201 ou Lausanne",
    annee: "Année de naissance",
    anneePh: "1990",
    voir: "Voir les primes 2027",
    defaut: "Le calcul part de la franchise la plus basse, sans couverture accident. Vous pourrez modifier ces choix dans la liste des résultats.",
    anneeErr: "Indiquez l’année à quatre chiffres, par exemple 1990.",
  },
  en: {
    form: "Compare 2027 LAMal premiums",
    lieu: "Postcode or town",
    lieuPh: "1201 or Lausanne",
    annee: "Year of birth",
    anneePh: "1990",
    voir: "See 2027 premiums",
    defaut: "The calculation starts from the lowest deductible, without accident cover. These choices can be changed in the list of results.",
    anneeErr: "Enter a four-digit year, for example 1990.",
  },
} as const;

let indexNpa: Promise<P.IndexNpa> | null = null;
function chargerIndex() {
  if (!indexNpa) {
    indexNpa = fetch("/data/primes-2027/npa.json").then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<P.IndexNpa>;
    });
    indexNpa.catch(() => (indexNpa = null));
  }
  return indexNpa;
}

export function FormulaireComparer({ locale = "fr" }: { locale?: Locale }) {
  const t = TXT[locale];
  const cible = outils(locale).comparateur;
  const [lieu, setLieu] = useState("");
  const [annee, setAnnee] = useState("");
  const [index, setIndex] = useState<P.IndexNpa | null>(null);
  const [erreur, setErreur] = useState(false);
  const anneeRef = useRef<HTMLInputElement>(null);

  const charger = () => {
    if (!index) chargerIndex().then(setIndex, () => {});
  };
  const sugg = index && lieu.trim().length >= 2 ? P.suggestions(index, lieu) : [];

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const a = parseInt(annee, 10);
    const anneeOk = annee.length === 4 && P.anneeValide(a);
    if (annee && !anneeOk) {
      setErreur(true);
      anneeRef.current?.focus();
      return;
    }
    let npa = lieu.trim().match(/^(\d{4})\b/)?.[1] ?? "";
    if (!npa && lieu.trim().length >= 2) {
      const idx = index ?? (await chargerIndex().catch(() => null));
      npa = idx ? (P.suggestions(idx, lieu, 1)[0]?.npa ?? "") : "";
    }
    const h = [npa && `npa=${npa}`, anneeOk && `p=${a}.${P.FRANCHISES[P.classe(a)][0]}.0`].filter(Boolean).join("&");
    suivre("comparateur_produit", undefined, true);
    window.location.assign(h ? `${cible}#${h}` : cible);
  }

  return (
    <form className="comparer" action={cible} method="get" onSubmit={envoyer} noValidate aria-label={t.form}>
      <div className="comparer-champs">
        <div className="champ">
          <label htmlFor="lp-lieu">{t.lieu}</label>
          <input
            className="saisie"
            id="lp-lieu"
            list="lp-lieux"
            autoComplete="off"
            enterKeyHint="next"
            placeholder={t.lieuPh}
            value={lieu}
            onFocus={charger}
            onChange={(e) => {
              setLieu(e.target.value);
              charger();
            }}
          />
          <datalist id="lp-lieux">
            {sugg.map((s) => (
              <option key={`${s.npa}${s.canton}${s.region}`} value={s.libelle} />
            ))}
          </datalist>
        </div>
        <div className="champ">
          <label htmlFor="lp-annee">{t.annee}</label>
          <input
            ref={anneeRef}
            className="saisie"
            id="lp-annee"
            inputMode="numeric"
            autoComplete="bday-year"
            enterKeyHint="go"
            maxLength={4}
            placeholder={t.anneePh}
            value={annee}
            aria-invalid={erreur || undefined}
            aria-describedby={erreur ? "lp-annee-err" : undefined}
            onChange={(e) => {
              setAnnee(e.target.value.replace(/\D/g, "").slice(0, 4));
              setErreur(false);
            }}
          />
        </div>
      </div>
      {erreur ? (
        <p className="comparer-err" id="lp-annee-err" role="alert">{t.anneeErr}</p>
      ) : null}
      <button className="bouton" type="submit">
        {t.voir}
        <svg viewBox="0 0 18 18" aria-hidden="true">
          <path d="M3 9h11M10 4.5L14.5 9 10 13.5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      <p className="comparer-defaut">{t.defaut}</p>
    </form>
  );
}
