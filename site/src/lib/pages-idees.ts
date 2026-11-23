/* Pages ajoutées le 23.11.2026 (rapport research/08, section B, idées 1, 4, 7 et 8) : adresses FR et EN, date du texte.
   Une seule liste, lue par le sitemap, les images de partage, llms.txt et la correspondance des langues. */
import { ANNEE_BAROMETRE, CANTONS_BAROMETRE, DATE_BAROMETRE, slugCanton } from "@/lib/barometre";

export const MAJ_IDEES = "2026-11-23";

export const ROUTES_IDEES = {
  rappels: { fr: "/rappels-echeances/", en: "/en/renewal-reminders/" },
  barometre: { fr: "/assurance-maladie/barometre-primes/", en: "/en/health-insurance/premium-barometer/" },
  integrer: { fr: "/integrer/", en: "/en/embed/" },
  kitRh: { fr: "/entreprises/kit-rh/", en: "/en/business/hr-kit/" },
} as const;

export const cheminBarometre = (canton: string, locale: "fr" | "en") =>
  `${ROUTES_IDEES.barometre[locale]}${slugCanton(canton, locale)}/`;

export type PageIdee = { fr: string; en: string; lastmod: string; titreFr: string; titreEn: string; rubriqueFr: string; rubriqueEn: string };

export function pagesIdees(): PageIdee[] {
  const outil = { rubriqueFr: "Outil gratuit", rubriqueEn: "Free tool" };
  return [
    { ...ROUTES_IDEES.rappels, lastmod: MAJ_IDEES, titreFr: "Vos échéances d’assurance dans votre agenda", titreEn: "Your insurance deadlines in your calendar", ...outil },
    {
      ...ROUTES_IDEES.barometre,
      lastmod: DATE_BAROMETRE,
      titreFr: `Baromètre des primes maladie ${ANNEE_BAROMETRE} en Suisse romande`,
      titreEn: `${ANNEE_BAROMETRE} health premium barometer, French-speaking Switzerland`,
      rubriqueFr: "Santé",
      rubriqueEn: "Health",
    },
    ...CANTONS_BAROMETRE.map((c) => ({
      fr: cheminBarometre(c.code, "fr"),
      en: cheminBarometre(c.code, "en"),
      lastmod: DATE_BAROMETRE,
      titreFr: `Primes maladie ${ANNEE_BAROMETRE} ${c.deFr} : le baromètre`,
      titreEn: `${ANNEE_BAROMETRE} health premiums in ${c.en}: the barometer`,
      rubriqueFr: "Baromètre des primes",
      rubriqueEn: "Premium barometer",
    })),
    { ...ROUTES_IDEES.integrer, lastmod: MAJ_IDEES, titreFr: "Nos chiffres à intégrer sur votre site", titreEn: "Our figures, ready to embed on your site", rubriqueFr: "Widgets", rubriqueEn: "Widgets" },
    { ...ROUTES_IDEES.kitRh, lastmod: MAJ_IDEES, titreFr: "Kit RH : frontaliers et nouveaux arrivants", titreEn: "HR kit: cross-border workers and newcomers", rubriqueFr: "Entreprises", rubriqueEn: "Business" },
  ];
}
