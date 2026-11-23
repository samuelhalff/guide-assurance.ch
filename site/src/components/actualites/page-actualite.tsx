import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { IconeTelephone, LienRappel } from "@/components/demande/lien-rappel";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph } from "@/lib/jsonld";
import { jsonLdAccueil } from "@/lib/jsonld-accueil";
import { DICT, dateLongue } from "@/lib/i18n";
import { INDEXABLE, SITE_NAME, abs } from "@/lib/site";
import { imagePartage } from "@/lib/og";
import { BASE_ACTUALITES, cheminArticle, equivalentPublie, outilsLiesActualite, type Article } from "@/lib/actualites";

const N = " ";
export const TEXTE_ACTU = {
  fr: {
    rubrique: "Actualités",
    publie: "Publié le",
    maj: "mis à jour le",
    sources: "Sources",
    rappelQ: `Une question sur votre situation${N}?`,
    rappelLien: "Être rappelé par un conseiller",
    rappelSuite: "Votre nom et votre numéro suffisent.",
    note: "Information générale, sans conseil personnalisé. Votre contrat et la loi font foi.",
    apercu: "Aperçu d’un brouillon, non publié et non indexé. Rien n’est en ligne avant votre accord.",
    flux: "Flux RSS des actualités",
  },
  en: {
    rubrique: "News",
    publie: "Published on",
    maj: "updated on",
    sources: "Sources",
    rappelQ: "A question about your own situation?",
    rappelLien: "Ask an adviser to call you back",
    rappelSuite: "Your name and number are enough.",
    note: "General information, not personal advice. Your contract and the law prevail.",
    apercu: "Preview of a draft, not published and not indexed. Nothing goes live without your approval.",
    flux: "News RSS feed",
  },
} as const;

/* Métadonnées d'un article publié : og:type article, dates de publication, flux RSS déclaré. */
export function metadataArticle(a: Article): Metadata {
  const t = `${a.title} | Guide Assurance`;
  const title = t.length <= 60 ? t : a.title;
  const autre = equivalentPublie(a);
  const fr = a.locale === "fr" ? a : autre;
  const en = a.locale === "en" ? a : autre;
  const languages: Record<string, string> = {};
  if (fr) languages["fr-CH"] = abs(cheminArticle(fr));
  if (en) languages.en = abs(cheminArticle(en));
  if (fr) languages["x-default"] = abs(cheminArticle(fr));
  const url = abs(cheminArticle(a));
  return {
    title: { absolute: title },
    description: a.description,
    alternates: { canonical: url, languages, types: { "application/rss+xml": abs(`${BASE_ACTUALITES[a.locale]}feed.xml`) } },
    openGraph: {
      type: "article",
      publishedTime: a.datePublished,
      modifiedTime: a.dateModified,
      locale: a.locale === "fr" ? "fr_CH" : "en_GB",
      siteName: SITE_NAME,
      title,
      description: a.description,
      url,
      images: [{ url: abs(imagePartage(cheminArticle(a), a.locale)), width: 1200, height: 630, alt: a.title }],
    },
    twitter: { card: "summary_large_image" },
  };
}

/* Métadonnées d'un aperçu : jamais indexé, jamais suivi, aucune adresse canonique. */
export const metadataApercu = (titre: string): Metadata => ({
  title: { absolute: `Aperçu : ${titre}` },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
});

/* Page d'un article (publié, ou brouillon en aperçu). Dates visibles, corps Markdown, FAQ visible reprise mot pour
   mot dans FAQPage, sources en liste, outils liés, appel « Être rappelé » (emplacement actualite). */
