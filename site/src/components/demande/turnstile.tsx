"use client";
import { useEffect, useRef } from "react";

/* Widget Cloudflare Turnstile, rendu seulement si NEXT_PUBLIC_TURNSTILE_SITE_KEY existe (voir le formulaire).
   Action « demande » par défaut, « assistant » pour l'assistant (contrôlée par leads), mode géré : visible seulement si une interaction est nécessaire. */
type API = {
  render: (el: HTMLElement, o: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: API;
  }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let chargement: Promise<API> | null = null;

function charger(): Promise<API> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  chargement ??= new Promise<API>((ok, ko) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => (window.turnstile ? ok(window.turnstile) : ko(new Error("turnstile")));
    s.onerror = () => {
      chargement = null;
      ko(new Error("turnstile"));
    };
    document.head.appendChild(s);
  });
  return chargement;
}

export function Turnstile({
  siteKey,
  locale,
  onToken,
  resetRef,
  action = "demande",
}: {
  action?: string;
  siteKey: string;
  locale: "fr" | "en";
  onToken: (t: string | null) => void;
  resetRef: React.RefObject<(() => void) | null>;
}) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let id: string | null = null;
    let api: API | null = null;
    let fini = false;
    charger()
      .then((a) => {
        if (fini || !el.current) return;
        api = a;
        id = a.render(el.current, {
          sitekey: siteKey,
          action,
          appearance: "interaction-only",
          language: locale,
          callback: (t: string) => onToken(t),
          "expired-callback": () => onToken(null),
          "error-callback": () => onToken(null),
        });
        resetRef.current = () => id && a.reset(id);
      })
      .catch(() => onToken(null));
    return () => {
      fini = true;
      if (api && id) api.remove(id);
      resetRef.current = null;
    };
  }, [siteKey, locale, onToken, resetRef, action]);
  return <div ref={el} className="turnstile" />;
}
