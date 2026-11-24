import { Depliable } from "@/components/controles";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, datasetPrimesLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { DATE_PRIMES } from "@/lib/date-primes";
import { abs } from "@/lib/site";
import type { Rubrique } from "@/lib/nav";
import { DICT, dateLongue, type Locale } from "@/lib/i18n";
import type { Porte } from "@shared/demande/portes";
import { CtaDemande } from "@/components/demande/cta-demande";
import { BarreDemande } from "@/components/demande/barre-demande";
import { IconeTelephone, LienRappel } from "@/components/demande/lien-rappel";
import { LandingTete } from "@/components/site/landing-tete";
import { jsonLdAccueil } from "@/lib/jsonld-accueil";
import { TEXTE_LANDING, ZONE_DESSERVIE, type Landing } from "@/lib/landing";
import { outils } from "@/lib/nav";
import { TEXTE_CTA, estPorteOffre } from "@/lib/demande";
import { buttonVariants } from "@/components/ui/button";

export type Source = { label: string; href?: string };
export type OutilLie = { href: string; titre: string; detail?: string };
export type QuestionFaq = { q: string; a: string };
export type ProduitLie = { href: string; titre: string };

/* Outils publics qui portent une WebApplication (même @id que sur la page de l'outil). */
const APPLI: Record<"comparateur" | "simulateur" | "lettre", { fr: string; en: string }> = {
  comparateur: { fr: "Comparer les primes LAMal 2027", en: "Compare 2027 LAMal premiums" },
  simulateur: { fr: "Simulateur frontalier : LAMal ou assurance maladie française", en: "Cross-border calculator: Swiss LAMal or French health insurance" },
  lettre: { fr: "Lettre de résiliation d’assurance maladie", en: "Swiss health insurance cancellation letter" },
};

/* Mise en page commune des pages guide et produit : fil d'Ariane, H1, chapô, « Mis à jour le … » et sources,
   corps d'article (styles .prose), encadré « Outils liés », FAQ. Émet WebPage (ou Article), BreadcrumbList
   et FAQPage en JSON-LD. Le texte de la FAQ est passé en chaîne : la même chaîne sert à la page et au JSON-LD. */
