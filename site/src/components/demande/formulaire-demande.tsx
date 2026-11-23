"use client";
import { useEffect, useRef, useState } from "react";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import {
  CRENEAUX,
  CRENEAU_LABELS,
  ETAPES,
  FUNNEL_EVENTS,
  PERSONNES,
  PERSONNES_LABELS,
  PORTES_DEF,
  PORTES_FORMULAIRE,
  RESIDENCE,
  SANTE_CHOIX,
  SANTE_LABELS,
  SUBMIT_LABEL,
  type Creneau,
  type Porte,
  type SanteChoix,
} from "@shared/demande/portes";
import { CURRENT_CONSENT_VERSION, findConsent, renderConsent } from "@shared/demande/consent-public";
import { cantonFromNpa } from "@shared/demande/npa";
import type { Demande } from "@shared/demande/schema";
import { suivre, marquerLead } from "@/lib/analytics";
import { DEMANDE_ENVOYEE, TEXTE_CTA, effacerPreremplissage, estPorte, lirePreremplissage } from "@/lib/demande";
import { Turnstile } from "@/components/demande/turnstile";

type Locale = "fr" | "en";
type Ecran = 1 | 2 | 3 | "hors-suisse";

const NB = " ";
/* Typographie française des libellés partagés : espace fine insécable avant ; : ? ! */
export const typo = (s: string, locale: Locale) => (locale === "fr" ? s.replace(/ ([;:?!])/g, `${NB}$1`) : s);
const ANNEE = new Date().getFullYear();

const T = {
  fr: {
    etape: (n: number) => `${n} sur 3`,
    porteQ: `Quel domaine vous concerne${NB}?`,
    plusieurs: "Plusieurs choix possibles.",
    santeQ: `Une couverture vous intéresse-t-elle en particulier${NB}? (facultatif)`,
    continuer: "Continuer",
    retour: "Retour",
    npa: "NPA de votre domicile",
    npaInconnu: "Ce NPA est introuvable. Merci de le vérifier.",
    canton: (c: string) => `Canton${NB}: ${c}`,
    annee: "Année de naissance",
    personnes: "Nombre de personnes à assurer",
    oui: "Oui",
    non: "Non",
    horsTitre: "Nous ne pouvons pas encore vous aider",
    horsGuides: "Lire le guide des frontaliers",
    horsSimu: "Ouvrir le simulateur frontalier",
    horsRetour: "Modifier ma réponse",
    nom: "Nom complet",
    tel: "Téléphone",
    telAide: "Un numéro suisse ou français.",
    email: "E-mail",
    facultatif: "facultatif",
    creneauQ: `Quand préférez-vous être appelé${NB}?`,
    envoi: "Envoi…",
    err: {
      porte: "Choisissez un domaine.",
      besoin: "Choisissez au moins une option.",
      npa: "Entrez un NPA à 4 chiffres.",
      annee: `Entrez une année entre 1900 et ${ANNEE}.`,
      personnes: "Choisissez le nombre de personnes.",
      nom: "Entrez votre nom et votre prénom.",
      tel: "Ce numéro ne semble pas valide. Vérifiez l’indicatif (+41, +33).",
      email: "Cette adresse e-mail ne semble pas valide.",
      consent: "Cochez cette case pour que votre demande puisse être transmise.",
      sante: "Cochez cette case, ou retirez les couvertures santé choisies à l’étape 1.",
      robot: "La vérification anti-robot n’est pas terminée. Réessayez dans un instant.",
      trop: "Trop de demandes en peu de temps. Réessayez dans une minute.",
      autre: "L’envoi n’a pas abouti. Vos réponses sont conservées, il suffit de réessayer.",
    },
  },
  en: {
    etape: (n: number) => `Step ${n} of 3`,
    porteQ: "Which area is it about?",
    plusieurs: "You can choose more than one.",
    santeQ: "Is there a cover you are particularly interested in? (optional)",
    continuer: "Continue",
    retour: "Back",
    npa: "Home postcode",
    npaInconnu: "We could not find this postcode. Please check it.",
    canton: (c: string) => `Canton: ${c}`,
    annee: "Year of birth",
    personnes: "Number of people to insure",
    oui: "Yes",
    non: "No",
    horsTitre: "We cannot help you yet",
    horsGuides: "Read the cross-border guide",
    horsSimu: "Open the cross-border calculator",
    horsRetour: "Change my answer",
    nom: "Full name",
    tel: "Phone",
    telAide: "A Swiss or French number.",
    email: "Email",
    facultatif: "optional",
    creneauQ: "When would you prefer us to call?",
    envoi: "Sending…",
    err: {
      porte: "Choose an area.",
      besoin: "Choose at least one option.",
      npa: "Enter a 4-digit postcode.",
      annee: `Enter a year between 1900 and ${ANNEE}.`,
      personnes: "Choose the number of people.",
      nom: "Enter your first and last name.",
      tel: "This number does not look valid. Check the country code (+41, +33).",
      email: "This email address does not look valid.",
      consent: "Tick this box so that your request can be passed on.",
      sante: "Tick this box, or remove the health covers chosen in step 1.",
      robot: "The anti-robot check has not finished yet. Try again in a moment.",
      trop: "Too many requests in a short time. Try again in a minute.",
      autre: "Your request could not be sent. Your answers are still here, so please try again.",
    },
  },
} as const;

