import { SiteHeader } from "@/components/site/site-header";
import { Depliable } from "@/components/controles";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { AppelRappel, Faqs, N, type Faq } from "@/components/donnees/commun";
import { Card, CardContent } from "@/components/ui/card";
import { groupes, toutesLesSources } from "@/lib/chiffres-cles";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { DATE_PAGE_DONNEES } from "@/lib/donnees";
import { dateLongue, type Locale } from "@/lib/i18n";
import { OUTILS, OUTILS_EN, PAGES_DONNEES, PAGES_DONNEES_EN } from "@/lib/nav";

/* « Chiffres clés 2027 » (idée 3 du rapport 08) : page citable, une phrase par fait avec une ancre stable,
   la validité, la source et la méthode. Le contenu vient de lib/chiffres-cles.ts (repris dans llms-full.txt). */

const TXT = {
  fr: {
    path: PAGES_DONNEES.chiffres,
    alt: PAGES_DONNEES_EN.chiffres,
    titre: "Chiffres clés 2027 : primes LAMal, 3e pilier, délais",
    description: "Primes LAMal 2027 par canton romand, écarts entre offres, plafonds et taux du 3e pilier, délais à connaître : chaque chiffre est daté, sourcé et citable.",
    h1: "Chiffres clés 2027 de l’assurance maladie et du 3e pilier",
    intro: `Voici les chiffres 2027 les plus demandés pour la Suisse romande, une phrase par chiffre. Chaque phrase porte un lien direct (le symbole # à sa fin), une date de validité et sa source. Les chiffres calculés par Guide Assurance viennent des données officielles publiées et ne nomment ni assureur ni banque.`,
    miettes: [{ name: "Accueil", href: "/" }, { name: "Chiffres clés 2027" }] as Miette[],
    validite: "Validité",
    source: "Source",
    methode: "Méthode",
    lien: "Lien vers ce chiffre",
    citerTitre: `Comment citer ces chiffres${N}?`,
    citer: `Citez la phrase telle quelle avec son lien direct, par exemple « Guide Assurance, Chiffres clés 2027, ${abs(PAGES_DONNEES.chiffres)}#prime-moyenne-ge ». Les fichiers de données (CSV) sont publiés sous licence CC${N}BY${N}4.0.`,
    donnees: [
      { href: PAGES_DONNEES.regions, texte: "Primes 2027 par région de prime" },
      { href: PAGES_DONNEES.communes3a, texte: "Économie d’impôt 3a par commune" },
      { href: PAGES_DONNEES.historique3a, texte: "Historique des taux 3a" },
      { href: OUTILS.comparateur, texte: "Comparateur des primes 2027" },
    ],
    sourcesTitre: "Toutes les sources",
    rappelQ: `Besoin d’aide pour appliquer ces chiffres à votre situation${N}?`,
    faq: [
      {
        q: `Pourquoi la moyenne de l’OFSP diffère-t-elle de la prime médiane d’une région${N}?`,
        a: `L’OFSP calcule une moyenne pondérée par le nombre d’assurés, toutes franchises et tous modèles confondus. La prime médiane des pages par région porte sur un profil précis (adulte, franchise de 300${N}CHF, accident compris) et compte chaque offre une fois.`,
      },
      {
        q: `À quelle fréquence la page est-elle mise à jour${N}?`,
        a: `Les primes et les plafonds changent une fois par an, à l’automne. Les taux 3a sont relevés chaque lundi et la page reprend le dernier relevé à chaque mise à jour du site.`,
      },
      {
        q: `Ces chiffres valent-ils conseil${N}?`,
        a: `Non. Ils décrivent le marché et la loi à une date donnée. Pour votre prime, utilisez le comparateur ; pour votre impôt, le calculateur 3a.`,
      },
    ] as Faq[],
    maj: `Page mise à jour le ${dateLongue(DATE_PAGE_DONNEES.chiffres, "fr")}.`,
    footer: "Chiffres donnés à titre d’information, d’après les sources officielles citées.",
  },
  en: {
    path: PAGES_DONNEES_EN.chiffres,
    alt: PAGES_DONNEES.chiffres,
    titre: "2027 key figures: health premiums, pillar 3a, deadlines",
    description: "2027 health insurance premiums by French-speaking canton, gaps between offers, pillar 3a caps and rates, key deadlines: each figure dated, sourced and citable.",
    h1: "2027 key figures for health insurance and pillar 3a",
    intro: "Here are the most requested 2027 figures for French-speaking Switzerland, one sentence per figure. Each sentence has a direct link (the # sign at its end), a validity date and its source. Figures calculated by Guide Assurance come from published official data and name no insurer or bank.",
    miettes: [{ name: "Home", href: "/en/" }, { name: "2027 key figures" }] as Miette[],
    validite: "Validity",
    source: "Source",
    methode: "Method",
    lien: "Link to this figure",
    citerTitre: "How should these figures be cited?",
    citer: `Quote the sentence as it stands with its direct link, for example “Guide Assurance, 2027 key figures, ${abs(PAGES_DONNEES_EN.chiffres)}#prime-moyenne-ge”. The data files (CSV) are published under a CC BY 4.0 licence.`,
    donnees: [
      { href: PAGES_DONNEES_EN.regions, texte: "2027 premiums by premium region" },
      { href: PAGES_DONNEES_EN.communes3a, texte: "Pillar 3a tax savings by municipality" },
      { href: PAGES_DONNEES_EN.historique3a, texte: "Pillar 3a rate history" },
      { href: OUTILS_EN.comparateur, texte: "2027 premium comparison" },
    ],
    sourcesTitre: "All sources",
    rappelQ: "Need help applying these figures to your situation?",
    faq: [
      {
        q: "Why does the FOPH average differ from a region’s median premium?",
        a: "The FOPH computes an average weighted by the number of insured people, across all deductibles and models. The median premium on the regional pages covers one specific profile (adult, CHF 300 deductible, accident included) and counts each offer once.",
      },
      {
        q: "How often is the page updated?",
        a: "Premiums and caps change once a year, in the autumn. Pillar 3a rates are read every Monday, and the page shows the latest survey each time the site is updated.",
      },
      {
        q: "Are these figures advice?",
        a: "No. They describe the market and the law at a given date. For your premium, use the comparison tool; for your tax, the 3a calculator.",
      },
    ] as Faq[],
    maj: `Page updated on ${dateLongue(DATE_PAGE_DONNEES.chiffres, "en")}.`,
    footer: "Figures for information only, from the official sources cited.",
  },
};