export function GuidePage({
  path,
  titre,
  h1,
  description,
  chapo,
  miettes,
  rubrique,
  majIso,
  publieIso,
  sources = [],
  outilsLies = [],
  faq = [],
  type = "WebPage",
  noteFooter,
  locale = "fr",
  altPath,
  porte,
  landing,
  produitsLies = [],
  children,
}: {
  path: string;
  titre: string;
  h1: string;
  description: string;
  chapo?: React.ReactNode;
  miettes: Miette[];
  rubrique?: Rubrique;
  majIso: string;
  publieIso?: string;
  sources?: Source[];
  outilsLies?: OutilLie[];
  faq?: QuestionFaq[];
  type?: "WebPage" | "Article";
  noteFooter?: string;
  locale?: Locale;
  altPath?: string;
  /** Porte du formulaire de demande : appel en fin d'article et barre collante (mobile). */
  porte?: Porte;
  /** Page produit en landing : bloc de tête (lib/landing.ts), Service et WebApplication en JSON-LD, rappel en fin de page. */
  landing?: Landing;
  /** Autres pages produit, listées sous les outils liés. */
  produitsLies?: ProduitLie[];
  children: React.ReactNode;
}) {
  const t = DICT[locale];
  const tl = TEXTE_LANDING[locale];
  const url = abs(path);
  const estPagePrimes = path === "/assurance-maladie/primes/" || path === "/en/health-insurance/premiums/";
  const appli = landing && landing.action !== "rappel" ? { id: abs(`${outils(locale)[landing.action]}#outil`), url: abs(outils(locale)[landing.action]), name: APPLI[landing.action][locale] } : null;
  const ldLanding = landing
    ? [
        /* Entités communes (Guide Assurance, éditée par West Bay SA) pour que provider se résolve dans la page. */
        ...jsonLdAccueil["@graph"].slice(0, 2),
        {
          "@type": "Service",
          "@id": `${url}#service`,
          name: locale === "fr" ? `${landing.service} : information et rappel par un conseiller` : `${landing.service}: information and adviser call-back`,
          serviceType: landing.service,
          description: landing.reponse,
          url,
          provider: { "@id": ORG_ID },
          areaServed: ZONE_DESSERVIE,
          availableLanguage: ["fr", "en"],
        },
        ...(appli
          ? [
              {
                "@type": "WebApplication",
                "@id": appli.id,
                name: appli.name,
                url: appli.url,
                applicationCategory: "FinanceApplication",
                operatingSystem: "Web",
                inLanguage: t.inLanguage,
                isAccessibleForFree: true,
                provider: { "@id": ORG_ID },
              },
            ]
          : []),
      ]
    : [];
  const ld = graph(
    {
      "@type": type,
      "@id": `${url}#webpage`,
      url,
      name: titre,
      ...(type === "Article" ? { headline: h1, author: { "@id": ORG_ID } } : {}),
      description,
      inLanguage: t.inLanguage,
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORG_ID },
      ...(publieIso ? { datePublished: publieIso } : {}),
      dateModified: majIso,
      breadcrumb: { "@id": `${url}#breadcrumb` },
      ...(sources.some((s) => s.href) ? { citation: sources.filter((s) => s.href).map((s) => s.href) } : {}),
      ...(landing ? { about: { "@id": `${url}#service` } } : {}),
      ...(appli ? { mentions: { "@id": appli.id } } : {}),
      ...(estPagePrimes ? { mainEntity: { "@id": `${url}#donnees` } } : {}),
    },
    breadcrumbLd(miettes, `${url}#breadcrumb`),
    ...(faq.length ? [{ ...faqLd(faq), "@id": `${url}#faq` }] : []),
    ...ldLanding,
    /* Page « Primes 2027 » : jeu de données des primes OFSP. */
    ...(estPagePrimes ? [datasetPrimesLd(locale, `${url}#donnees`, DATE_PRIMES)] : []),
  );

  return (
    <div className={landing ? "page-guide page-landing" : "page-guide"}>
      <JsonLd data={ld} />
      <SiteHeader current={rubrique} locale={locale} altPath={altPath} />
      <main id="contenu">
        <div className="wrap">
          <Breadcrumbs items={miettes} locale={locale} />
          {landing ? (
            <LandingTete h1={h1} landing={estPorteOffre(porte) ? { ...landing, sujet: porte } : landing} locale={locale} porte={estPorteOffre(porte) ? porte : undefined} />
          ) : (
            <>
              <h1>{h1}</h1>
              {chapo ? <p className="chapo">{chapo}</p> : null}
            </>
          )}
          <div className="guide-meta">
            <p style={{ margin: 0 }}>
              {t.majLe} <time dateTime={majIso}>{dateLongue(majIso, locale)}</time>
              {sources.length ? ` · ${t.source(sources.length)}` : ""}
            </p>
            {sources.length ? (
              <Depliable titre={t.voirSources}>
                <ol>
                  {sources.map((s) => (
                    <li key={s.label}>{s.href ? <a href={s.href}>{s.label}</a> : s.label}</li>
                  ))}
                </ol>
              </Depliable>
            ) : null}
          </div>

          <div className="guide-grille">
            <article className="prose">{children}</article>
            {outilsLies.length || produitsLies.length ? (
              <aside className="outils-lies" aria-labelledby={outilsLies.length ? "outils-lies-titre" : "produits-lies-titre"}>
                {outilsLies.length ? <h2 id="outils-lies-titre">{t.outilsLies}</h2> : null}
                {outilsLies.length ? <ul>
                  {outilsLies.map((o) => (
                    <li key={o.href}>
                      <a href={o.href}>
                        <span>
                          <b>{o.titre}</b>
                          {o.detail ? <span>{o.detail}</span> : null}
                        </span>
                        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                          <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </a>
                    </li>
                  ))}
                </ul> : null}
                {produitsLies.length ? (
                  <>
                    <h2 id="produits-lies-titre" className={outilsLies.length ? "suite" : undefined}>{tl.autresTitre}</h2>
                    <ul>
                      {produitsLies.map((p) => (
                        <li key={p.href}>
                          <a href={p.href}>
                            <span>
                              <b>{p.titre}</b>
                            </span>
                            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                              <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
                            </svg>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </aside>
            ) : null}
          </div>
          {porte ? (
            <CtaDemande locale={locale} porte={porte} />
          ) : landing ? (
            <div className="cta-demande">
              <LienRappel locale={locale} emplacement="produit" sujet={landing.sujet} className={buttonVariants({ className: "max-[719px]:justify-between" })}>
                <IconeTelephone />
                {tl.rappelBouton}
              </LienRappel>
              <p>{TEXTE_CTA[locale].rassurance}</p>
            </div>
          ) : null}
        </div>

        {faq.length ? (
          <section className="wrap guide-faq" aria-labelledby="faq-titre">
            <h2 id="faq-titre">{t.faq}</h2>
            {faq.map((f) => (
              <section key={f.q}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </section>
            ))}
          </section>
        ) : null}
      </main>
      <SiteFooter note={noteFooter} locale={locale} altPath={altPath} />
      {porte ? <BarreDemande locale={locale} porte={porte} /> : landing ? <BarreDemande locale={locale} rappelSujet={landing.sujet} /> : null}
    </div>
  );
}
