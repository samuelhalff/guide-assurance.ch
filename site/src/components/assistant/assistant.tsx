"use client";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { LogoSilhouette } from "@/components/site/logo";
import { Turnstile } from "@/components/demande/turnstile";
import { suivre } from "@/lib/analytics";
import { RAPPEL, ecrirePreremplissage, lienDemande } from "@/lib/demande";
import {
  TEXTE_ASSISTANT,
  ErreurAssistant,
  blocs,
  demander,
  ecrireFil,
  lireFil,
  pucesOffre,
  type Inline,
  type Message,
  type Offre,
} from "@/lib/assistant";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const MAX = 600;
const MARQUE_OFFRE = "\n[[rappel]]";

/* Assistant conversationnel (docs/agent-spec.md, decisions.md §8 ter).
   Bouton rond en bas à droite, visible après le premier écran (il ne couvre ni le bouton principal ni le
   bouquetin) ; panneau plein écran sur mobile, fenêtre de 420 px sur ordinateur. La conversation reste dans
   l'onglet ; le serveur ne l'enregistre pas. Mesure : trois événements PostHog sans contenu. */
export function Assistant({ locale = "fr" }: { locale?: "fr" | "en" }) {
  const t = TEXTE_ASSISTANT[locale];
  const [ouvert, setOuvert] = useState(false);
  const [boutonVisible, setBoutonVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [session, setSession] = useState<string | undefined>();
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const jeton = useRef<string | null>(null);
  const resetTurnstile = useRef<(() => void) | null>(null);
  const fil = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLTextAreaElement>(null);
  const charge = useRef(false);

  /* Conversation de l'onglet (retour d'une page de guide). */
  useEffect(() => {
    const f = lireFil();
    setMessages(f.messages.filter((m) => m.content || m.erreur));
    setSession(f.session);
    charge.current = true;
    if (window.location.hash === "#assistant") setOuvert(true);
  }, []);
  useEffect(() => {
    if (charge.current && !enCours) ecrireFil({ messages, session });
  }, [messages, session, enCours]);

  /* Le bouton apparaît après 60 % du premier écran, ou tout de suite sur une page courte. */
  useEffect(() => {
    const placer = () => {
      const court = document.documentElement.scrollHeight <= window.innerHeight * 1.4;
      setBoutonVisible(court || window.scrollY > window.innerHeight * 0.6);
    };
    placer();
    window.addEventListener("scroll", placer, { passive: true });
    window.addEventListener("resize", placer);
    return () => {
      window.removeEventListener("scroll", placer);
      window.removeEventListener("resize", placer);
    };
  }, []);

  useEffect(() => {
    const el = fil.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, ouvert]);

  const changerOuvert = (o: boolean) => {
    setOuvert(o);
    if (o) suivre("assistant_ouvert");
  };

  const surJeton = useCallback((v: string | null) => {
    jeton.current = v;
  }, []);

  /* Premier message : attend le jeton Turnstile (10 s au plus). */
  const attendreJeton = async () => {
    if (!SITE_KEY) return undefined;
    for (let i = 0; i < 50 && !jeton.current; i++) await new Promise((r) => setTimeout(r, 200));
    return jeton.current ?? undefined;
  };

  const majDernier = (f: (m: Message) => Message) =>
    setMessages((ms) => {
      const copie = ms.slice();
      copie[copie.length - 1] = f(copie[copie.length - 1]);
      return copie;
    });

  const envoyer = async (texte: string) => {
    const q = texte.trim();
    if (!q || enCours) return;
    if (q.length > MAX) {
      setMessages((ms) => [...ms, { role: "assistant", content: t.erreurs.long, erreur: true }]);
      return;
    }
    const historique = [...messages.filter((m) => !m.erreur && m.content), { role: "user" as const, content: q }]
      .map((m) => ({ role: m.role, content: (m.content + (m.offre ? MARQUE_OFFRE : "")).slice(0, 4000) }))
      .slice(-40);
    setMessages((ms) => [...ms, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setSaisie("");
    setEnCours(true);
    let sess = session;
    const essai = async (deuxieme: boolean): Promise<void> => {
      const turnstileToken = sess ? undefined : await attendreJeton();
      if (!sess) {
        /* Jeton à usage unique : on le consomme et on en prépare un autre pour une éventuelle nouvelle session. */
        jeton.current = null;
        resetTurnstile.current?.();
      }
      try {
        await demander({ locale, messages: historique, session: sess, turnstileToken }, (e) => {
          if (e.t === "start") {
            sess = e.session;
            setSession(e.session);
          } else if (e.t === "d") majDernier((m) => ({ ...m, content: m.content + e.v }));
          else if (e.t === "replace") majDernier((m) => ({ ...m, content: e.v }));
          else if (e.t === "done") majDernier((m) => ({ ...m, notice: e.notice, offre: e.offer }));
          else if (e.t === "error") majDernier((m) => ({ ...m, content: m.content || t.erreurs.reseau, erreur: !m.content }));
        });
      } catch (err) {
        const code = err instanceof ErreurAssistant ? err.code : "reseau";
        if (!deuxieme && (code === "turnstile_required" || code === "turnstile_failed")) {
          sess = undefined;
          setSession(undefined);
          return essai(true);
        }
        const msg =
          code === "session_limit"
            ? t.erreurs.session
            : code === "daily_limit"
              ? t.erreurs.quotidien
              : code === "rate_limited"
                ? t.erreurs.limite
                : code === "disabled"
                  ? t.erreurs.indisponible
                  : code.startsWith("turnstile")
                    ? t.erreurs.verification
                    : code === "too_large"
                      ? t.erreurs.long
                      : t.erreurs.reseau;
        majDernier(() => ({ role: "assistant", content: msg, erreur: true }));
      }
    };
    await essai(false);
    setEnCours(false);
    suivre("assistant_message", { n: historique.filter((m) => m.role === "user").length });
    /* Sur téléphone, pas de retour au champ : le clavier cacherait la réponse. */
    if (window.matchMedia("(pointer: fine)").matches) requestAnimationFrame(() => champ.current?.focus({ preventScroll: true }));
  };

  const nouvelle = () => {
    setMessages([]);
    setSession(undefined);
    ecrireFil({ messages: [] });
    champ.current?.focus();
  };

  /* Formulaire court d'abord (un écran : nom, téléphone, sujet = porte de l'offre, NPA), formulaire complet ensuite. */
  const versDemande = (o: Offre, formulaire: "rappel" | "complet") => {
    if (formulaire === "rappel") ecrirePreremplissage({ besoin: [o.porte], npa: o.npa });
    else ecrirePreremplissage({ porte: o.porte, besoin: o.besoin, npa: o.npa, birthYear: o.birthYear, householdSize: o.householdSize });
    suivre("assistant_vers_demande", { porte: o.porte, formulaire }, true);
    window.location.href = formulaire === "rappel" ? RAPPEL[locale] : lienDemande(locale, o.porte);
  };

  return (
    <DialogPrimitive.Root open={ouvert} onOpenChange={changerOuvert}>
      <DialogPrimitive.Trigger
        className="assistant-bouton"
        data-visible={(boutonVisible && !ouvert) || undefined}
        aria-label={t.ouvrir}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8.5 9h7M8.5 12h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="assistant-bouton-lib">{t.bouton}</span>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="assistant-fond" />
        <DialogPrimitive.Popup className="assistant-panneau">
          <header className="assistant-tete">
            <span className="assistant-tuile" aria-hidden="true">
              <LogoSilhouette />
            </span>
            <div className="assistant-titres">
              <DialogPrimitive.Title className="assistant-titre">{t.titre}</DialogPrimitive.Title>
              <p className="assistant-sous-titre">{t.sousTitre}</p>
            </div>
            {messages.length > 0 && (
              <button type="button" className="commande" onClick={nouvelle} disabled={enCours} aria-label={t.nouvelle} title={t.nouvelle}>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <DialogPrimitive.Close className="commande" aria-label={t.fermer}>
              <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </DialogPrimitive.Close>
          </header>

          <div className="assistant-fil" ref={fil} aria-live="polite" aria-busy={enCours}>
            <div className="assistant-msg assistant-msg-a">
              <p>{t.accueil}</p>
            </div>
            {messages.length === 0 && (
              <div className="assistant-exemples">
                <p>{t.exemplesTitre}</p>
                {t.exemples.map((e) => (
                  <button key={e} type="button" onClick={() => void envoyer(e)}>
                    {e}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="assistant-msg assistant-msg-u">
                  {m.content}
                </div>
              ) : (
                <Fragment key={i}>
                  <div className="assistant-msg assistant-msg-a" data-erreur={m.erreur || undefined}>
                    {m.content ? <Rendu md={m.content} /> : <p className="assistant-ecrit">{t.reflexion}</p>}
                    {m.notice && <p className="assistant-mention">{m.notice}</p>}
                  </div>
                  {m.offre && (
                    <div className="assistant-rappel">
                      <p className="assistant-rappel-titre">{t.rappelTitre}</p>
                      <ul className="assistant-puces">
                        {pucesOffre(m.offre, locale).map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                      <p className="assistant-rappel-texte">{t.rappelTexte}</p>
                      <button type="button" className="bouton" onClick={() => versDemande(m.offre!, "rappel")}>
                        {t.rappelBouton}
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                          <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <p className="assistant-rappel-texte">
                        <a href={lienDemande(locale, m.offre.porte)} onClick={(e) => { e.preventDefault(); versDemande(m.offre!, "complet"); }}>{t.rappelComplet}</a>
                        {t.rappelCompletSuite}
                      </p>
                    </div>
                  )}
                </Fragment>
              ),
            )}
          </div>

          {SITE_KEY && !session && <Turnstile siteKey={SITE_KEY} locale={locale} action="assistant" onToken={surJeton} resetRef={resetTurnstile} />}

          <form
            className="assistant-saisie"
            onSubmit={(e) => {
              e.preventDefault();
              void envoyer(saisie);
            }}
          >
            <label className="sr" htmlFor="assistant-champ">
              {t.champ}
            </label>
            <textarea
              id="assistant-champ"
              ref={champ}
              rows={1}
              maxLength={MAX}
              value={saisie}
              placeholder={t.placeholder}
              enterKeyHint="send"
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void envoyer(saisie);
                }
              }}
            />
            <button type="submit" className="assistant-envoyer" aria-label={t.envoyer} disabled={enCours || !saisie.trim()}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
          <p className="assistant-pied">
            {t.pied} <a href={t.piedHref}>{t.piedLien}</a>
          </p>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Morceaux({ v }: { v: Inline[] }) {
  return (
    <>
      {v.map((x, i) =>
        x.k === "t" ? (
          <Fragment key={i}>{x.v}</Fragment>
        ) : x.k === "b" ? (
          <strong key={i}>{x.v}</strong>
        ) : x.ext ? (
          <a key={i} href={x.href} target="_blank" rel="noopener noreferrer">
            {x.v}
          </a>
        ) : (
          <a key={i} href={x.href}>
            {x.v}
          </a>
        ),
      )}
    </>
  );
}

function Rendu({ md }: { md: string }) {
  return (
    <>
      {blocs(md).map((b, i) =>
        b.k === "p" ? (
          <p key={i} className={/^Sources?\s? ?:/.test(b.v[0]?.k === "t" ? b.v[0].v : "") ? "assistant-sources" : undefined}>
            <Morceaux v={b.v} />
          </p>
        ) : b.k === "ul" ? (
          <ul key={i}>
            {b.v.map((li, j) => (
              <li key={j}>
                <Morceaux v={li} />
              </li>
            ))}
          </ul>
        ) : (
          <ol key={i}>
            {b.v.map((li, j) => (
              <li key={j}>
                <Morceaux v={li} />
              </li>
            ))}
          </ol>
        ),
      )}
    </>
  );
}
