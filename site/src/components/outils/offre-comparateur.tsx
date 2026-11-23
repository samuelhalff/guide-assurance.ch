"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ChampTelephone, verifierTelephone } from "@/components/demande/champ-telephone";
import { Consentements, Erreur, Puce, origine } from "@/components/demande/formulaire-demande";
import { Turnstile } from "@/components/demande/turnstile";
import { CRENEAUX, CRENEAU_LABELS, PORTES, type Creneau } from "@shared/demande/portes";
import { CURRENT_CONSENT_VERSION } from "@shared/demande/consent-public";
import { ecrireProfilPrime, type ProfilPrime } from "@shared/demande/details";
import type { Demande } from "@shared/demande/schema";
import { marquerLead, mesurerLead, suivre } from "@/lib/analytics";
import { TEXTE_CTA, ecrirePreremplissage, lienDemande } from "@/lib/demande";

/* Bloc « Recevoir des offres pour ce profil », sous le résumé du comparateur de primes.
   Le résultat reste entièrement visible sans rien donner : ce bloc est une option, jamais une condition.
   Même envoi que le formulaire court (POST /api/demande, Turnstile, pot de miel, délai minimal), même texte d'accord
   versionné, porte « sante ». Le profil saisi dans le comparateur part avec la demande (NPA, années, franchises,
   accident, taille du foyer) ; la mesure ne reçoit aucune valeur saisie. Bloc exclu de l'enregistrement de session
   et de l'autocapture (ph-no-capture). */

type Locale = "fr" | "en";
const NNBSP = " ";

