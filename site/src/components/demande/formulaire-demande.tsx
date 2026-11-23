"use client";
import { useEffect, useRef, useState } from "react";
import {
  CRENEAUX,
  CRENEAU_LABELS,
  ETAPES,
  FUNNEL_EVENTS,
  PERSONNES,
  PERSONNES_LABELS,
  PORTES_DEF,
  PORTES_FORMULAIRE,
  QUAND_CHOIX,
  RESIDENCE,
  SANTE_CHOIX,
  SANTE_LABELS,
  SUBMIT_LABEL,
  type ChampDetail,
  type Creneau,
  type Porte,
  type SanteChoix,
} from "@shared/demande/portes";
import { CURRENT_CONSENT_VERSION, findConsent, renderConsent } from "@shared/demande/consent-public";
import { cantonFromNpa } from "@shared/demande/npa";
import { bornesQuand, champsDetails, erreursDetails, type Details } from "@shared/demande/details";
import { ChampTelephone, verifierTelephone } from "@/components/demande/champ-telephone";
import type { Demande } from "@shared/demande/schema";
import { suivre, marquerLead } from "@/lib/analytics";
import { DEMANDE_ENVOYEE, TEXTE_CTA, effacerPreremplissage, estPorte, lirePreremplissage } from "@/lib/demande";
import { Turnstile } from "@/components/demande/turnstile";
import { Case, ChoixBoutons, Depliable, Interrupteur } from "@/components/controles";

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
    email: "E-mail",
    unSeul: "Un seul choix.",
    precisTitre: `Pour une offre plus précise${NB}? (facultatif)`,
    precisAide: "Ces réponses aident le conseiller à préparer une offre juste. Vous pouvez aussi les lui donner au téléphone.",
    dateLabel: "Date de début",
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
      choix: "Choisissez une des réponses.",
      quand: "Dites-nous à partir de quand vous voulez être couvert.",
      date: "Choisissez une date dans les deux prochaines années.",
      nombre: (min: string, max: string) => `Entrez un nombre entre ${min} et ${max}.`,
      vehicule: "Indiquez la marque et le modèle, par exemple VW Golf.",
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
    email: "Email",
    unSeul: "Choose one.",
    precisTitre: "Want a more accurate offer? (optional)",
    precisAide: "These answers help the adviser prepare an accurate offer. You can also give them on the phone.",
    dateLabel: "Start date",
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
      choix: "Choose one of the answers.",
      quand: "Tell us when you want the cover to start.",
      date: "Choose a date within the next two years.",
      nombre: (min: string, max: string) => `Enter a number between ${min} and ${max}.`,
      vehicule: "Enter the make and model, for example VW Golf.",
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

/* Clés : champs fixes, ou « d:<code> » pour une question propre à la porte. */
type Erreurs = Partial<Record<string, string>>;
type Reponses = Record<string, string | string[]>;

const milliers = (n: number, locale: Locale) => n.toLocaleString(locale === "fr" ? "fr-CH" : "en-GB");

