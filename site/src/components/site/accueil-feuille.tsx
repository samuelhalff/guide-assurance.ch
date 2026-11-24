"use client";
import { useEffect, useRef, useState } from "react";
import { calculerSaison, type Etat } from "@/components/site/saison";
import { outils } from "@/lib/nav";
import { suivre } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n";
import { TEXTE_RAPPEL } from "@/lib/demande";
import * as P from "@/lib/engines/primes";
import { IconeTelephone, LienRappel } from "@/components/demande/lien-rappel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const N = " "; // espace fine insécable avant ; : ? ! »

const TXT = {
  fr: {
    h1: "Comparez vos primes maladie 2027, sans faux pas",
    intro: "Avec votre NPA et votre année de naissance, vous obtenez les primes 2027 des caisses actives dans votre région, de la plus basse à la plus haute.",
    form: "Comparer les primes 2027",
    lieu: "NPA ou localité",
    lieuPh: "1201 ou Lausanne",
    annee: "Année de naissance",
    anneePh: "1990",
    voir: "Voir les primes",
    defaut: "Le calcul part de la franchise la plus basse, avec la couverture accident pour les enfants et dès 65 ans seulement. Vous pourrez modifier ces choix dans la liste des résultats.",
    anneeErr: "Indiquez l’année à quatre chiffres, par exemple 1990.",
    integrite: "Le site n’affiche aucune publicité et aucun assureur ne paie pour l’ordre des résultats. Les primes 2027 sont celles approuvées par l’OFSP, et le calcul se fait dans votre navigateur.",
    sources: `Sources${N}: OFSP (primes 2027), Fedlex`,
  },
  en: {
    h1: "Compare your 2027 health insurance premiums",
    intro: "With your postcode and year of birth, you get the 2027 premiums of the insurers active in your region, from lowest to highest.",
    form: "Compare 2027 premiums",
    lieu: "Postcode or town",
    lieuPh: "1201 or Lausanne",
    annee: "Year of birth",
    anneePh: "1990",
    voir: "See the premiums",
    defaut: "The calculation starts from the lowest deductible, with accident cover only for children and from age 65. These choices can be changed in the list of results.",
    anneeErr: "Enter a four-digit year, for example 1990.",
    integrite: "The site shows no ads, and no insurer pays for the order of the results. The premiums are the 2027 premiums approved by the FOPH, and the calculation runs in your browser.",
    sources: "Sources: FOPH (2027 premiums), Fedlex",
  },
} as const;

/* Index NPA du comparateur (public/data/primes-2027/npa.json), chargé au premier contact avec le champ lieu. */
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

/* Encadré saisonnier, factuel, sans compte à rebours (research/05). Le HTML statique porte l'état du jour du build ;
   il est recalculé au chargement. */
function Saison({ initial, locale }: { initial: Etat; locale: Locale }) {
  const OUTILS = outils(locale);
  const [etat, setEtat] = useState<Etat>(initial);
  useEffect(() => setEtat(calculerSaison(new Date())), []);
  if (etat.mode === "masque") return null;
  if (etat.mode === "pilier")
    return locale === "en" ? (
      <p className="saison">
        A pillar 3a payment made by <strong>31 December {etat.annee}</strong> can be deducted from your {etat.annee} taxes.
      </p>
    ) : (
      <p className="saison">
        Un versement sur votre 3e pilier fait au plus tard le <strong>31 décembre {etat.annee}</strong> se déduit de vos impôts {etat.annee}.
      </p>
    );
  return locale === "en" ? (
    <p className="saison" id="saison">
      To change insurer for next year, your cancellation must reach your current insurer by <strong>30 November {etat.annee}</strong>. <a href={OUTILS.lettre}>Prepare my letter</a>
    </p>
  ) : (
    <p className="saison" id="saison">
      Pour changer de caisse l’an prochain, votre résiliation doit parvenir à votre caisse actuelle au plus tard le <strong>30 novembre {etat.annee}</strong>. <a href={OUTILS.lettre}>Préparer ma lettre</a>
    </p>
  );
}

/* Formulaire de la tête : lieu + année, puis le comparateur avec le profil après le # (jamais envoyé au serveur ;
   format du comparateur : #npa=1201&p=1990.300 = année.franchise ; sans accident indiqué, le comparateur le règle selon l'âge). Sans JavaScript, les champs n'ont pas
   de name : le bouton mène simplement au comparateur, sans rien mettre dans l'adresse. */
function FormComparer({ locale }: { locale: Locale }) {
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
    const h = [npa && `npa=${npa}`, anneeOk && `p=${a}.${P.FRANCHISES[P.classe(a)][0]}`].filter(Boolean).join("&");
    suivre("comparateur_accueil", undefined, true);
    window.location.assign(h ? `${cible}#${h}` : cible);
  }

  return (
    <form className="comparer ph-sensitive" data-ph-mask action={cible} method="get" onSubmit={envoyer} noValidate aria-label={t.form}>
      <div className="comparer-champs">
        <div className="champ">
          <label htmlFor="ac-lieu">{t.lieu}</label>
          <Input
            id="ac-lieu"
            list="ac-lieux"
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
          <datalist id="ac-lieux">
            {sugg.map((s) => (
              <option key={`${s.npa}${s.canton}${s.region}`} value={s.libelle} />
            ))}
          </datalist>
        </div>
        <div className="champ">
          <label htmlFor="ac-annee">{t.annee}</label>
          <Input
            ref={anneeRef}
            id="ac-annee"
            inputMode="numeric"
            autoComplete="bday-year"
            enterKeyHint="go"
            maxLength={4}
            placeholder={t.anneePh}
            value={annee}
            aria-invalid={erreur || undefined}
            aria-describedby={erreur ? "ac-annee-err" : undefined}
            onChange={(e) => {
              setAnnee(e.target.value.replace(/\D/g, "").slice(0, 4));
              setErreur(false);
            }}
          />
        </div>
      </div>
      {erreur ? (
        <p className="comparer-err" id="ac-annee-err" role="alert">{t.anneeErr}</p>
      ) : null}
      <Button className="mt-3 w-full" type="submit">
        {t.voir}
        <svg viewBox="0 0 18 18" aria-hidden="true">
          <path d="M3 9h11M10 4.5L14.5 9 10 13.5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </Button>
      <p className="comparer-defaut">{t.defaut}</p>
    </form>
  );
}