const LIENS_HORS = {
  fr: { guide: "/frontaliers/", simu: "/simulateur-frontalier/" },
  en: { guide: "/en/cross-border-workers/", simu: "/en/cross-border-calculator/" },
};

type Erreurs = Partial<Record<"porte" | "besoin" | "npa" | "annee" | "personnes" | "nom" | "tel" | "email" | "consent" | "sante", string>>;

/* Consentement : Markdown limité (gras, liens internes). Paragraphes séparés par une ligne vide ;
   le dernier est l'accord lui-même (libellé de la case). */
function enLigne(md: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((\/[^)\s]*)\)/g;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) {
    if (m.index > i) out.push(md.slice(i, m.index));
    out.push(m[1] ? <strong key={m.index}>{m[1]}</strong> : <a key={m.index} href={m[3]} target="_blank" rel="noopener">{m[2]}</a>);
    i = m.index + m[0].length;
  }
  if (i < md.length) out.push(md.slice(i));
  return out;
}
const paragraphes = (md: string) => md.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

export function Puce({ type, name, checked, onChange, children }: { type: "checkbox" | "radio"; name: string; checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="puce">
      <input type={type} name={name} checked={checked} onChange={onChange} />
      <svg className="coche" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{children}</span>
    </label>
  );
}

export function Erreur({ id, msg }: { id: string; msg?: string }) {
  return msg ? (
    <p className="erreur-champ" id={id}>
      {msg}
    </p>
  ) : null;
}

