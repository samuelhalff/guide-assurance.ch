import { SITE_URL, abs } from "@/lib/site";

/* Données structurées (schema.org). Les entités communes portent un @id stable, référencé par chaque page. */
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export type Miette = { name: string; href?: string };

export function breadcrumbLd(items: Miette[], id?: string) {
  return {
    "@type": "BreadcrumbList",
    ...(id ? { "@id": id } : {}),
    itemListElement: items.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.name,
      ...(m.href ? { item: abs(m.href) } : {}),
    })),
  };
}

export function faqLd(faq: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function graph(...nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}

/* Jeu de données des primes LAMal 2027 (comparateur et page « Primes 2027 ») : primes approuvées par l'OFSP,
   relevées sur priminfo.admin.ch, mises en forme par canton dans /data/primes-2027/. Aucune licence n'est
   déclarée : la source et son éditeur sont décrits (isBasedOn, creditText). */
const CANTONS_PRIMES = ["GE", "VD", "VS", "FR", "NE", "JU", "BE"] as const;
const OFSP = {
  fr: { "@type": "GovernmentOrganization", name: "Office fédéral de la santé publique (OFSP)", url: "https://www.bag.admin.ch/fr" },
  en: { "@type": "GovernmentOrganization", name: "Federal Office of Public Health (FOPH)", url: "https://www.bag.admin.ch/en" },
};
export function datasetPrimesLd(locale: "fr" | "en", id: string, dateIso: string) {
  const fr = locale === "fr";
  return {
    "@type": "Dataset",
    "@id": id,
    name: fr ? "Primes LAMal 2027 en Suisse romande" : "2027 LAMal premiums in French-speaking Switzerland",
    description: fr
      ? "Primes mensuelles 2027 de l’assurance obligatoire des soins approuvées par l’OFSP, par canton, région de prime, classe d’âge, franchise, modèle et couverture accident, pour Genève, Vaud, le Valais, Fribourg, Neuchâtel, le Jura et le Jura bernois. Relevées sur priminfo.admin.ch et mises en forme par Guide Assurance."
      : "2027 monthly compulsory health insurance premiums approved by the FOPH, by canton, premium region, age group, deductible, model and accident cover, for Geneva, Vaud, Valais, Fribourg, Neuchâtel, Jura and the Bernese Jura. Retrieved from priminfo.admin.ch and formatted by Guide Assurance.",
    inLanguage: fr ? "fr-CH" : "en",
    temporalCoverage: "2027",
    spatialCoverage: {
      "@type": "Place",
      name: fr ? "Suisse romande (GE, VD, VS, FR, NE, JU, Jura bernois)" : "French-speaking Switzerland (GE, VD, VS, FR, NE, JU, Bernese Jura)",
    },
    dateModified: dateIso,
    isAccessibleForFree: true,
    creator: { "@id": ORG_ID },
    creditText: fr
      ? "Source : OFSP, primes 2027 approuvées (priminfo.admin.ch) et régions de primes 2027"
      : "Source: FOPH, approved 2027 premiums (priminfo.admin.ch) and 2027 premium regions",
    isBasedOn: [
      { "@type": "WebSite", name: "Priminfo", url: "https://www.priminfo.admin.ch/", publisher: OFSP[locale] },
      { "@type": "Dataset", name: fr ? "Primes d’assurance-maladie" : "Health insurance premiums", url: "https://opendata.swiss/fr/dataset/health-insurance-premiums", publisher: OFSP[locale] },
      { "@type": "CreativeWork", name: fr ? "Régions de primes 2027" : "2027 premium regions", url: "https://www.priminfo.admin.ch/downloads/praemienregionen-2027.xlsx", publisher: OFSP[locale] },
    ],
    variableMeasured: fr ? "Prime mensuelle de l’assurance obligatoire des soins (CHF)" : "Monthly compulsory health insurance premium (CHF)",
    distribution: CANTONS_PRIMES.map((c) => ({
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: abs(`/data/primes-2027/${c}.json`),
    })),
  };
}
