"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ChampTelephone, verifierTelephone } from "@/components/demande/champ-telephone";
import { Consentements, Erreur, Puce, origine } from "@/components/demande/formulaire-demande";
import { Turnstile } from "@/components/demande/turnstile";
import { CRENEAUX, CRENEAU_LABELS, PORTES, type Creneau, type Porte } from "@shared/demande/portes";
import { CURRENT_CONSENT_VERSION } from "@shared/demande/consent-public";
import type { Demande } from "@shared/demande/schema";
import { marquerLead, mesurerLead, suivre, type Evenement } from "@/lib/analytics";
import { TEXTE_CTA } from "@/lib/demande";

/* Bloc de demande en ligne (nom, téléphone, créneau, accord), sans changer de page : sous le résultat du comparateur
   de primes et dans l'assistant. Même envoi que le formulaire court (POST /api/demande, Turnstile, pot de miel, délai
   minimal), même texte d'accord versionné (Consentements). Seuls les champs du formulaire et ce que l'appelant passe
   dans `demande` (codes contrôlés, jamais de texte libre) partent vers leads. La mesure ne reçoit aucune valeur saisie.
   Bloc exclu de l'enregistrement de session et de l'autocapture (ph-no-capture). Créneau, accord et Turnstile
   s'ouvrent au premier focus pour garder le bloc court. */

type Locale = "fr" | "en";
const NNBSP = " ";

const T = {
  fr: {
    nom: "Prénom et nom",
    creneauQ: `Quand préférez-vous être appelé${NNBSP}?`,
    facultatif: "facultatif",
    envoi: "Envoi…",
    fermer: "Masquer",
    merci: (prenom: string) => `C’est noté, ${prenom}.`,
    appel: (quand: string | null) => `Un conseiller d’un courtier partenaire vous appellera ${quand ?? "aux heures de bureau"}.`,
    quand: { matin: "le matin, entre 8 h et 11 h", midi: "à midi, entre 11 h et 14 h", "apres-midi": "l’après-midi, entre 14 h et 17 h", soir: "en fin de journée, entre 17 h et 19 h" } as Record<Creneau, string>,
    err: {
      nom: "Entrez votre prénom et votre nom.",
      consent: "Cochez cette case pour que votre demande puisse être transmise.",
      robot: "La vérification anti-robot n’est pas terminée. Réessayez dans un instant.",
      trop: "Trop de demandes en peu de temps. Réessayez dans une minute.",
      autre: "L’envoi n’a pas abouti. Vos réponses sont conservées, il suffit de réessayer.",
    },
  },
  en: {
    nom: "First and last name",
    creneauQ: "When would you prefer us to call?",
    facultatif: "optional",
    envoi: "Sending…",
    fermer: "Hide",
    merci: (prenom: string) => `Got it, ${prenom}.`,
    appel: (quand: string | null) => `An adviser from a partner broker will call you ${quand ?? "during office hours"}.`,
    quand: { matin: "in the morning, between 8 and 11 am", midi: "around midday, between 11 am and 2 pm", "apres-midi": "in the afternoon, between 2 and 5 pm", soir: "in the early evening, between 5 and 7 pm" } as Record<Creneau, string>,
    err: {
      nom: "Enter your first and last name.",
      consent: "Tick this box so that your request can be passed on.",
      robot: "The anti-robot check has not finished yet. Try again in a moment.",
      trop: "Too many requests in a short time. Try again in a minute.",
      autre: "Your request could not be sent. Your answers are still here, so please try again.",
    },
  },
} as const;

type Erreurs = Partial<Record<"nom" | "tel" | "consent", string>>;

/** Ce que l'appelant ajoute à la demande : porte, besoin, profil éventuel (codes et nombres contrôlés par le schéma). */
export type DemandeCapture = Pick<Demande, "porte" | "besoin"> & Partial<Pick<Demande, "residence" | "details">>;
export type CaptureRappelHandle = { ouvrir: () => void };

