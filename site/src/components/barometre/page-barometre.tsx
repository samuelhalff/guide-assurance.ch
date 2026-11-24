import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { BarometreCanton, BarometreHub, faqCanton, faqHub, leadCanton } from "@/components/barometre/barometre";
import { faqOutilLd } from "@/components/site/faq-sections";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { ANNEE_BAROMETRE as A, DATE_BAROMETRE, DONNEES, chf, datasetBarometreLd, donneesCanton, infoCanton, pct } from "@/lib/barometre";
import { ROUTES_IDEES, cheminBarometre } from "@/lib/pages-idees";
import type { Locale } from "@/lib/i18n";
import { ESPACE_FINE as T } from "@/lib/nombres";

/* Pages du baromètre (FR et EN) : métadonnées, JSON-LD et gabarit. Les fichiers de route ne font qu'appeler ces fonctions. */

function metaCanton(code: string, l: Locale) {
  const c = donneesCanton(code);
  const i = infoCanton(code);
  const fr = l === "fr";
  const titre = fr ? `Primes LAMal ${A} ${i.aFr} : hausse et écarts` : `${A} LAMal premiums in ${i.en}: increase and gaps`;
  const description = fr
    ? `En ${A}, la prime moyenne d’un adulte ${i.aFr} est de ${chf(c.officiel.adulte, l)} par mois (${pct(c.officiel.variation_pct, l)}, OFSP). Écarts entre offres et chiffres par région.`
    : `In ${A}, the average adult premium in ${i.en_in} is ${chf(c.officiel.adulte, l)} a month (${pct(c.officiel.variation_pct, l)}, FOPH). Gaps between offers and figures by premium region.`;
  const h1 = fr ? `Baromètre des primes maladie ${A} ${i.deFr}` : `${A} health insurance premium barometer: ${i.en}`;
  return { titre, description, h1 };
}

const metaHub = (l: Locale) =>
  l === "fr"
    ? {
        titre: `Baromètre des primes LAMal ${A} en Suisse romande`,
        description: `Primes moyennes ${A} de l’assurance de base dans les six cantons romands, hausse par rapport à ${A - 1} et écart entre les offres, selon l’OFSP.`,
        h1: `Baromètre des primes maladie ${A} en Suisse romande`,
      }
    : {
        titre: `${A} LAMal premium barometer, French-speaking Switzerland`,
        description: `${A} average basic health insurance premiums in the six French-speaking cantons, the increase since ${A - 1} and the gap between offers, from FOPH data.`,
        h1: `${A} health insurance premium barometer for French-speaking Switzerland`,
      };

const miettesHub = (l: Locale): Miette[] =>
  l === "fr"
    ? [{ name: "Accueil", href: "/" }, { name: "Assurance maladie", href: "/assurance-maladie/" }, { name: "Baromètre des primes" }]
    : [{ name: "Home", href: "/en/" }, { name: "Health", href: "/en/health-insurance/" }, { name: "Premium barometer" }];

export function metadataBarometre(l: Locale, code?: string): Metadata {
  const m = code ? metaCanton(code, l) : metaHub(l);
  const path = code ? cheminBarometre(code, l) : ROUTES_IDEES.barometre[l];
  const autre = code ? cheminBarometre(code, l === "fr" ? "en" : "fr") : ROUTES_IDEES.barometre[l === "fr" ? "en" : "fr"];
  return pageMetadata({ title: m.titre, description: m.description, path, locale: l, ...(l === "fr" ? { enPath: autre } : { frPath: autre }) });
}

export function PageBarometre({ l, code }: { l: Locale; code?: string }) {
  const fr = l === "fr";
  const m = code ? metaCanton(code, l) : metaHub(l);
  const path = code ? cheminBarometre(code, l) : ROUTES_IDEES.barometre[l];
  const autre = code ? cheminBarometre(code, fr ? "en" : "fr") : ROUTES_IDEES.barometre[fr ? "en" : "fr"];
  const URL_ = abs(path);
  const miettes: Miette[] = code
    ? [...miettesHub(l).slice(0, 2), { name: fr ? "Baromètre des primes" : "Premium barometer", href: ROUTES_IDEES.barometre[l] }, { name: fr ? infoCanton(code).fr : infoCanton(code).en }]
    : miettesHub(l);
  const faq = code ? faqCanton(code, l) : faqHub(l);
  const LD = graph(
    {
      "@type": "WebPage",
      "@id": `${URL_}#webpage`,
      url: URL_,
      name: m.titre,
      description: m.description,
      inLanguage: fr ? "fr-CH" : "en",
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORG_ID },
      datePublished: "2026-11-23",
      dateModified: DATE_BAROMETRE,
      breadcrumb: { "@id": `${URL_}#breadcrumb` },
      mainEntity: { "@id": `${URL_}#donnees` },
      ...(code ? { abstract: leadCanton(code, l) } : {}),
      citation: [DONNEES.source.moyennes.urls[0], "https://www.priminfo.admin.ch/", "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_7"],
    },
    breadcrumbLd(miettes, `${URL_}#breadcrumb`),
    { ...faqLd(faqOutilLd(faq)), "@id": `${URL_}#faq` },
    datasetBarometreLd(l, `${URL_}#donnees`, code),
    ...(code
      ? []
      : [
          {
            "@type": "ItemList",
            "@id": `${URL_}#cantons`,
            itemListElement: DONNEES.cantons.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: fr ? infoCanton(c.code).fr : infoCanton(c.code).en, url: abs(cheminBarometre(c.code, l)) })),
          },
        ]),
  );
  return (
    <div className="page-outil page-barometre">
      <JsonLd data={LD} />
      <SiteHeader current="sante" locale={l} altPath={autre} />
      <main id="contenu">
        <div className="wrap">
          <Breadcrumbs items={miettes} locale={l} />
          <h1>{m.h1}</h1>
          {code ? <BarometreCanton code={code} l={l} /> : <BarometreHub l={l} />}
        </div>
      </main>
      <SiteFooter
        locale={l}
        altPath={autre}
        note={fr ? `Chiffres de l’OFSP mis en forme par Guide Assurance${T}; la prime de votre police fait foi.` : "FOPH figures formatted by Guide Assurance; the premium on your policy prevails."}
      />
    </div>
  );
}
