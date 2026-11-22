import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

/* Page de remerciement (avec GTM : elle vit dans (fr)/(en) pour la conversion). Aucune donnée personnelle
   dans l'adresse : seule la porte (?p=) y figure. */
const T = {
  fr: {
    h1: "Demande envoyée, merci",
    chapo: "Un conseiller d’un courtier partenaire va vous appeler, au moment que vous avez choisi si vous en avez indiqué un.",
    suite: "La suite",
    etapes: [
      "Le conseiller vous appelle pour comprendre votre situation et vos besoins.",
      "Il compare ensuite les offres adaptées à votre cas et vous les présente.",
      "La décision vous revient, et rien ne vous engage tant que vous n’avez pas signé.",
    ],
    contact: "Un empêchement ou une question ? Écrivez à",
    retour: "Retour aux guides",
    retourHref: "/guides/",
    autre: "/en/request-sent/",
  },
  en: {
    h1: "Request sent, thank you",
    chapo: "An adviser from a partner broker will call you, at the time you chose if you gave one.",
    suite: "What happens next",
    etapes: [
      "The adviser calls you to understand your situation and needs.",
      "They then compare the offers that fit your case and present them to you.",
      "The decision is yours, and nothing binds you until you have signed.",
    ],
    contact: "Can’t make it, or have a question? Write to",
    retour: "Back to the guides",
    retourHref: "/en/guides/",
    autre: "/demande-envoyee/",
  },
} as const;

export function DemandeEnvoyee({ locale }: { locale: "fr" | "en" }) {
  const t = T[locale];
  return (
    <div className="page-outil">
      <SiteHeader locale={locale} altPath={t.autre} rappel={false} />
      <main>
        <div className="wrap envoyee">
          <h1>{t.h1}</h1>
          <p className="intro">{t.chapo}</p>
          <h2>{t.suite}</h2>
          <ol>
            {t.etapes.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ol>
          <p>
            {t.contact} <a href="mailto:contact@guide-assurance.ch">contact@guide-assurance.ch</a>.
          </p>
          <p>
            <a href={t.retourHref}>{t.retour}</a>
          </p>
        </div>
      </main>
      <SiteFooter locale={locale} altPath={t.autre} />
    </div>
  );
}