export function PageActualite({ a, apercu = false }: { a: Article; apercu?: boolean }) {
  const l = a.locale;
  const t = TEXTE_ACTU[l];
  const d = DICT[l];
  const path = cheminArticle(a);
  const url = abs(path);
  const autre = apercu ? undefined : equivalentPublie(a);
  const miettes = [{ name: d.accueil, href: l === "fr" ? "/" : "/en/" }, { name: t.rubrique, href: BASE_ACTUALITES[l] }, { name: a.title }];
  const outils = outilsLiesActualite(a);
  const ld = graph(
    ...jsonLdAccueil["@graph"].slice(0, 2),
    {
      "@type": "NewsArticle",
      "@id": `${url}#article`,
      url,
      mainEntityOfPage: url,
      headline: a.title,
      description: a.description,
      inLanguage: d.inLanguage,
      datePublished: a.datePublished,
      dateModified: a.dateModified,
      author: { "@id": ORG_ID },
      publisher: { "@id": ORG_ID },
      isPartOf: { "@id": WEBSITE_ID },
      image: abs(imagePartage(path, l)),
      citation: a.sources.map((s) => s.url),
      wordCount: a.mots,
      breadcrumb: { "@id": `${url}#breadcrumb` },
    },
    breadcrumbLd(miettes, `${url}#breadcrumb`),
    ...(a.faq.length ? [{ ...faqLd(a.faq), "@id": `${url}#faq` }] : []),
  );
  return (
    <div className="page-guide page-actualite">
      <JsonLd data={ld} />
      <SiteHeader locale={l} altPath={autre ? cheminArticle(autre) : BASE_ACTUALITES[l === "fr" ? "en" : "fr"]} />
      <main>
        <div className="wrap">
          {apercu ? <p className="apercu-bandeau" role="note">{t.apercu}</p> : null}
          <Breadcrumbs items={miettes} locale={l} />
          <p className="actu-rubrique">{t.rubrique}</p>
          <h1>{a.title}</h1>
          <p className="chapo">{a.description}</p>
          <p className="guide-meta actu-dates">
            {t.publie} <time dateTime={a.datePublished}>{dateLongue(a.datePublished, l)}</time>
            {a.dateModified !== a.datePublished ? (
              <>
                , {t.maj} <time dateTime={a.dateModified}>{dateLongue(a.dateModified, l)}</time>
              </>
            ) : null}
            {` · ${d.source(a.sources.length)}`}
          </p>
          <div className="guide-grille">
            <article className="prose" dangerouslySetInnerHTML={{ __html: a.html }} />
            {outils.length ? (
              <aside className="outils-lies" aria-labelledby="outils-lies-titre">
                <h2 id="outils-lies-titre">{d.outilsLies}</h2>
                <ul>
                  {outils.map((o) => (
                    <li key={o.href}>
                      <a href={o.href}>
                        <span>
                          <b>{o.titre}</b>
                          <span>{o.detail}</span>
                        </span>
                        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                          <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </a>
                    </li>
                  ))}
                </ul>
              </aside>
            ) : null}
          </div>
          <div className="cta-demande actu-rappel">
            <p className="actu-rappel-q">{t.rappelQ}</p>
            <LienRappel locale={l} emplacement="actualite" className="bouton">
              <IconeTelephone />
              {t.rappelLien}
            </LienRappel>
            <p>{t.rappelSuite}</p>
          </div>
        </div>
        {a.faq.length ? (
          <section className="wrap guide-faq" aria-labelledby="faq-titre">
            <h2 id="faq-titre">{d.faq}</h2>
            {a.faq.map((f) => (
              <section key={f.q}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </section>
            ))}
          </section>
        ) : null}
        <section id="sources" className="wrap actu-sources" aria-labelledby="sources-titre">
          <h2 id="sources-titre">{t.sources}</h2>
          <ol>
            {a.sources.map((s) => (
              <li key={s.url + s.label}>
                <a href={s.url}>{s.label}</a>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <SiteFooter note={t.note} locale={l} altPath={autre ? cheminArticle(autre) : undefined} />
    </div>
  );
}

export const robotsActualites = (publiables: boolean): Metadata["robots"] =>
  INDEXABLE && publiables ? { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } : { index: false, follow: true };