export function FormulaireDemande({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [pret, setPret] = useState(false);
  const [ecran, setEcran] = useState<Ecran>(1);
  const [porte, setPorte] = useState<Porte | null>(null);
  const [porteFixee, setPorteFixee] = useState(false);
  const [besoin, setBesoin] = useState<string[]>([]);
  const [sante, setSante] = useState<SanteChoix[]>([]);
  const [npa, setNpa] = useState("");
  const [annee, setAnnee] = useState("");
  const [personnes, setPersonnes] = useState<number | null>(null);
  const [enSuisse, setEnSuisse] = useState(true);
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [email, setEmail] = useState("");
  const [creneau, setCreneau] = useState<Creneau | null>(null);
  const [accord, setAccord] = useState(false);
  const [accordSante, setAccordSante] = useState(false);
  const [website, setWebsite] = useState("");
  const [jeton, setJeton] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [envoi, setEnvoi] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);
  const ouvertA = useRef(0);
  const titre = useRef<HTMLHeadingElement>(null);
  const premierRendu = useRef(true);
  const resetTurnstile = useRef<(() => void) | null>(null);

  /* Porte : ?porte= (lu côté navigateur, export statique), sinon préremplissage, sinon choix à l'écran 1. */
  useEffect(() => {
    ouvertA.current = Date.now();
    const pre = lirePreremplissage();
    const q = new URLSearchParams(window.location.search).get("porte");
    const p = estPorte(q) ? q : (pre.porte ?? null);
    if (p) {
      setPorte(p);
      setPorteFixee(true);
      const codes = PORTES_DEF[p].besoin.choix.map((c) => c.code);
      if (pre.besoin) setBesoin(pre.besoin.filter((c) => codes.includes(c)));
    }
    if (pre.npa) setNpa(pre.npa);
    if (pre.birthYear) setAnnee(String(pre.birthYear));
    if (pre.householdSize) setPersonnes(pre.householdSize);
    setPret(true);
    suivre(FUNNEL_EVENTS.ouverte, { porte: p ?? "aucune" });
  }, []);

  /* Changement d'écran : titre au focus, haut de page, événement d'étape. */
  useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    titre.current?.focus();
    if (typeof ecran === "number" && ecran > 1) suivre(FUNNEL_EVENTS.etape, { n: ecran, porte: porte ?? "aucune" });
  }, [ecran]); // eslint-disable-line react-hooks/exhaustive-deps

  const basculer = <V,>(liste: V[], v: V) => (liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v]);
  const def = porte ? PORTES_DEF[porte] : null;
  const canton = /^\d{4}$/.test(npa) ? cantonFromNpa(npa) : null;
  const avecSante = porte === "sante" && sante.length > 0;

  function choisirPorte(p: Porte) {
    if (p === porte) return;
    setPorte(p);
    setBesoin([]);
    setSante([]);
    setAccordSante(false);
  }

  function valider(n: 1 | 2 | 3): Erreurs {
    const e: Erreurs = {};
    if (n === 1) {
      if (!porte) e.porte = t.err.porte;
      else if (!besoin.length) e.besoin = t.err.besoin;
    }
    if (n === 2 && enSuisse) {
      if (!/^\d{4}$/.test(npa)) e.npa = t.err.npa;
      const a = Number(annee);
      if (!/^\d{4}$/.test(annee) || a < 1900 || a > ANNEE) e.annee = t.err.annee;
      if (!personnes) e.personnes = t.err.personnes;
    }
    if (n === 3) {
      if (nom.trim().length < 2 || /[<>\p{Cc}]/u.test(nom)) e.nom = t.err.nom;
      if (!parsePhoneNumberFromString(tel, "CH")?.isValid()) e.tel = t.err.tel;
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.email = t.err.email;
      if (!accord) e.consent = t.err.consent;
      if (avecSante && !accordSante) e.sante = t.err.sante;
    }
    return e;
  }

  /* Une erreur affichée disparaît dès que le champ est corrigé (on ne fait pas apparaître les autres). */
  useEffect(() => {
    if (typeof ecran !== "number" || !Object.keys(erreurs).length) return;
    const e = valider(ecran);
    const restantes = Object.fromEntries(Object.entries(erreurs).filter(([k]) => k in e).map(([k]) => [k, e[k as keyof Erreurs]])) as Erreurs;
    if (Object.keys(restantes).length !== Object.keys(erreurs).length) setErreurs(restantes);
  }, [porte, besoin, npa, annee, personnes, enSuisse, nom, tel, email, accord, accordSante, sante]); // eslint-disable-line react-hooks/exhaustive-deps

  function suivant(n: 1 | 2) {
    const e = valider(n);
    setErreurs(e);
    if (Object.keys(e).length) {
      focusErreur();
      return;
    }
    if (n === 2 && !enSuisse) setEcran("hors-suisse");
    else setEcran((n + 1) as 2 | 3);
  }

  function focusErreur() {
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>("[aria-invalid='true'], .groupe-invalide input");
      el?.focus();
    });
  }

  async function envoyer(ev: React.FormEvent) {
    ev.preventDefault();
    if (envoi || !porte) return;
    const e = valider(3);
    setErreurs(e);
    setEchec(null);
    if (Object.keys(e).length) {
      focusErreur();
      return;
    }
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !jeton) {
      setEchec(t.err.robot);
      return;
    }
    const phone = parsePhoneNumberFromString(tel, "CH")!.number;
    const corps: Demande = {
      porte,
      locale,
      source: "form",
      ...origine(),
      besoin,
      residence: { livesInSwitzerland: true, npa, birthYear: Number(annee), householdSize: personnes! },
      ...(avecSante ? { health: { products: sante }, healthConsent: true, healthConsentVersion: CURRENT_CONSENT_VERSION.health } : {}),
      contact: {
        fullName: nom.trim(),
        phone,
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(creneau ? { callbackSlot: creneau } : {}),
      },
      consent: true,
      consentVersion: CURRENT_CONSENT_VERSION.contact,
      ...(jeton ? { turnstileToken: jeton } : {}),
      website,
      elapsedMs: Math.min(Date.now() - ouvertA.current, 86_400_000),
    };
    setEnvoi(true);
    try {
      const r = await fetch("/api/demande", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corps) });
      if (r.status === 202) {
        suivre(FUNNEL_EVENTS.envoyee, { porte }, true);
        marquerLead(porte);
        effacerPreremplissage();
        window.location.assign(`${DEMANDE_ENVOYEE[locale]}?p=${porte}`);
        return;
      }
      setEchec(r.status === 429 ? t.err.trop : t.err.autre);
    } catch {
      setEchec(t.err.autre);
    }
    setJeton(null);
    resetTurnstile.current?.();
    setEnvoi(false);
  }

  const etapeN = ecran === "hors-suisse" ? 2 : ecran;
  const invalide = (k: keyof Erreurs) => (erreurs[k] ? { "aria-invalid": true as const, "aria-describedby": `err-${k}` } : {});

  return (
    <div className="wrap demande" data-pret={pret || undefined}>
      <form className="demande-form" onSubmit={envoyer} noValidate>
        {/* Pot de miel : invisible et hors tabulation, rempli seulement par un robot. */}
        <div className="pot" aria-hidden="true">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>

        <div className="progression">
          <p>
            <span>{t.etape(etapeN)}</span> · {ETAPES[locale][etapeN - 1]}
          </p>
          <ol aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <li key={n} data-fait={n <= etapeN || undefined} />
            ))}
          </ol>
        </div>

        {ecran === 1 ? (
          <section aria-labelledby="titre-ecran">
            {!porteFixee ? (
              <fieldset className={erreurs.porte ? "groupe-invalide" : undefined} aria-describedby={erreurs.porte ? "err-porte" : undefined}>
                <legend>
                  <h1 id="titre-ecran" ref={titre} tabIndex={-1}>{t.porteQ}</h1>
                </legend>
                <div className="puces">
                  {PORTES_FORMULAIRE.map((p) => (
                    <Puce key={p} type="radio" name="porte" checked={porte === p} onChange={() => choisirPorte(p)}>
                      {PORTES_DEF[p].label[locale]}
                    </Puce>
                  ))}
                </div>
                <Erreur id="err-porte" msg={erreurs.porte} />
              </fieldset>
            ) : null}
            {def ? (
              <fieldset className={erreurs.besoin ? "groupe-invalide" : undefined} aria-describedby={erreurs.besoin ? "err-besoin" : "aide-besoin"}>
                <legend>
                  {porteFixee ? (
                    <h1 id="titre-ecran" ref={titre} tabIndex={-1}>{typo(def.besoin.question[locale], locale)}</h1>
                  ) : (
                    <h2>{typo(def.besoin.question[locale], locale)}</h2>
                  )}
                </legend>
                <p className="aide" id="aide-besoin">{t.plusieurs}</p>
                <div className="puces">
                  {def.besoin.choix.map((c) => (
                    <Puce key={c.code} type="checkbox" name="besoin" checked={besoin.includes(c.code)} onChange={() => setBesoin((b) => basculer(b, c.code))}>
                      {c.label[locale]}
                    </Puce>
                  ))}
                </div>
                <Erreur id="err-besoin" msg={erreurs.besoin} />
              </fieldset>
            ) : null}
            {def?.etapeSante ? (
              <fieldset>
                <legend>
                  <h2 className="petit">{t.santeQ}</h2>
                </legend>
                <div className="puces">
                  {SANTE_CHOIX.map((s) => (
                    <Puce key={s} type="checkbox" name="sante" checked={sante.includes(s)} onChange={() => setSante((x) => basculer(x, s))}>
                      {SANTE_LABELS[s][locale]}
                    </Puce>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <div className="actions-demande">
              <button type="button" className="bouton" onClick={() => suivant(1)}>
                {t.continuer}
              </button>
            </div>
          </section>
        ) : null}

        {ecran === 2 ? (
          <section aria-labelledby="titre-ecran">
            <h1 id="titre-ecran" ref={titre} tabIndex={-1}>{ETAPES[locale][1]}</h1>
            <div className="bascule-ligne">
              <span id="lib-suisse">{RESIDENCE.question[locale]}</span>
              <button type="button" role="switch" aria-checked={enSuisse} aria-labelledby="lib-suisse" className="bascule" onClick={() => setEnSuisse((v) => !v)}>
                <span className="bascule-piste" aria-hidden="true" />
                <span className="bascule-texte" aria-hidden="true">{enSuisse ? t.oui : t.non}</span>
              </button>
            </div>
            {enSuisse ? (
              <>
                <div className="champ">
                  <label htmlFor="npa">{t.npa}</label>
                  <input id="npa" className="saisie saisie-courte" inputMode="numeric" placeholder="1201" autoComplete="postal-code" maxLength={4} pattern="[0-9]{4}" value={npa} onChange={(e) => setNpa(e.target.value.replace(/\D/g, "").slice(0, 4))} {...invalide("npa")} />
                  {canton ? <p className="aide">{t.canton(canton)}</p> : npa.length === 4 ? <p className="aide">{t.npaInconnu}</p> : null}
                  <Erreur id="err-npa" msg={erreurs.npa} />
                </div>
                <div className="champ">
                  <label htmlFor="annee">{t.annee}</label>
                  <input id="annee" className="saisie saisie-courte" inputMode="numeric" autoComplete="bday-year" maxLength={4} pattern="[0-9]{4}" placeholder="1990" value={annee} onChange={(e) => setAnnee(e.target.value.replace(/\D/g, "").slice(0, 4))} {...invalide("annee")} />
                  <Erreur id="err-annee" msg={erreurs.annee} />
                </div>
                <fieldset className={erreurs.personnes ? "groupe-invalide" : undefined} aria-describedby={erreurs.personnes ? "err-personnes" : undefined}>
                  <legend className="legende-champ">{t.personnes}</legend>
                  <div className="puces puces-ligne">
                    {PERSONNES.map((n) => (
                      <Puce key={n} type="radio" name="personnes" checked={personnes === n} onChange={() => setPersonnes(n)}>
                        {PERSONNES_LABELS[n]}
                      </Puce>
                    ))}
                  </div>
                  <Erreur id="err-personnes" msg={erreurs.personnes} />
                </fieldset>
              </>
            ) : null}
            <div className="actions-demande">
              <button type="button" className="bouton second" onClick={() => setEcran(1)}>
                {t.retour}
              </button>
              <button type="button" className="bouton" onClick={() => suivant(2)}>
                {t.continuer}
              </button>
            </div>
          </section>
        ) : null}

        {ecran === "hors-suisse" ? (
          <section aria-labelledby="titre-ecran" className="hors-suisse">
            <h1 id="titre-ecran" ref={titre} tabIndex={-1}>{t.horsTitre}</h1>
            <p>{RESIDENCE.francaisInfo[locale]}</p>
            <ul>
              <li><a href={LIENS_HORS[locale].guide}>{t.horsGuides}</a></li>
              <li><a href={LIENS_HORS[locale].simu}>{t.horsSimu}</a></li>
            </ul>
            <div className="actions-demande">
              <button type="button" className="bouton second" onClick={() => setEcran(2)}>
                {t.horsRetour}
              </button>
            </div>
          </section>
        ) : null}

        {ecran === 3 && porte ? (
          <section aria-labelledby="titre-ecran">
            <h1 id="titre-ecran" ref={titre} tabIndex={-1}>{ETAPES[locale][2]}</h1>
            <div className="champ">
              <label htmlFor="nom">{t.nom}</label>
              <input id="nom" className="saisie" autoComplete="name" placeholder="Marie Dupont" autoCapitalize="words" maxLength={120} value={nom} onChange={(e) => setNom(e.target.value)} {...invalide("nom")} />
              <Erreur id="err-nom" msg={erreurs.nom} />
            </div>
            <div className="champ">
              <label htmlFor="tel">{t.tel}</label>
              <input id="tel" className="saisie" type="tel" inputMode="tel" autoComplete="tel" placeholder="079 123 45 67" maxLength={24} value={tel} onChange={(e) => setTel(e.target.value)} aria-describedby={erreurs.tel ? "err-tel" : "aide-tel"} aria-invalid={erreurs.tel ? true : undefined} />
              {erreurs.tel ? <Erreur id="err-tel" msg={erreurs.tel} /> : <p className="aide" id="aide-tel">{t.telAide}</p>}
            </div>
            <div className="champ">
              <label htmlFor="email">
                {t.email} <span className="facultatif">({t.facultatif})</span>
              </label>
              <input id="email" className="saisie" type="email" placeholder={locale === "en" ? "first.last@example.ch" : "prenom.nom@exemple.ch"} inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} {...invalide("email")} />
              <Erreur id="err-email" msg={erreurs.email} />
            </div>
            <fieldset>
              <legend className="legende-champ">
                {t.creneauQ} <span className="facultatif">({t.facultatif})</span>
              </legend>
              <div className="puces">
                {CRENEAUX.map((c) => (
                  <Puce key={c} type="checkbox" name="creneau" checked={creneau === c} onChange={() => setCreneau((x) => (x === c ? null : c))}>
                    {CRENEAU_LABELS[c][locale]}
                  </Puce>
                ))}
              </div>
            </fieldset>

            <Consentements locale={locale} porte={porte} avecSante={avecSante} accord={accord} setAccord={setAccord} accordSante={accordSante} setAccordSante={setAccordSante} erreurs={erreurs} />

            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
              <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} locale={locale} onToken={setJeton} resetRef={resetTurnstile} />
            ) : null}

            {echec ? (
              <p className="echec" role="alert">
                {echec}
              </p>
            ) : null}
            <div className="actions-demande">
              <button type="button" className="bouton second" onClick={() => setEcran(2)} disabled={envoi}>
                {t.retour}
              </button>
              <button type="submit" className="bouton" disabled={envoi} aria-busy={envoi || undefined}>
                {envoi ? t.envoi : SUBMIT_LABEL[locale]}
              </button>
            </div>
            <p className="rassurance">{TEXTE_CTA[locale].rassurance}</p>
          </section>
        ) : null}
      </form>
    </div>
  );
}

