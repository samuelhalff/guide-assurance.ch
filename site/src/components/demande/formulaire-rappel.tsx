"use client";
import { useEffect, useRef, useState } from "react";
import { ChampTelephone, verifierTelephone } from "@/components/demande/champ-telephone";
import { CRENEAUX, CRENEAU_LABELS, FUNNEL_EVENTS, PORTE_RAPPEL, PORTES_DEF, RAPPEL_SUJET_DEFAUT, type Creneau } from "@shared/demande/portes";
import { CURRENT_CONSENT_VERSION } from "@shared/demande/consent-public";
import { cantonFromNpa } from "@shared/demande/npa";
import type { Demande } from "@shared/demande/schema";
import { suivre, marquerLead } from "@/lib/analytics";
import { DEMANDE, DEMANDE_ENVOYEE, TEXTE_CTA, lirePreremplissage } from "@/lib/demande";
import { Turnstile } from "@/components/demande/turnstile";
import { ChoixBoutons } from "@/components/controles";
import { Consentements, Erreur, Puce, origine, typo } from "@/components/demande/formulaire-demande";

type Locale = "fr" | "en";
const NB = " ";

/* Formulaire court « Être rappelé » : un seul écran, sans profil ni santé (porte « rappel »).
   Même envoi que le formulaire complet (POST /api/demande), même texte d'accord, même Turnstile. */
const T = {
  fr: {
    h1: "On vous rappelle",
    chapo: "Laissez votre nom et votre numéro. Un conseiller d’un courtier partenaire vous appellera pour faire le point sur votre situation.",
    nom: "Prénom et nom",
    sujetQ: `C’est à quel sujet${NB}?`,
    creneauQ: `Quand préférez-vous être appelé${NB}?`,
    npa: "NPA de votre domicile",
    canton: (c: string) => `Canton${NB}: ${c}`,
    npaInconnu: "Ce NPA est introuvable. Merci de le vérifier.",
    facultatif: "facultatif",
    envoyer: "Être rappelé",
    envoi: "Envoi…",
    complet: `Vous préférez décrire votre situation${NB}?`,
    completLien: "Remplir la demande complète",
    err: {
      nom: "Entrez votre prénom et votre nom.",
      npa: "Entrez un NPA à 4 chiffres, ou laissez le champ vide.",
      consent: "Cochez cette case pour que votre demande puisse être transmise.",
      robot: "La vérification anti-robot n’est pas terminée. Réessayez dans un instant.",
      trop: "Trop de demandes en peu de temps. Réessayez dans une minute.",
      autre: "L’envoi n’a pas abouti. Vos réponses sont conservées, il suffit de réessayer.",
    },
  },
  en: {
    h1: "We’ll call you back",
    chapo: "Leave your name and number. An adviser from a partner broker will call you to go through your situation with you.",
    nom: "First and last name",
    sujetQ: "What is it about?",
    creneauQ: "When would you prefer us to call?",
    npa: "Home postcode",
    canton: (c: string) => `Canton: ${c}`,
    npaInconnu: "We could not find this postcode. Please check it.",
    facultatif: "optional",
    envoyer: "Call me back",
    envoi: "Sending…",
    complet: "Would you rather describe your situation?",
    completLien: "Fill in the full request",
    err: {
      nom: "Enter your first and last name.",
      npa: "Enter a 4-digit postcode, or leave the field empty.",
      consent: "Tick this box so that your request can be passed on.",
      robot: "The anti-robot check has not finished yet. Try again in a moment.",
      trop: "Too many requests in a short time. Try again in a minute.",
      autre: "Your request could not be sent. Your answers are still here, so please try again.",
    },
  },
} as const;

type Erreurs = Partial<Record<"nom" | "tel" | "npa" | "consent", string>>;