/* Réponses saisies → payload `details` (nombres convertis, vides retirés). */
function versDetails(porte: Porte, r: Reponses, date: string): Details | undefined {
  const out: Details = {};
  for (const c of champsDetails(porte)) {
    const v = r[c.code];
    if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) continue;
    if (c.type === "nombre") {
      const n = Number(String(v).replace(/[\s'’]/g, ""));
      out[c.code] = Number.isFinite(n) ? n : NaN;
    } else if (c.type === "texte") out[c.code] = String(v).trim();
    else if (c.type === "quand") out[c.code] = v === "date" ? date : String(v);
    else out[c.code] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

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

export function Puce({ name, checked, onChange, children }: { name: string; checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <Case variante="puce" name={name} checked={checked} onChange={() => onChange()}>
      {children}
    </Case>
  );
}

export function Erreur({ id, msg }: { id: string; msg?: string }) {
  return msg ? (
    <p className="erreur-champ" id={id}>
      {msg}
    </p>
  ) : null;
}

/* `porte` : fixée par l'adresse (/demande/<porte>/), sinon ?porte=, préremplissage ou choix à l'écran 1. */
export function FormulaireDemande({ locale, porte: porteAdresse }: { locale: Locale; porte?: Porte }) {
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
  const [reponses, setReponses] = useState<Reponses>({});
  const [quandDate, setQuandDate] = useState("");
  const [precisOuvert, setPrecisOuvert] = useState(false);
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
    const params = new URLSearchParams(window.location.search);
    const q = params.get("porte");
    const p = porteAdresse ?? (estPorte(q) ? q : (pre.porte ?? null));
    if (p) {
      setPorte(p);
      setPorteFixee(true);
      const def = PORTES_DEF[p];
      const codes = def.besoin.choix.map((c) => c.code);
      const avant = (pre.porte === p || !pre.porte ? (pre.besoin ?? []) : []).filter((c) => codes.includes(c));
      setBesoin(avant.length ? (def.besoinUnique ? avant.slice(0, 1) : avant) : (def.besoinDefaut ?? []));
      // Somme d'assurance venue du calculateur (?somme=), arrondie et bornée par la question elle-même.
      const somme = Number((params.get("somme") ?? "").replace(/\D/g, ""));
      const champSomme = champsDetails(p).find((c) => c.code === "somme");
      if (champSomme?.type === "nombre" && somme >= champSomme.min && somme <= champSomme.max) {
        setReponses({ somme: String(Math.round(somme / 1000) * 1000) });
        setPrecisOuvert(true);
      }
    }
    if (pre.npa) setNpa(pre.npa);
    if (pre.birthYear) setAnnee(String(pre.birthYear));
    if (pre.householdSize) setPersonnes(pre.householdSize);
    setPret(true);
    suivre(FUNNEL_EVENTS.ouverte, { porte: p ?? "aucune" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const profil = def?.profil ?? { annee: true, personnes: true };
  const repondre = (code: string, v: string | string[]) => setReponses((r) => ({ ...r, [code]: v }));

  /* Erreurs des questions propres à la porte sur un écran (les facultatives seulement si mal remplies). */
  function erreursPorte(n: 1 | 2 | 3): Erreurs {
    if (!porte) return {};
    const e: Erreurs = {};
    const d = versDetails(porte, reponses, quandDate);
    for (const code of erreursDetails(porte, d, new Date(), n)) {
      const c = champsDetails(porte, n).find((x) => x.code === code)!;
      e[`d:${code}`] =
        c.type === "nombre"
          ? t.err.nombre(milliers(c.min, locale), milliers(c.max, locale))
          : c.type === "quand"
            ? reponses[code] === "date" ? t.err.date : t.err.quand
            : c.type === "texte"
              ? t.err.vehicule
              : t.err.choix;
    }
    return e;
  }

  function choisirPorte(p: Porte) {
    if (p === porte) return;
    setPorte(p);
    setBesoin(PORTES_DEF[p].besoinDefaut ?? []);
    setReponses({});
    setSante([]);
    setAccordSante(false);
  }

  function valider(n: 1 | 2 | 3): Erreurs {
    const e: Erreurs = {};
    if (n === 1) {
      if (!porte) e.porte = t.err.porte;
      else if (!besoin.length) e.besoin = def?.besoinUnique ? t.err.choix : t.err.besoin;
      Object.assign(e, erreursPorte(1));
    }
    if (n === 2 && enSuisse) {
      if (!/^\d{4}$/.test(npa)) e.npa = t.err.npa;
      const a = Number(annee);
      if (profil.annee && (!/^\d{4}$/.test(annee) || a < 1900 || a > ANNEE)) e.annee = t.err.annee;
      if (profil.personnes && !personnes) e.personnes = t.err.personnes;
      Object.assign(e, erreursPorte(2));
    }
    if (n === 3) {
      if (nom.trim().length < 2 || /[<>\p{Cc}]/u.test(nom)) e.nom = t.err.nom;
      const tl = verifierTelephone(tel, locale);
      if (tl.erreur) e.tel = tl.erreur;
      Object.assign(e, erreursPorte(3));
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
  }, [porte, besoin, npa, annee, personnes, enSuisse, nom, tel, email, accord, accordSante, sante, reponses, quandDate]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const phone = verifierTelephone(tel, locale).e164!;
    const details = versDetails(porte, reponses, quandDate);
    const corps: Demande = {
      porte,
      locale,
      source: "form",
      ...origine(),
      besoin,
      residence: {
        livesInSwitzerland: true,
        npa,
        ...(profil.annee ? { birthYear: Number(annee) } : {}),
        ...(profil.personnes ? { householdSize: personnes! } : {}),
      },
      ...(details ? { details } : {}),
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
                <ChoixBoutons
                  variante="puce"
                  className="puces"
                  name="porte"
                  value={porte}
                  onChange={choisirPorte}
                  options={PORTES_FORMULAIRE.map((p) => ({ value: p, label: PORTES_DEF[p].label[locale] }))}
                />
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
                <p className="aide" id="aide-besoin">{def.besoinUnique ? t.unSeul : t.plusieurs}</p>
                {def.besoinUnique ? (
                  <ChoixBoutons
                    variante="puce"
                    className="puces puces-pile"
                    name="besoin"
                    value={besoin[0] ?? null}
                    onChange={(v) => setBesoin([v])}
                    options={def.besoin.choix.map((c) => ({ value: c.code, label: c.label[locale] }))}
                  />
                ) : (
                  <div className="puces">
                    {def.besoin.choix.map((c) => (
                      <Puce key={c.code} name="besoin" checked={besoin.includes(c.code)} onChange={() => setBesoin((b) => basculer(b, c.code))}>
                        {c.label[locale]}
                      </Puce>
                    ))}
                  </div>
                )}
                <Erreur id="err-besoin" msg={erreurs.besoin} />
              </fieldset>
            ) : null}
            {porte ? champsDetails(porte, 1).map((c) => <ChampPorte key={c.code} c={c} locale={locale} valeur={reponses[c.code]} onChange={(v) => repondre(c.code, v)} date={quandDate} onDate={setQuandDate} erreur={erreurs[`d:${c.code}`]} />) : null}
            {def?.etapeSante ? (
              <fieldset>
                <legend>
                  <h2 className="petit">{t.santeQ}</h2>
                </legend>
                <div className="puces">
                  {SANTE_CHOIX.map((s) => (
                    <Puce key={s} name="sante" checked={sante.includes(s)} onChange={() => setSante((x) => basculer(x, s))}>
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
              <Interrupteur checked={enSuisse} onChange={setEnSuisse} labelledBy="lib-suisse" texteOui={t.oui} texteNon={t.non} />
            </div>
            {enSuisse ? (
              <>
                <div className="champ">
                  <label htmlFor="npa">{t.npa}</label>
                  <input id="npa" className="saisie saisie-courte" inputMode="numeric" placeholder="1201" autoComplete="postal-code" maxLength={4} pattern="[0-9]{4}" value={npa} onChange={(e) => setNpa(e.target.value.replace(/\D/g, "").slice(0, 4))} {...invalide("npa")} />
                  {canton ? <p className="aide">{t.canton(canton)}</p> : npa.length === 4 ? <p className="aide">{t.npaInconnu}</p> : null}
                  <Erreur id="err-npa" msg={erreurs.npa} />
                </div>
                {profil.annee ? (
                <div className="champ">
                  <label htmlFor="annee">{t.annee}</label>
                  <input id="annee" className="saisie saisie-courte" inputMode="numeric" autoComplete="bday-year" maxLength={4} pattern="[0-9]{4}" placeholder="1990" value={annee} onChange={(e) => setAnnee(e.target.value.replace(/\D/g, "").slice(0, 4))} {...invalide("annee")} />
                  <Erreur id="err-annee" msg={erreurs.annee} />
                </div>
                ) : null}
                {profil.personnes ? (
                <fieldset className={erreurs.personnes ? "groupe-invalide" : undefined} aria-describedby={erreurs.personnes ? "err-personnes" : undefined}>
                  <legend className="legende-champ">{t.personnes}</legend>
                  <ChoixBoutons
                    variante="puce"
                    className="puces puces-ligne"
                    name="personnes"
                    value={personnes}
                    onChange={setPersonnes}
                    options={PERSONNES.map((n) => ({ value: n, label: PERSONNES_LABELS[n] }))}
                  />
                  <Erreur id="err-personnes" msg={erreurs.personnes} />
                </fieldset>
                ) : null}
                {porte ? champsDetails(porte, 2).map((c) => <ChampPorte key={c.code} c={c} locale={locale} valeur={reponses[c.code]} onChange={(v) => repondre(c.code, v)} date={quandDate} onDate={setQuandDate} erreur={erreurs[`d:${c.code}`]} />) : null}
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
            <ChampTelephone locale={locale} value={tel} onChange={setTel} erreur={erreurs.tel} />
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
                  <Puce key={c} name="creneau" checked={creneau === c} onChange={() => setCreneau((x) => (x === c ? null : c))}>
                    {CRENEAU_LABELS[c][locale]}
                  </Puce>
                ))}
              </div>
            </fieldset>

            {champsDetails(porte, 3).length ? (
              <Depliable className="precis" titre={typo(t.precisTitre, locale)} open={precisOuvert || champsDetails(porte, 3).some((c) => erreurs[`d:${c.code}`])} onOpenChange={setPrecisOuvert}>
                <p className="aide">{t.precisAide}</p>
                {champsDetails(porte, 3).map((c) => <ChampPorte key={c.code} c={c} locale={locale} valeur={reponses[c.code]} onChange={(v) => repondre(c.code, v)} date={quandDate} onDate={setQuandDate} erreur={erreurs[`d:${c.code}`]} />)}
              </Depliable>
            ) : null}

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

/* Question propre à une porte : boutons (choix), saisie courte (nombre, texte) ou moment de début (boutons + date). */
function ChampPorte({
  c,
  locale,
  valeur,
  onChange,
  date,
  onDate,
  erreur,
}: {
  c: ChampDetail;
  locale: Locale;
  valeur: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
  date: string;
  onDate: (v: string) => void;
  erreur?: string;
}) {
  const t = T[locale];
  const id = `d-${c.code}`;
  const errId = `err-d-${c.code}`;
  const libelle = (
    <>
      {typo(c.label[locale], locale)}
      {c.optionnel && c.ecran !== 3 ? <span className="facultatif"> ({t.facultatif})</span> : null}
    </>
  );
  const aide = c.aide ? <p className="aide" id={`aide-${id}`}>{c.aide[locale]}</p> : null;
  if (c.type === "choix" || c.type === "choix-multiple" || c.type === "quand") {
    const choix = c.type === "quand" ? QUAND_CHOIX : c.choix;
    const multiple = c.type === "choix-multiple";
    const liste = Array.isArray(valeur) ? valeur : [];
    const { min, max } = bornesQuand();
    return (
      <fieldset className={erreur ? "groupe-invalide" : undefined} aria-describedby={erreur ? errId : c.aide ? `aide-${id}` : undefined}>
        <legend className="legende-champ">{libelle}</legend>
        {aide}
        {multiple ? (
          <div className={choix.length <= 2 || c.code === "pieces" ? "puces puces-grille" : "puces"}>
            {choix.map((x) => (
              <Puce key={x.code} name={id} checked={liste.includes(x.code)} onChange={() => onChange(liste.includes(x.code) ? liste.filter((y) => y !== x.code) : [...liste, x.code])}>
                {x.label[locale]}
              </Puce>
            ))}
          </div>
        ) : (
          <ChoixBoutons
            variante="puce"
            className={choix.length <= 2 || c.code === "pieces" ? "puces puces-grille" : "puces"}
            name={id}
            value={typeof valeur === "string" ? valeur : null}
            onChange={onChange}
            options={choix.map((x) => ({ value: x.code, label: x.label[locale] }))}
          />
        )}
        {c.type === "quand" && valeur === "date" ? (
          <div className="champ champ-date">
            <label htmlFor={`${id}-date`}>{t.dateLabel}</label>
            <input id={`${id}-date`} className="saisie saisie-moyenne" type="date" min={min} max={max} value={date} onChange={(e) => onDate(e.target.value)} aria-invalid={erreur ? true : undefined} />
          </div>
        ) : null}
        <Erreur id={errId} msg={erreur} />
      </fieldset>
    );
  }
  const brut = typeof valeur === "string" ? valeur : "";
  return (
    <div className="champ">
      <label htmlFor={id}>{libelle}</label>
      {aide}
      <div className={c.type === "nombre" && c.unite ? "saisie-unite" : undefined}>
        {c.type === "nombre" && c.unite?.[locale] === "CHF" ? <span aria-hidden="true">CHF</span> : null}
        <input
          id={id}
          className={c.type === "nombre" ? (c.max >= 10000 ? "saisie saisie-moyenne" : "saisie saisie-courte") : "saisie"}
          inputMode={c.type === "nombre" ? "numeric" : "text"}
          autoComplete="off"
          placeholder={c.type === "nombre" ? (c.placeholder && c.max >= 10000 ? milliers(Number(c.placeholder), locale) : c.placeholder) : c.type === "texte" ? c.placeholder?.[locale] : undefined}
          maxLength={c.type === "texte" ? c.max : 9}
          value={c.type === "nombre" && c.max >= 10000 && brut ? milliers(Number(brut), locale) : brut}
          onChange={(e) => onChange(c.type === "nombre" ? e.target.value.replace(/\D/g, "").slice(0, 7) : e.target.value)}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={erreur ? errId : c.aide ? `aide-${id}` : undefined}
        />
        {c.type === "nombre" && c.unite && c.unite[locale] !== "CHF" ? <span aria-hidden="true">{c.unite[locale]}</span> : null}
      </div>
      <Erreur id={errId} msg={erreur} />
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
      <Case className="case-demande" caseClassName="size-[22px]" checked={accord} onChange={setAccord} invalid={!!erreurs.consent} describedBy={erreurs.consent ? "err-consent" : undefined}>
        {enLigne(pc[pc.length - 1])}
      </Case>
      <Erreur id="err-consent" msg={erreurs.consent} />
      {avecSante ? (
        <>
          <Case className="case-demande" caseClassName="size-[22px]" checked={accordSante} onChange={setAccordSante} invalid={!!erreurs.sante} describedBy={erreurs.sante ? "err-sante" : undefined}>
            {enLigne(ps[ps.length - 1])}
          </Case>
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
