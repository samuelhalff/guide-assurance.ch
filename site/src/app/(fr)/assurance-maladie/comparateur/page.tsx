import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { BandeConfiance } from "@/components/site/bande-confiance";
import { PartagerOutil } from "@/components/site/partager-outil";
import { ComparateurPrimes } from "@/components/outils/comparateur-primes";
import { TableauReperes } from "@/components/outils/reperes-primes";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, datasetPrimesLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { DATE_PAGE, DATE_PRIMES } from "@/lib/donnees";
import { dateLongue } from "@/lib/i18n";
import { OUTILS, OUTILS_EN } from "@/lib/nav";

const PATH = OUTILS.comparateur;
const URL_ = abs(PATH);
const TITRE = "Comparer les primes LAMal 2027 en Suisse romande";
const DESCRIPTION =
  "Primes LAMal 2027 des offres de votre région selon votre NPA, âge, franchise et modèle, triées de la plus basse à la plus haute. Données OFSP.";
const N = " ";

const FAQ = [
  {
    q: `Les prestations varient-elles d’un assureur à l’autre${N}?`,
    a: "Non. L’assurance de base rembourse les mêmes prestations quel que soit l’assureur, car la liste est fixée par la loi (LAMal) et ses ordonnances. Les assureurs se distinguent par la prime, les règles de leurs modèles et leur service.",
  },
  {
    q: `Pourquoi la prime dépend-elle de mon NPA${N}?`,
    a: "Les primes sont fixées par canton et, dans certains cantons, par région de prime. Vaud, le Valais et Fribourg en ont plusieurs ; Genève, Neuchâtel et le Jura une seule. Pour le canton de Berne, seul le Jura bernois est couvert ici. La commune de domicile fait foi. Lorsqu’un NPA couvre plusieurs régions, l’outil vous demande de choisir la vôtre.",
  },
  {
    q: `Que veulent dire les modèles PRAXIS, TEL_DIG, PHARM et FLEX${N}?`,
    a: "Ce sont les catégories de modèles que l’OFSP utilise dès 2027. Avec PRAXIS, le premier contact est un cabinet désigné (médecin de famille ou centre HMO). Avec TEL_DIG, vous passez d’abord par un appel ou une application, et avec PHARM, par une pharmacie partenaire. FLEX laisse le choix entre plusieurs premiers contacts. Le modèle standard garde le libre choix du médecin.",
  },
  {
    q: `Jusqu’à quand changer d’assureur pour 2027${N}?`,
    a: "Votre lettre de résiliation doit être reçue par l’assureur au plus tard le lundi 30 novembre 2026 pour un changement au 1er janvier 2027 (art. 7, al. 2, LAMal). Le nouvel assureur doit vous accepter, quel que soit votre état de santé.",
  },
  {
    q: `D’où viennent les primes affichées${N}?`,
    a: `Elles proviennent des primes 2027 approuvées par l’Office fédéral de la santé publique (OFSP), publiées sur priminfo.admin.ch et relevées le ${dateLongue(DATE_PRIMES, "fr")}, ainsi que du fichier des régions de primes 2027 de l’OFSP. Les montants sont mensuels, en francs, avant la redistribution des taxes environnementales.`,
  },
];

export const metadata: Metadata = pageMetadata({ title: TITRE, description: DESCRIPTION, path: PATH, enPath: OUTILS_EN.comparateur });

const MIETTES: Miette[] = [
  { name: "Accueil", href: "/" },
  { name: "Assurance maladie", href: "/assurance-maladie/" },
  { name: "Comparer les primes 2027" },
];

const LD = graph(
  {
    "@type": "WebPage",
    "@id": `${URL_}#webpage`,
    url: URL_,
    name: TITRE,
    description: DESCRIPTION,
    inLanguage: "fr-CH",
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORG_ID },
    datePublished: "2026-11-22",
    dateModified: DATE_PAGE.comparateur,
    breadcrumb: { "@id": `${URL_}#breadcrumb` },
    mainEntity: { "@id": `${URL_}#outil` },
    mentions: { "@id": `${URL_}#donnees` },
    citation: [
      "https://www.priminfo.admin.ch/fr/praemien",
      "https://www.priminfo.admin.ch/downloads/praemienregionen-2027.xlsx",
      "https://www.bag.admin.ch/fr/assurance-maladie-assurances-impliquant-un-choix-limite-des-fournisseurs-de-prestations",
      "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_7",
    ],
  },
  {
    "@type": "WebApplication",
    "@id": `${URL_}#outil`,
    name: "Comparer les primes LAMal 2027",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    inLanguage: "fr-CH",
    isAccessibleForFree: true,
    provider: { "@id": ORG_ID },
  },
  breadcrumbLd(MIETTES, `${URL_}#breadcrumb`),
  { ...faqLd(FAQ), "@id": `${URL_}#faq` },
  datasetPrimesLd("fr", `${URL_}#donnees`, DATE_PRIMES),
);

export default function Page() {
  return (
    <div className="page-outil">
      <JsonLd data={LD} />
      <SiteHeader current="sante" altPath={OUTILS_EN.comparateur} />
      <main>
        <div className="wrap">
          <Breadcrumbs items={MIETTES} />
          <h1>Comparer les primes de l’assurance maladie 2027</h1>
          <p className="intro">
            À partir de votre NPA, de votre année de naissance et de votre franchise, l’outil affiche les primes 2027 des offres de votre région, triées de la plus basse à la plus haute. Les prestations de base étant identiques d’un assureur à l’autre, c’est à vous d’apprécier ce que vaut l’écart de prime.
          </p>
          <p className="prive">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 9V6a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <rect x="3" y="9" width="14" height="10" rx="1.5" fill="currentColor" />
            </svg>
            Le calcul se fait dans votre navigateur. Nous ne recevons ni votre NPA ni votre âge.
          </p>
          <BandeConfiance signaux={["ofsp", "offres", "gratuit"]} compacte />
          <PartagerOutil path={PATH} title="Comparer les primes LAMal 2027" text="Les primes LAMal 2027 pour votre NPA, votre âge et votre franchise, triées de la plus basse à la plus haute." />
          <ComparateurPrimes donneesDu={DATE_PRIMES} />
          <TableauReperes locale="fr" replie />
        </div>

        <div className="wrap faq">
          {FAQ.map((f) => (
            <section key={f.q}>
              <h2>{f.q}</h2>
              <p>{f.a}</p>
            </section>
          ))}
          <p className="maj">Mis à jour le {dateLongue(DATE_PAGE.comparateur, "fr")}. Données : OFSP, primes 2027 et régions de primes 2027.</p>
        </div>
      </main>
      <SiteFooter note="Primes données à titre d’information. La prime de votre police fait foi." altPath={OUTILS_EN.comparateur} />
    </div>
  );
}