export const CaptureRappel = forwardRef<
  CaptureRappelHandle,
  {
    locale: Locale;
    /** Préfixe des identifiants (deux blocs peuvent cohabiter sur une page). */
    idBase: string;
    className?: string;
    titre: string;
    /** Paragraphes sous le titre (promesse, explication). */
    intro: React.ReactNode;
    bouton: string;
    demande: () => DemandeCapture;
    /** Phrase ajoutée au message de succès. */
    merciPlus?: string;
    evenements: { vue: Evenement; envoyee: Evenement };
    /** Lien secondaire vers le formulaire complet. */
    complet?: { question: string; texte: string; href: string; onClick?: () => void };
    /** Envoyée : true, ou false si le visiteur masque le bloc. */
    onFin?: (envoyee: boolean) => void;
    /** Affiche le bouton « Masquer ». */
    masquable?: boolean;
  }
>(function CaptureRappel({ locale, idBase, className, titre, intro, bouton, demande, merciPlus, evenements, complet, onFin, masquable }, ref) {
  const t = T[locale];
  const id = (s: string) => `${idBase}-${s}`;
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [creneau, setCreneau] = useState<Creneau | null>(null);
  const [accord, setAccord] = useState(false);
  const [website, setWebsite] = useState("");
  const [jeton, setJeton] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [envoi, setEnvoi] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState<{ prenom: string; creneau: Creneau | null } | null>(null);
  const ouvertA = useRef(0);
  const resetTurnstile = useRef<(() => void) | null>(null);
  const blocRef = useRef<HTMLElement>(null);
  const nomRef = useRef<HTMLInputElement>(null);
  const merciRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    ouvertA.current = Date.now();
  }, []);

  /* Mesure : bloc vu (une fois, à moitié visible), aucune valeur. */
  useEffect(() => {
    const el = blocRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (e) => {
        if (e.some((x) => x.isIntersecting)) {
          suivre(evenements.vue);
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [evenements.vue]);

  useImperativeHandle(ref, () => ({
    ouvrir() {
      setOuvert(true);
      blocRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => (envoye ? merciRef.current : nomRef.current)?.focus({ preventScroll: true }), 350);
    },
  }));

  function valider(): Erreurs {
    const e: Erreurs = {};
    if (nom.trim().length < 2 || /[<>\p{Cc}]/u.test(nom)) e.nom = t.err.nom;
    const tl = verifierTelephone(tel, locale);
    if (tl.erreur) e.tel = tl.erreur;
    if (!accord) e.consent = t.err.consent;
    return e;
  }

  /* Une erreur affichée disparaît dès que le champ est corrigé. */
  useEffect(() => {
    if (!Object.keys(erreurs).length) return;
    const e = valider();
    const restantes = Object.fromEntries(Object.entries(erreurs).filter(([k]) => k in e).map(([k]) => [k, e[k as keyof Erreurs]])) as Erreurs;
    if (Object.keys(restantes).length !== Object.keys(erreurs).length) setErreurs(restantes);
  }, [nom, tel, accord]); // eslint-disable-line react-hooks/exhaustive-deps

  async function envoyer(ev: React.FormEvent) {
    ev.preventDefault();
    if (envoi) return;
    if (!ouvert) setOuvert(true);
    const e = valider();
    setErreurs(e);
    setEchec(null);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => blocRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !jeton) {
      setEchec(t.err.robot);
      return;
    }
    const chemin = window.location.pathname;
    const { utm } = origine();
    const corps: Demande = {
      ...demande(),
      locale,
      source: "form",
      ...(/^\/[A-Za-z0-9\-_/.]*$/.test(chemin) && chemin.length <= 300 ? { sourcePage: chemin } : {}),
      ...(utm ? { utm } : {}),
      contact: {
        fullName: nom.trim(),
        phone: verifierTelephone(tel, locale).e164!,
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
        suivre(evenements.envoyee, { porte: corps.porte });
        /* Conversion GA4 habituelle (generate_lead { porte, utm_* }) : ces pages ont GTM, elle part tout de suite. */
        marquerLead(corps.porte);
        mesurerLead(PORTES);
        setEnvoye({ prenom: nom.trim().split(/\s+/)[0], creneau });
        setNom("");
        setTel("");
        setEnvoi(false);
        onFin?.(true);
        requestAnimationFrame(() => merciRef.current?.focus());
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

  const classes = `capture-rappel ph-no-capture${className ? ` ${className}` : ""}`;

  if (envoye) {
    return (
      <section className={`${classes} capture-envoyee`} ref={blocRef} aria-labelledby={id("titre")}>
        <svg className="capture-coche" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="11" fill="currentColor" />
          <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="var(--background)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <h3 id={id("titre")} className="capture-titre">
            {t.merci(envoye.prenom)}
          </h3>
          <p ref={merciRef} tabIndex={-1} role="status">
            {t.appel(envoye.creneau ? t.quand[envoye.creneau] : null)}
            {merciPlus ? ` ${merciPlus}` : ""}
          </p>
        </div>
      </section>
    );
  }

  const invalide = (k: keyof Erreurs) => (erreurs[k] ? { "aria-invalid": true as const, "aria-describedby": id(`err-${k}`) } : {});
  const porte: Porte = demande().porte;

  return (
    <section className={classes} ref={blocRef} id={idBase} aria-labelledby={id("titre")} data-ouvert={ouvert || undefined}>
      <div className="capture-tete">
        <h3 id={id("titre")} className="capture-titre">
          {titre}
        </h3>
        {masquable ? (
          <button type="button" className="capture-masquer" onClick={() => onFin?.(false)} aria-label={t.fermer} title={t.fermer}>
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>
      <div className="capture-intro">{intro}</div>
      <form className="capture-form" onSubmit={envoyer} noValidate onFocus={() => setOuvert(true)}>
        {/* Pot de miel : invisible et hors tabulation, rempli seulement par un robot. */}
        <div className="pot" aria-hidden="true">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>
        <div className="capture-champs">
          <div className="champ">
            <label htmlFor={id("nom")}>{t.nom}</label>
            <input ref={nomRef} id={id("nom")} className="saisie" autoComplete="name" placeholder="Marie Dupont" autoCapitalize="words" maxLength={120} value={nom} onChange={(e) => setNom(e.target.value)} {...invalide("nom")} />
            <Erreur id={id("err-nom")} msg={erreurs.nom} />
          </div>
          <ChampTelephone id={id("tel")} locale={locale} value={tel} onChange={setTel} erreur={erreurs.tel} />
        </div>

        {ouvert ? (
          <>
            <fieldset className="capture-creneau">
              <legend className="legende-champ">
                {t.creneauQ} <span className="facultatif">({t.facultatif})</span>
              </legend>
              <div className="puces">
                {CRENEAUX.map((c) => (
                  <Puce key={c} type="checkbox" name={id("creneau")} checked={creneau === c} onChange={() => setCreneau((x) => (x === c ? null : c))}>
                    {CRENEAU_LABELS[c][locale]}
                  </Puce>
                ))}
              </div>
            </fieldset>
            <Consentements locale={locale} porte={porte} avecSante={false} accord={accord} setAccord={setAccord} accordSante={false} setAccordSante={() => {}} erreurs={erreurs} />
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
              <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} locale={locale} onToken={setJeton} resetRef={resetTurnstile} />
            ) : null}
          </>
        ) : null}

        {echec ? (
          <p className="echec" role="alert">
            {echec}
          </p>
        ) : null}
        <button type="submit" className="bouton capture-bouton" disabled={envoi} aria-busy={envoi || undefined}>
          {envoi ? t.envoi : bouton}
        </button>
        <p className="capture-rassurance">{TEXTE_CTA[locale].rassurance}</p>
        {complet ? (
          <p className="capture-complet">
            {complet.question}{" "}
            <a href={complet.href} onClick={complet.onClick}>
              {complet.texte}
            </a>
          </p>
        ) : null}
      </form>
    </section>
  );
});
