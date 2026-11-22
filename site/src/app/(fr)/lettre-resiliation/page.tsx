import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { PartagerOutil } from "@/components/site/partager-outil";
import { LettreResiliation } from "@/components/outils/lettre-resiliation";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { FaqSections, faqOutilLd, type FaqOutil } from "@/components/site/faq-sections";
import { MAJ_ISO, abs } from "@/lib/site";
import { OUTILS } from "@/lib/nav";

const PATH = OUTILS.lettre;
const URL_ = abs(PATH);
const TITRE = "Lettre de résiliation assurance maladie : modèle 2026";
const DESCRIPTION =
  "Lettre de résiliation LAMal ou complémentaire rédigée dans votre navigateur, avec la date limite calculée selon la loi. Rien ne quitte votre appareil.";

export const metadata: Metadata = pageMetadata({ title: TITRE, description: DESCRIPTION, path: PATH });

const MIETTES: Miette[] = [
  { name: "Accueil", href: "/" },
  { name: "Santé", href: "/assurance-maladie/" },
  { name: "Lettre de résiliation" },
];

/* Questions affichées sous l'outil, reprises telles quelles dans le JSON-LD (FAQPage). */
const FAQ: FaqOutil[] = [
  {
    q: "Jusqu’à quand résilier l’assurance de base pour 2027 ?",
    a: ["Votre lettre doit être reçue par l’assureur au plus tard le 30 novembre 2026 pour changer d’assureur au 1er janvier 2027. Ce délai d’un mois s’applique après l’annonce des nouvelles primes (art. 7, al. 2, LAMal).", "Avec la franchise de 300 francs et le libre choix du médecin, un changement au 30 juin est aussi possible, avec une lettre reçue le 31 mars (art. 7, al. 1, LAMal). Avec une autre franchise ou un modèle médecin de famille, HMO ou Telmed, le changement n’est possible qu’en fin d’année (art. 94 et 100 OAMal)."],
  },
  {
    q: "Quand peut-on résilier une assurance complémentaire ?",
    a: ["Une complémentaire se résilie pour la fin de la troisième année du contrat, puis pour la fin de chaque année, avec trois mois de préavis (art. 35a LCA). Pour un contrat qui suit l’année civile, la lettre doit donc arriver le 30 septembre.", "Vos conditions générales peuvent prévoir une résiliation plus tôt, par exemple après une hausse de prime. Elles ne peuvent pas être moins favorables que la loi."],
  },
  {
    q: "Faut-il envoyer la lettre en recommandé ?",
    a: ["Non, la loi ne l’exige pas. Le recommandé permet cependant de prouver la date de réception, la seule qui compte. Pour une complémentaire, la loi demande un écrit ou un autre moyen qui laisse une trace écrite (art. 35a LCA)."],
  },
  {
    q: "Que se passe-t-il si je n’ai pas encore de nouvel assureur ?",
    a: ["Pour l’assurance de base, vous restez assuré chez l’ancien assureur jusqu’à ce que le nouveau lui confirme votre affiliation, sans interruption de couverture (art. 7, al. 5, LAMal). Une complémentaire n’offre pas cette protection : mieux vaut attendre d’être accepté ailleurs avant de la résilier."],
  },
  {
    q: "Peut-on changer d’assureur avec des primes impayées ?",
    a: ["Non. Tant que les primes, participations aux coûts, intérêts et frais de poursuite ne sont pas payés en entier, l’assuré ne peut pas changer d’assureur de base (art. 64a, al. 6, LAMal). Des arriérés qui ne concernent que vos enfants ne vous en empêchent pas."],
    src: <>Textes : <a href="https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_7">art. 7 LAMal</a>, <a href="https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_64a">art. 64a LAMal</a>, <a href="https://www.fedlex.admin.ch/eli/cc/1995/3867_3867_3867/fr#art_94">art. 94</a> et <a href="https://www.fedlex.admin.ch/eli/cc/1995/3867_3867_3867/fr#art_100">100 OAMal</a>, <a href="https://www.fedlex.admin.ch/eli/cc/24/719_735_717/fr#art_35a">art. 35a LCA</a>.</>,
  },
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
    dateModified: MAJ_ISO,
    breadcrumb: { "@id": `${URL_}#breadcrumb` },
    mainEntity: { "@id": `${URL_}#outil` },
    citation: [
      "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_7",
      "https://www.fedlex.admin.ch/eli/cc/24/719_735_717/fr#art_35a",
      "https://www.fedlex.admin.ch/eli/cc/1995/3867_3867_3867/fr#art_94",
      "https://www.fedlex.admin.ch/eli/cc/1995/3867_3867_3867/fr#art_100",
      "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_64a",
    ],
  },
  {
    "@type": "WebApplication",
    "@id": `${URL_}#outil`,
    name: "Lettre de résiliation d’assurance maladie",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    inLanguage: "fr-CH",
    isAccessibleForFree: true,
    provider: { "@id": ORG_ID },
  },
  breadcrumbLd(MIETTES, `${URL_}#breadcrumb`),
  { ...faqLd(faqOutilLd(FAQ)), "@id": `${URL_}#faq` },
);

export default function Page() {
  return (
    <div className="page-outil page-lettre">
      <JsonLd data={LD} />
      <SiteHeader current="sante" altPath="/en/cancellation-letter/" />
      <main>
        <div className="wrap">
          <Breadcrumbs items={MIETTES} />
          <h1>Votre lettre de résiliation d’assurance maladie</h1>
          <p className="intro">
            Pour l’assurance de base comme pour une complémentaire, la lettre se rédige au fur et à mesure que vous remplissez les champs, avec la date limite calculée selon la loi.
          </p>
          <p className="prive">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 9V6a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <rect x="3" y="9" width="14" height="10" rx="1.5" fill="currentColor" />
            </svg>
            Ce que vous tapez reste sur votre appareil. La lettre est créée dans votre navigateur ; nous ne recevons ni ne gardons rien.
          </p>
          <PartagerOutil path={PATH} title="Lettre de résiliation d’assurance maladie" text="Préparer sa lettre de résiliation LAMal ou complémentaire, avec la date limite calculée selon la loi." />
          <LettreResiliation aujourdhuiIso={new Date().toISOString().slice(0, 10)} />
        </div>

        <div className="wrap faq">
          <p className="maj">Mis à jour le 22 novembre 2026. Sources : Fedlex (LAMal, OAMal, LCA).</p>
          <FaqSections faq={FAQ} />
        </div>
      </main>
      <SiteFooter note="Cet outil donne une information générale ; votre contrat fait foi." altPath="/en/cancellation-letter/" />
    </div>
  );
}