const T = {
  fr: {
    titre: "Recevoir des offres pour ce profil",
    ecart: (x: string) => `Pour ce profil, la prime la plus haute dépasse la plus basse de ${x} par an, redistribution déduite.`,
    suite: "Laissez votre nom et votre numéro. Un conseiller d’un courtier partenaire vous rappelle avec des offres calculées pour ce profil, sans que vous ayez à le décrire une deuxième fois.",
    nom: "Prénom et nom",
    creneauQ: `Quand préférez-vous être appelé${NNBSP}?`,
    facultatif: "facultatif",
    envoyer: "Recevoir des offres",
    envoi: "Envoi…",
    complet: `Vous préférez tout décrire vous-même${NNBSP}?`,
    completLien: "Remplir la demande complète",
    merci: (prenom: string) => `C’est noté, ${prenom}.`,
    merciSuite: (quand: string | null) =>
      `Un conseiller d’un courtier partenaire vous appellera ${quand ?? "aux heures de bureau"}. Il reçoit le profil saisi ici, vous n’aurez pas à le redonner.`,
    quand: { matin: "le matin, entre 8 h et 11 h", midi: "à midi, entre 11 h et 14 h", "apres-midi": "l’après-midi, entre 14 h et 17 h", soir: "en fin de journée, entre 17 h et 19 h" } as Record<Creneau, string>,
    err: {
      nom: "Entrez votre prénom et votre nom.",
      consent: "Cochez cette case pour que votre demande puisse être transmise.",
      robot: "La vérification anti-robot n’est pas terminée. Réessayez dans un instant.",
      trop: "Trop de demandes en peu de temps. Réessayez dans une minute.",
      autre: "L’envoi n’a pas abouti. Vos réponses sont conservées, il suffit de réessayer.",
    },
  },
  en: {
    titre: "Get offers for this profile",
    ecart: (x: string) => `For this profile, the highest premium is ${x} a year above the lowest, after the redistribution.`,
    suite: "Leave your name and number. An adviser from a partner broker will call you back with offers worked out for this profile, so you will not have to describe it again.",
    nom: "First and last name",
    creneauQ: "When would you prefer us to call?",
    facultatif: "optional",
    envoyer: "Get offers",
    envoi: "Sending…",
    complet: "Would you rather describe everything yourself?",
    completLien: "Fill in the full request",
    merci: (prenom: string) => `Got it, ${prenom}.`,
    merciSuite: (quand: string | null) =>
      `An adviser from a partner broker will call you ${quand ?? "during office hours"}. They receive the profile you entered here, so you will not have to give it again.`,
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

export type ProfilComparateur = { npa: string; personnes: ProfilPrime[] };
export type OffreComparateurHandle = { ouvrir: () => void };

export const OffreComparateur = forwardRef<
  OffreComparateurHandle,
  {
    locale: Locale;
    profil: ProfilComparateur;
    /** Écart annuel entre la prime la plus haute et la plus basse, déjà formaté (null s'il n'y a qu'une offre). */
    ecartAn: string | null;
    onEnvoyee?: () => void;
  }
>(function OffreComparateur({ locale, profil, ecartAn, onEnvoyee }, ref) {
  const t = T[locale];
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

  /* Mesure : bloc vu (une fois par page, à moitié visible), aucune valeur. */
  useEffect(() => {
    const el = blocRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (e) => {
        if (e.some((x) => x.isIntersecting)) {
          suivre("offre_comparateur_vue");
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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
    const p1 = profil.personnes[0];
    const chemin = window.location.pathname;
    const { utm } = origine();
    const corps: Demande = {
      porte: "sante",
      locale,
      source: "form",
      ...(/^\/[A-Za-z0-9\-_/.]*$/.test(chemin) && chemin.length <= 300 ? { sourcePage: chemin } : {}),
      ...(utm ? { utm } : {}),
      besoin: ["lamal"],
      residence: { livesInSwitzerland: true, npa: profil.npa, birthYear: p1.annee, householdSize: Math.min(4, profil.personnes.length) },
      details: { comparateur: profil.personnes.map(ecrireProfilPrime) },
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
        suivre("offre_comparateur_envoyee", { porte: "sante" });
        /* Conversion GA4 habituelle (generate_lead { porte, utm_* }) : cette page a GTM, elle part tout de suite. */
        marquerLead("sante");
        mesurerLead(PORTES);
        setEnvoye({ prenom: nom.trim().split(/\s+/)[0], creneau });
        setNom("");
        setTel("");
        setEnvoi(false);
        onEnvoyee?.();
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

  function versComplet() {
    const p1 = profil.personnes[0];
    ecrirePreremplissage({ porte: "sante", besoin: ["lamal"], npa: profil.npa, birthYear: p1.annee, householdSize: Math.min(4, profil.personnes.length) });
  }

  if (envoye) {
    return (
      <section className="offre-comparateur offre-envoyee ph-no-capture" ref={blocRef} aria-labelledby="offre-titre">
        <svg className="offre-coche" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="11" fill="currentColor" />
          <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="var(--background)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <h3 id="offre-titre" className="offre-titre" tabIndex={-1}>
            {t.merci(envoye.prenom)}
          </h3>
          <p ref={merciRef} tabIndex={-1} role="status">
            {t.merciSuite(envoye.creneau ? t.quand[envoye.creneau] : null)}
          </p>
        </div>
      </section>
    );
  }

  const invalide = (k: keyof Erreurs) => (erreurs[k] ? { "aria-invalid": true as const, "aria-describedby": `err-offre-${k}` } : {});

  return (
    <section className="offre-comparateur ph-no-capture" ref={blocRef} id="offre-comparateur" aria-labelledby="offre-titre" data-ouvert={ouvert || undefined}>
      <h3 id="offre-titre" className="offre-titre">{t.titre}</h3>
      {ecartAn ? <p className="offre-ecart">{t.ecart(ecartAn)}</p> : null}
      <p className="offre-suite">{t.suite}</p>
      <form className="offre-form" onSubmit={envoyer} noValidate onFocus={() => setOuvert(true)}>
        {/* Pot de miel : invisible et hors tabulation, rempli seulement par un robot. */}
        <div className="pot" aria-hidden="true">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>
        <div className="offre-champs">
          <div className="champ">
            <label htmlFor="offre-nom">{t.nom}</label>
            <input ref={nomRef} id="offre-nom" className="saisie" autoComplete="name" placeholder="Marie Dupont" autoCapitalize="words" maxLength={120} value={nom} onChange={(e) => setNom(e.target.value)} {...invalide("nom")} />
            <Erreur id="err-offre-nom" msg={erreurs.nom} />
          </div>
          <ChampTelephone locale={locale} value={tel} onChange={setTel} erreur={erreurs.tel} />
        </div>

        {ouvert ? (
          <>
            <fieldset className="offre-creneau">
              <legend className="legende-champ">
                {t.creneauQ} <span className="facultatif">({t.facultatif})</span>
              </legend>
              <div className="puces">
                {CRENEAUX.map((c) => (
                  <Puce key={c} type="checkbox" name="offre-creneau" checked={creneau === c} onChange={() => setCreneau((x) => (x === c ? null : c))}>
                    {CRENEAU_LABELS[c][locale]}
                  </Puce>
                ))}
              </div>
            </fieldset>
            <Consentements locale={locale} porte="sante" avecSante={false} accord={accord} setAccord={setAccord} accordSante={false} setAccordSante={() => {}} erreurs={erreurs} />
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
        <button type="submit" className="bouton offre-bouton" disabled={envoi} aria-busy={envoi || undefined}>
          {envoi ? t.envoi : t.envoyer}
        </button>
        <p className="offre-rassurance">{TEXTE_CTA[locale].rassurance}</p>
        <p className="offre-complet">
          {t.complet}{" "}
          <a href={lienDemande(locale, "sante")} onClick={versComplet}>
            {t.completLien}
          </a>
        </p>
      </form>
    </section>
  );
});
