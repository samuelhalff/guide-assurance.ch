"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { CONSENTEMENT_REQUIS, GTM_ID, MESURE_ACTIVE, apresChargement, demarrerPostHog, ecrireChoix, lireChoix, memoriserUtm, persistantNavigateur, suivre, versGA } from "@/lib/analytics";
import { extensionTelechargement, utmDepuis } from "@/lib/mesure-regles";

/* Une seule règle partout : sans choix, tout est actif ; seul « Refuser » l'arrête. */
const TXT = {
  fr: {
    texte: "Sans choix de votre part, nos cookies de mesure d’audience et publicitaires sont actifs et certaines visites sont enregistrées pour améliorer les guides. Ce que vous saisissez n’est jamais enregistré. Vous pouvez refuser.",
    oui: "Accepter",
    non: "Refuser",
    lien: "En savoir plus",
    href: "/confidentialite/#mesure",
    region: "Cookies",
  },
  en: {
    texte: "Unless you choose otherwise, our analytics and advertising cookies are on and some visits are recorded to improve the guides. What you type is never recorded. You can decline.",
    oui: "Accept",
    non: "Decline",
    lien: "Learn more",
    href: "/en/privacy/#measurement",
    region: "Cookies",
  },
} as const;

/* Démarre PostHog et affiche le bandeau tant qu'aucun choix n'est enregistré. Les états Google par défaut
   (par région) et GTM sont posés par le script du <head> (amorceGTM). Les deux boutons ont le même poids. */
export function Mesure({ locale = "fr" }: { locale?: "fr" | "en" }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!MESURE_ACTIVE) return;
    /* PostHog (environ 220 Ko) se charge après l'affichage ; les événements antérieurs attendent dans la file. */
    apresChargement(() => void demarrerPostHog(persistantNavigateur()));
    if (CONSENTEMENT_REQUIS && lireChoix() === null) setVisible(true);
    const rouvrir = () => setVisible(true);
    window.addEventListener("mesure:rouvrir", rouvrir);
    return () => window.removeEventListener("mesure:rouvrir", rouvrir);
  }, []);
  useMesureGA();
  if (!visible) return null;
  const t = TXT[locale];
  const choisir = (c: "oui" | "non") => {
    ecrireChoix(c);
    void demarrerPostHog(c === "oui");
    setVisible(false);
  };
  return (
    <div className="consentement" role="region" aria-label={t.region}>
      <p>
        {t.texte} <a href={t.href}>{t.lien}</a>
      </p>
      <div className="consentement-actions">
        <button type="button" className="commande-cadre" onClick={() => choisir("non")}>
          {t.non}
        </button>
        <button type="button" className="commande-cadre" onClick={() => choisir("oui")}>
          {t.oui}
        </button>
      </div>
    </div>
  );
}

const PALIERS = [25, 50, 75, 90];

/* Fonction stable (hors composant) : useReportWebVitals se réabonne, et renvoie la dernière valeur, à chaque nouvelle fonction. */
type Vital = { name: string; value: number; delta: number; id: string; rating?: string };
function envoyerVital(m: Vital) {
  if (m.name !== "LCP" && m.name !== "INP" && m.name !== "CLS") return;
  const v = m.name === "CLS" ? m.value * 1000 : m.value;
  versGA(m.name, { value: Math.round(v), metric_id: m.id, metric_value: Number(m.value.toFixed(m.name === "CLS" ? 4 : 0)), metric_delta: Math.round(m.name === "CLS" ? m.delta * 1000 : m.delta), metric_rating: m.rating ?? "", non_interaction: true });
}

/* Événements GA4 posés par écouteurs délégués, sans toucher aux pages : profondeur de lecture, liens sortants,
   téléchargements, questions de FAQ ouvertes, copie manuelle du code d'un widget, UTM de la session, Core Web Vitals.
   Aucune valeur saisie : seulement des adresses de liens du site, des positions et des index. */
function useMesureGA() {
  const chemin = usePathname();
  useReportWebVitals(envoyerVital);
  useEffect(() => {
    if (!GTM_ID) return;
    memoriserUtm(utmDepuis(window.location.search));
  }, []);
  /* Profondeur de lecture, remise à zéro à chaque page. */
  useEffect(() => {
    if (!GTM_ID) return;
    const vus = new Set<number>();
    let attente = false;
    const mesurer = () => {
      attente = false;
      const h = document.documentElement.scrollHeight;
      if (h <= window.innerHeight * 1.1) return;
      const pc = ((window.scrollY + window.innerHeight) / h) * 100;
      for (const p of PALIERS) if (pc >= p && !vus.has(p)) {
        vus.add(p);
        versGA("scroll", { percent_scrolled: p });
      }
    };
    const surDefilement = () => {
      if (!attente) {
        attente = true;
        requestAnimationFrame(mesurer);
      }
    };
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => window.removeEventListener("scroll", surDefilement);
  }, [chemin]);
  useEffect(() => {
    if (!MESURE_ACTIVE) return;
    const clic = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      let u: URL;
      try {
        u = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (u.protocol !== "http:" && u.protocol !== "https:") return;
      const ext = extensionTelechargement(u.pathname);
      if (ext) versGA("file_download", { file_extension: ext, file_name: u.pathname.split("/").pop() ?? "", link_url: u.origin + u.pathname });
      else if (u.hostname !== window.location.hostname) versGA("click", { link_domain: u.hostname, link_url: u.origin + u.pathname, outbound: true });
    };
    /* toggle ne remonte pas : écouté en phase de capture. */
    const ouverture = (e: Event) => {
      const d = e.target as HTMLDetailsElement;
      if (!(d instanceof HTMLDetailsElement) || !d.open) return;
      const bloc = d.closest(".guide-faq, .faq, [data-faq]");
      if (!bloc) return;
      const index = Array.from(bloc.querySelectorAll("details")).indexOf(d);
      suivre("faq_ouverte", { question_index: index + 1, page: window.location.pathname });
    };
    const copie = (e: ClipboardEvent) => {
      const c = (e.target as Element | null)?.closest?.(".code-widget") as HTMLTextAreaElement | null;
      if (c) suivre("code_integration_copie", { widget: c.id.replace(/^code-/, ""), methode: "manuel" });
    };
    document.addEventListener("click", clic, true);
    document.addEventListener("toggle", ouverture, true);
    document.addEventListener("copy", copie, true);
    return () => {
      document.removeEventListener("click", clic, true);
      document.removeEventListener("toggle", ouverture, true);
      document.removeEventListener("copy", copie, true);
    };
  }, []);
}

/* Lien « Cookies » du pied de page pour revoir son choix. */
export function RouvrirMesure() {
  if (!CONSENTEMENT_REQUIS) return null;
  return (
    <button type="button" className="lien-pied" onClick={() => window.dispatchEvent(new Event("mesure:rouvrir"))}>
      Cookies
    </button>
  );
}