export const metaChiffresCles = (locale: Locale) => {
  const t = TXT[locale];
  return pageMetadata({ title: t.titre, description: t.description, path: t.path, locale, ...(locale === "fr" ? { enPath: t.alt } : { frPath: t.alt }) });
};

export function PageChiffresCles({ locale }: { locale: Locale }) {
  const t = TXT[locale];
  const fr = locale === "fr";
  const url = abs(t.path);
  const G = groupes(locale);
  /* Première question : la réponse du premier groupe (moyennes OFSP), datée par sa source. */
  const faq: Faq[] = [
    {
      q: fr ? `Quelle est la prime moyenne de l’assurance maladie en 2027 en Suisse romande${N}?` : "What is the average health insurance premium in 2027 in French-speaking Switzerland?",
      a: `${G[0].reponse} ${fr ? "Chiffres publiés par l’OFSP le 29.09.2026." : "Figures published by the FOPH on 29.09.2026."}`,
    },
    ...t.faq,
  ];
  const ld = graph(
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: t.titre,
      description: t.description,
      inLanguage: fr ? "fr-CH" : "en",
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORG_ID },
      datePublished: "2026-11-23",
      dateModified: DATE_PAGE_DONNEES.chiffres,
      breadcrumb: { "@id": `${url}#breadcrumb` },
      citation: toutesLesSources(locale).map((s) => s.url),
    },
    breadcrumbLd(t.miettes, `${url}#breadcrumb`),
    { ...faqLd(faq), "@id": `${url}#faq` },
  );
  return (
    <div className="page-outil page-donnees">
      <JsonLd data={ld} />
      <SiteHeader current="outils" locale={locale} altPath={t.alt} />
      <main>
        <div className="wrap">
          <Breadcrumbs items={t.miettes} locale={locale} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>
          <nav className="sommaire-chiffres" aria-label={fr ? "Sommaire" : "Contents"}>
            <ul>
              {G.map((g) => (
                <li key={g.id}><a href={`#${g.id}`}>{g.question}</a></li>
              ))}
            </ul>
          </nav>

          {G.map((g) => (
            <section key={g.id} id={g.id} className="reperes-statiques chiffres-groupe">
              <h2>{g.question}</h2>
              <p>{g.reponse}</p>
              <ol className="faits">
                {g.faits.map((f) => (
                  <li key={f.id} id={f.id} className="fait">
                    <Card>
                      <CardContent>
                        <p className="fait-texte">
                          {f.texte}{" "}
                          <a className="ancre" href={`#${f.id}`} aria-label={t.lien}>#</a>
                        </p>
                        <p className="fait-meta">
                          <span>{t.validite}{fr ? `${N}:` : ":"} {f.validite}</span>{" "}
                          <span>
                            {t.source}{fr ? `${N}:` : ":"}{" "}
                            {f.sources.map((s, i) => (
                              <span key={s.url}>
                                {i > 0 ? ", " : ""}
                                <a href={s.url} rel={s.url.startsWith("http") && !s.url.includes("guide-assurance.ch") ? "noopener" : undefined}>{s.label}</a>
                              </span>
                            ))}
                            .
                          </span>{" "}
                          <span>{t.methode}{fr ? `${N}:` : ":"} {f.methode}</span>
                        </p>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ol>
            </section>
          ))}

          <section className="reperes-statiques">
            <h2>{t.citerTitre}</h2>
            <p>{t.citer}</p>
            <ul>
              {t.donnees.map((d) => (
                <li key={d.href}><a href={d.href}>{d.texte}</a></li>
              ))}
            </ul>
          </section>

          <Depliable className="sources-chiffres" titre={t.sourcesTitre}>
            <ul>
              {toutesLesSources(locale).map((s) => (
                <li key={s.url}><a href={s.url}>{s.label}</a></li>
              ))}
            </ul>
          </Depliable>

          <AppelRappel locale={locale} sujet="sante" question={t.rappelQ} />
        </div>
        <Faqs faq={faq} maj={t.maj} />
      </main>
      <SiteFooter note={t.footer} locale={locale} altPath={t.alt} />
    </div>
  );
}
