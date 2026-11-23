import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { Alert } from "@/components/ui/alert";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, graph } from "@/lib/jsonld";
import { DICT, dateLongue } from "@/lib/i18n";
import { SITE_NAME, abs } from "@/lib/site";
import { imagePartage } from "@/lib/og";
import { BASE_ACTUALITES, cheminArticle, type Article, type LocaleA } from "@/lib/actualites";
import { TEXTE_ACTU, robotsActualites } from "@/components/actualites/page-actualite";

const TEXTE = {
  fr: {
    titre: "Actualités de l’assurance en Suisse romande",
    h1: "Actualités",
    description: "Primes LAMal, taux 3a et règles de l’assurance en Suisse romande : des articles courts, datés et sourcés, tirés des données officielles.",
    chapo: "Des articles courts sur les primes, les taux 3a et les règles qui changent, avec leurs dates et leurs sources officielles. Aucun ne recommande d’assureur ni de banque.",
    vide: "Aucune actualité n’est publiée pour l’instant.",
    flux: "S’abonner au flux RSS",
  },
  en: {
    titre: "Insurance news, French-speaking Switzerland",
    h1: "News",
    description: "LAMal premiums, pillar 3a rates and insurance rules in French-speaking Switzerland: short articles, dated and sourced from official data.",
    chapo: "Short articles on premiums, pillar 3a rates and changing rules, each with its dates and official sources. None recommends an insurer or a bank.",
    vide: "No news has been published yet.",
    flux: "Subscribe to the RSS feed",
  },
} as const;

export function metadataListe(l: LocaleA, publies: Article[]): Metadata {
  const t = TEXTE[l];
  const title = `${t.titre} | Guide Assurance`.length <= 60 ? `${t.titre} | Guide Assurance` : t.titre;
  const autre = l === "fr" ? "en" : "fr";
  return {
    title: { absolute: title },
    description: t.description,
    robots: robotsActualites(publies.length > 0),
    alternates: {
      canonical: abs(BASE_ACTUALITES[l]),
      /* hreflang seulement quand la liste est indexable (au moins un article publié). */
      ...(publies.length ? { languages: { "fr-CH": abs(BASE_ACTUALITES.fr), en: abs(BASE_ACTUALITES.en), "x-default": abs(BASE_ACTUALITES.fr) } } : {}),
      types: { "application/rss+xml": abs(`${BASE_ACTUALITES[l]}feed.xml`) },
    },
    openGraph: {
      type: "website",
      locale: l === "fr" ? "fr_CH" : "en_GB",
      alternateLocale: [autre === "en" ? "en_GB" : "fr_CH"],
      siteName: SITE_NAME,
      title,
      description: t.description,
      url: abs(BASE_ACTUALITES[l]),
      images: [{ url: abs(imagePartage(BASE_ACTUALITES[l], l)), width: 1200, height: 630, alt: title }],
    },
  };
}

/* Liste des actualités, de la plus récente à la plus ancienne. `lien` donne l'adresse de chaque article
   (page publique, ou aperçu pour la liste des brouillons). */
export function ListeActualites({ l, articles, lien = cheminArticle, apercu }: { l: LocaleA; articles: Article[]; lien?: (a: Article) => string; apercu?: string }) {
  const t = TEXTE[l];
  const ta = TEXTE_ACTU[l];
  const d = DICT[l];
  const url = abs(BASE_ACTUALITES[l]);
  const miettes = [{ name: d.accueil, href: l === "fr" ? "/" : "/en/" }, { name: ta.rubrique }];
  const ld = graph(
    {
      "@type": "CollectionPage",
      "@id": `${url}#webpage`,
      url,
      name: t.titre,
      description: t.description,
      inLanguage: d.inLanguage,
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORG_ID },
      breadcrumb: { "@id": `${url}#breadcrumb` },
      ...(articles.length ? { dateModified: articles.map((a) => a.dateModified).sort().at(-1) } : {}),
      mainEntity: {
        "@type": "ItemList",
        itemListElement: articles.map((a, i) => ({ "@type": "ListItem", position: i + 1, url: abs(cheminArticle(a)), name: a.title })),
      },
    },
    breadcrumbLd(miettes, `${url}#breadcrumb`),
  );
  return (
    <div className="page-guide page-actualites">
      {apercu ? null : <JsonLd data={ld} />}
      <SiteHeader current="actualites" locale={l} altPath={BASE_ACTUALITES[l === "fr" ? "en" : "fr"]} />
      <main>
        <div className="wrap">
          {apercu ? <Alert variant="attention" className="mt-4" role="note">{apercu}</Alert> : null}
          <Breadcrumbs items={miettes} locale={l} />
          <h1>{t.h1}</h1>
          <p className="chapo">{t.chapo}</p>
          {articles.length ? (
            <ol className="liste-actualites">
              {articles.map((a) => (
                <li key={a.slug}>
                  <time dateTime={a.datePublished}>{dateLongue(a.datePublished, l)}</time>
                  <h2>
                    <a href={lien(a)}>{a.title}</a>
                  </h2>
                  <p>{a.description}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="liste-vide">{t.vide}</p>
          )}
          {apercu ? null : (
            <p className="actu-flux">
              <a href={`${BASE_ACTUALITES[l]}feed.xml`} type="application/rss+xml">
                <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                  <path d="M4 4a12 12 0 0 1 12 12M4 9a7 7 0 0 1 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="5" cy="15" r="1.6" fill="currentColor" />
                </svg>
                {t.flux}
              </a>
            </p>
          )}
        </div>
      </main>
      <SiteFooter locale={l} altPath={BASE_ACTUALITES[l === "fr" ? "en" : "fr"]} />
    </div>
  );
}
