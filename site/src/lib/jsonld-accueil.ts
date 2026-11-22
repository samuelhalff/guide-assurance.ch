/* Données structurées de l'accueil, reprises de mockups/v2/index.html (entités communes : organisation, éditeur, site). */
export const jsonLdAccueil = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://guide-assurance.ch/#organization",
      "name": "Guide Assurance",
      "alternateName": "guide-assurance.ch",
      "url": "https://guide-assurance.ch/",
      "logo": {
        "@type": "ImageObject",
        "@id": "https://guide-assurance.ch/#logo",
        "url": "https://guide-assurance.ch/logo-512.png",
        "width": 512,
        "height": 512
      },
      "description": "Guide Assurance explique les assurances en Suisse romande, à partir des données officielles.",
      "parentOrganization": {
        "@id": "https://guide-assurance.ch/#west-bay-sa"
      },
      "publishingPrinciples": "https://guide-assurance.ch/methodologie/",
      "correctionsPolicy": "https://guide-assurance.ch/methodologie/#corrections",
      "ownershipFundingInfo": "https://guide-assurance.ch/independance/",
      "knowsLanguage": [
        "fr",
        "en"
      ],
      "areaServed": {
        "@type": "Country",
        "name": "Suisse"
      }
    },
    {
      "@type": "Organization",
      "@id": "https://guide-assurance.ch/#west-bay-sa",
      "name": "West Bay SA",
      "legalName": "West Bay SA",
      "identifier": {
        "@type": "PropertyValue",
        "propertyID": "CHE-UID",
        "value": "CHE-107.892.984"
      },
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Genthod",
        "addressRegion": "GE",
        "addressCountry": "CH"
      },
      "sameAs": [
        "https://www.zefix.ch/fr/search/entity/list/firm/3858"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://guide-assurance.ch/#website",
      "url": "https://guide-assurance.ch/",
      "name": "Guide Assurance",
      "inLanguage": [
        "fr-CH",
        "en"
      ],
      "publisher": {
        "@id": "https://guide-assurance.ch/#organization"
      }
    },
    {
      "@type": "WebPage",
      "@id": "https://guide-assurance.ch/#webpage",
      "url": "https://guide-assurance.ch/",
      "name": "Assurances en Suisse romande : guides 2027 | Guide Assurance",
      "description": "Des guides datés et des outils gratuits, fondés sur les données officielles, sur l’assurance maladie, les frontaliers, les nouveaux arrivants et le 3e pilier.",
      "inLanguage": "fr-CH",
      "isPartOf": {
        "@id": "https://guide-assurance.ch/#website"
      },
      "about": {
        "@id": "https://guide-assurance.ch/#organization"
      },
      "publisher": {
        "@id": "https://guide-assurance.ch/#organization"
      },
      "dateModified": "2026-11-22"
    }
  ]
} as const;

/* Accueil anglais (/en/) : mêmes entités communes, page web en anglais. */
export const jsonLdAccueilEn = {
  "@context": "https://schema.org",
  "@graph": [
    ...jsonLdAccueil["@graph"].slice(0, 3),
    {
      "@type": "WebPage",
      "@id": "https://guide-assurance.ch/en/#webpage",
      "url": "https://guide-assurance.ch/en/",
      "name": "Swiss insurance guides 2027 | Guide Assurance",
      "description": "Dated guides and free tools, built on official data, on health insurance, cross-border work, moving to Switzerland and pillar 3a.",
      "inLanguage": "en",
      "isPartOf": { "@id": "https://guide-assurance.ch/#website" },
      "about": { "@id": "https://guide-assurance.ch/#organization" },
      "publisher": { "@id": "https://guide-assurance.ch/#organization" },
      "dateModified": "2026-11-22"
    }
  ]
} as const;