/* Tête de l'accueil : l'image (passée en enfants, rendue côté serveur) et le cartouche avec le formulaire du comparateur. */
export function AccueilFeuille({ cartes, saisonInitiale, locale = "fr" }: { cartes: React.ReactNode; saisonInitiale: Etat; locale?: Locale }) {
  const t = TXT[locale];
  return (
    <div className="feuille" id="feuille">
      {cartes}
      <div className="cartouche">
        <h1>{t.h1}</h1>
        <p className="intro">{t.intro}</p>
        <FormComparer locale={locale} />
        <p className="garantie">
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path d="M5 9V6a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <rect x="3" y="9" width="14" height="10" rx="1.5" fill="currentColor" />
          </svg>
          <span>{t.integrite}</span>
        </p>
        <p className="rappel-accueil">
          <IconeTelephone size={18} />
          <span>
            {TEXTE_RAPPEL[locale].accueilQ}{" "}
            <LienRappel locale={locale} emplacement="accueil">{TEXTE_RAPPEL[locale].accueilLien}</LienRappel>
          </span>
        </p>
        <Saison initial={saisonInitiale} locale={locale} />
        <p className="pied-cartouche">{t.sources}</p>
      </div>
    </div>
  );
}

/* Situations, juste sous le formulaire du comparateur : l'entrée des frontaliers, des nouveaux arrivants, de la
   prévoyance et des entreprises, qui comptent toute l'année (la saison LAMal finit le 30 novembre). Chaque ligne
   reprend un fait déjà publié sur la page visée. */
export type Situation = "frontaliers" | "arrivee" | "prevoyance" | "entreprises";
type Option = { value: Situation; label: string; detail: string; href: string };
const SITUATIONS: Record<Locale, Option[]> = {
  fr: [
    { value: "frontaliers", label: "Je vis en France, je travaille en Suisse", detail: "Vous avez trois mois pour choisir entre la LAMal et l’assurance maladie française. Ce choix est en principe définitif et engage tout le foyer.", href: "/frontaliers/" },
    { value: "arrivee", label: "Je viens d’arriver en Suisse", detail: "Vous avez trois mois pour vous affilier à une caisse maladie, et la couverture remonte au jour de votre arrivée.", href: "/nouveaux-arrivants/" },
    { value: "prevoyance", label: "Je prépare mon 3e pilier", detail: "En 2027, vous pouvez verser jusqu’à 7\u202f373 francs sur votre 3a si vous avez une caisse de pension.", href: "/3e-pilier/" },
    { value: "entreprises", label: "J’assure mon entreprise", detail: "L’assurance accidents (LAA) est obligatoire pour tout le personnel, la LPP dès 23\u00a0040\u00a0francs de salaire annuel.", href: "/entreprises/" },
  ],
  en: [
    { value: "frontaliers", label: "I live in France, I work in Switzerland", detail: "You have three months to choose between LAMal and French health insurance. The choice is in principle final and binds the whole household.", href: "/en/cross-border-workers/" },
    { value: "arrivee", label: "I’ve just arrived in Switzerland", detail: "You have three months to join a health insurer, and your cover goes back to the day you arrived.", href: "/en/moving-to-switzerland/" },
    { value: "prevoyance", label: "I’m planning my pillar 3a", detail: "In 2027 you can pay up to CHF 7,373 into pillar 3a if you have a pension fund.", href: "/en/pillar-3a/" },
    { value: "entreprises", label: "I’m insuring my business", detail: "LAA accident cover is compulsory for all staff, and LPP pension from an annual salary of CHF\u00a023,040.", href: "/en/business/" },
  ],
};

export function AccueilSituations({ locale = "fr" }: { locale?: Locale }) {
  const isEn = locale === "en";
  return (
    <section className="situations" id="situations" aria-labelledby="situations-titre">
      <div className="wrap">
        <h2 className="situations-titre" id="situations-titre">{isEn ? "Another situation?" : `Une autre situation${N}?`}</h2>
        <ul className="situations-liste">
          {SITUATIONS[locale].map((o) => (
            <li key={o.value}>
              <a href={o.href} onClick={() => suivre("situation_choisie", { situation: o.value }, true)}>
                <Card size="sm" className="h-full">
                  <CardHeader>
                    <CardTitle>{o.label}</CardTitle>
                    <CardDescription>{o.detail}</CardDescription>
                    <CardAction>
                      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                        <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </CardAction>
                  </CardHeader>
                </Card>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