export function FormulaireRappel({ locale }: { locale: Locale }) {
  const t = T[locale];
  const def = PORTES_DEF[PORTE_RAPPEL];
  const [pret, setPret] = useState(false);
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [sujet, setSujet] = useState<string>(RAPPEL_SUJET_DEFAUT);
  const [creneau, setCreneau] = useState<Creneau | null>(null);
  const [npa, setNpa] = useState("");
  const [accord, setAccord] = useState(false);
  const [website, setWebsite] = useState("");
  const [jeton, setJeton] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [envoi, setEnvoi] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);
  const ouvertA = useRef(0);
  const resetTurnstile = useRef<(() => void) | null>(null);

  useEffect(() => {
    ouvertA.current = Date.now();
    setPret(true);
    /* Préremplissage venu d'un outil (comparateur de primes) : NPA et sujet seulement, jamais d'autre donnée. */
    const pre = lirePreremplissage();
    if (pre.npa) setNpa(pre.npa);
    if (pre.besoin?.[0] && PORTES_DEF[PORTE_RAPPEL].besoin.choix.some((c) => c.code === pre.besoin![0])) setSujet(pre.besoin[0]);
    suivre(FUNNEL_EVENTS.ouverte, { porte: PORTE_RAPPEL });
  }, []);

  const canton = /^\d{4}$/.test(npa) ? cantonFromNpa(npa) : null;

  function valider(): Erreurs {
    const e: Erreurs = {};
    if (nom.trim().length < 2 || /[<>\p{Cc}]/u.test(nom)) e.nom = t.err.nom;
    const tl = verifierTelephone(tel, locale);
    if (tl.erreur) e.tel = tl.erreur;
    if (npa && !/^\d{4}$/.test(npa)) e.npa = t.err.npa;
    if (!accord) e.consent = t.err.consent;
    return e;
  }

  /* Une erreur affichée disparaît dès que le champ est corrigé. */
  useEffect(() => {
    if (!Object.keys(erreurs).length) return;
    const e = valider();
    const restantes = Object.fromEntries(Object.entries(erreurs).filter(([k]) => k in e).map(([k]) => [k, e[k as keyof Erreurs]])) as Erreurs;
    if (Object.keys(restantes).length !== Object.keys(erreurs).length) setErreurs(restantes);
  }, [nom, tel, npa, accord]); // eslint-disable-line react-hooks/exhaustive-deps

  async function envoyer(ev: React.FormEvent) {
    ev.preventDefault();
    if (envoi) return;
    const e = valider();
    setErreurs(e);
    setEchec(null);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !jeton) {
      setEchec(t.err.robot);
      return;
    }
    const corps: Demande = {
      porte: PORTE_RAPPEL,
      locale,
      source: "form",
      ...origine(),
      besoin: [sujet],
      ...(npa ? { residence: { livesInSwitzerland: true as const, npa } } : {}),
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
        suivre(FUNNEL_EVENTS.envoyee, { porte: PORTE_RAPPEL }, true);
        marquerLead(PORTE_RAPPEL);
        window.location.assign(`${DEMANDE_ENVOYEE[locale]}?p=${PORTE_RAPPEL}`);
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

  const invalide = (k: keyof Erreurs) => (erreurs[k] ? { "aria-invalid": true as const, "aria-describedby": `err-${k}` } : {});

  return (
    <div className="wrap demande demande-rappel" data-pret={pret || undefined}>
      <form className="demande-form" onSubmit={envoyer} noValidate>
        {/* Pot de miel : invisible et hors tabulation, rempli seulement par un robot. */}
        <div className="pot" aria-hidden="true">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>

        <section aria-labelledby="titre-ecran">
          <h1 id="titre-ecran">{t.h1}</h1>
          <p className="chapo-rappel">{t.chapo}</p>

          <div className="champ">
            <label htmlFor="nom">{t.nom}</label>
            <input id="nom" className="saisie" autoComplete="name" placeholder="Marie Dupont" autoCapitalize="words" maxLength={120} value={nom} onChange={(e) => setNom(e.target.value)} {...invalide("nom")} />
            <Erreur id="err-nom" msg={erreurs.nom} />
          </div>
          <ChampTelephone locale={locale} value={tel} onChange={setTel} erreur={erreurs.tel} />

          <fieldset>
            <legend className="legende-champ">
              {typo(t.sujetQ, locale)} <span className="facultatif">({t.facultatif})</span>
            </legend>
            <ChoixBoutons
              variante="puce"
              className="puces"
              name="sujet"
              value={sujet}
              onChange={setSujet}
              options={def.besoin.choix.map((c) => ({ value: c.code, label: c.label[locale] }))}
            />
          </fieldset>

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

          <div className="champ">
            <label htmlFor="npa">
              {t.npa} <span className="facultatif">({t.facultatif})</span>
            </label>
            <input id="npa" className="saisie saisie-courte" inputMode="numeric" placeholder="1201" autoComplete="postal-code" maxLength={4} pattern="[0-9]{4}" value={npa} onChange={(e) => setNpa(e.target.value.replace(/\D/g, "").slice(0, 4))} {...invalide("npa")} />
            {canton ? <p className="aide">{t.canton(canton)}</p> : npa.length === 4 ? <p className="aide">{t.npaInconnu}</p> : null}
            <Erreur id="err-npa" msg={erreurs.npa} />
          </div>

          <Consentements locale={locale} porte={PORTE_RAPPEL} avecSante={false} accord={accord} setAccord={setAccord} accordSante={false} setAccordSante={() => {}} erreurs={erreurs} />

          {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
            <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} locale={locale} onToken={setJeton} resetRef={resetTurnstile} />
          ) : null}

          {echec ? (
            <p className="echec" role="alert">
              {echec}
            </p>
          ) : null}
          <div className="actions-demande">
            <button type="submit" className="bouton" disabled={envoi} aria-busy={envoi || undefined}>
              {envoi ? t.envoi : t.envoyer}
            </button>
          </div>
          <p className="rassurance">{TEXTE_CTA[locale].rassurance}</p>
          <p className="vers-complet">
            {t.complet} <a href={DEMANDE[locale]}>{t.completLien}</a>
          </p>
        </section>
      </form>
    </div>
  );
}