export function Consentements({
  locale,
  porte,
  avecSante,
  accord,
  setAccord,
  accordSante,
  setAccordSante,
  erreurs,
}: {
  locale: Locale;
  porte: Porte;
  avecSante: boolean;
  accord: boolean;
  setAccord: (v: boolean) => void;
  accordSante: boolean;
  setAccordSante: (v: boolean) => void;
  erreurs: Erreurs;
}) {
  const contact = findConsent("contact", locale, CURRENT_CONSENT_VERSION.contact);
  const sante = findConsent("health", locale, CURRENT_CONSENT_VERSION.health);
  if (!contact || !sante) return null;
  const pc = paragraphes(renderConsent(contact, porte));
  const ps = paragraphes(renderConsent(sante, porte));
  const info = pc.slice(0, -1);
  return (
    <div className="consent">
      {info.map((p, i) => (
        <p key={i}>{enLigne(p)}</p>
      ))}
      <label className="case-demande">
        <input type="checkbox" checked={accord} onChange={(e) => setAccord(e.target.checked)} aria-invalid={erreurs.consent ? true : undefined} aria-describedby={erreurs.consent ? "err-consent" : undefined} />
        <span>{enLigne(pc[pc.length - 1])}</span>
      </label>
      <Erreur id="err-consent" msg={erreurs.consent} />
      {avecSante ? (
        <>
          <label className="case-demande">
            <input type="checkbox" checked={accordSante} onChange={(e) => setAccordSante(e.target.checked)} aria-invalid={erreurs.sante ? true : undefined} aria-describedby={erreurs.sante ? "err-sante" : undefined} />
            <span>{enLigne(ps[ps.length - 1])}</span>
          </label>
          <Erreur id="err-sante" msg={erreurs.sante} />
        </>
      ) : null}
    </div>
  );
}

/* Page d'origine (chemin seul, même site) et UTM de l'adresse du formulaire. */
export function origine(): Pick<Demande, "sourcePage" | "utm"> {
  const out: Pick<Demande, "sourcePage" | "utm"> = {};
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin === window.location.origin && /^\/[A-Za-z0-9\-_/.]*$/.test(ref.pathname) && ref.pathname.length <= 300) out.sourcePage = ref.pathname;
  } catch {
    /* référent illisible : ignoré */
  }
  const q = new URLSearchParams(window.location.search);
  const utm: NonNullable<Demande["utm"]> = {};
  for (const k of ["source", "medium", "campaign", "term", "content"] as const) {
    const v = q.get(`utm_${k}`);
    if (v) utm[k] = v.slice(0, 100);
  }
  if (Object.keys(utm).length) out.utm = utm;
  return out;
}
