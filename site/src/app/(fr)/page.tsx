import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { JsonLd } from "@/components/site/json-ld";
import { PaysageAccueil } from "@/components/site/paysage-accueil";
import { AccueilFeuille, AccueilSituations } from "@/components/site/accueil-feuille";
import { calculerSaison } from "@/components/site/saison";
import { pageMetadata } from "@/lib/metadata";
import { jsonLdAccueil } from "@/lib/jsonld-accueil";
import { ORG_ID, WEBSITE_ID } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { DATE_PAGE } from "@/lib/donnees";
import { COMPTES_3A, RELEVE_LE, TAUX_MAX, TAUX_MIN, dateCh, tauxFr } from "@/lib/taux3a";
import { OUTILS } from "@/lib/nav";

const TITRE = "Comparer les primes maladie 2027 en Suisse romande";
const DESCRIPTION =
  "Les primes maladie 2027 des caisses actives dans votre région de Suisse romande (OFSP). Sans inscription ni publicité, calculées dans votre navigateur.";
const N = "\u202f"; // espace fine insécable avant ; : ? ! »

export const metadata: Metadata = pageMetadata({ title: TITRE, description: DESCRIPTION, path: "/", enPath: "/en/" });

/* Données structurées : entités communes (organisation, éditeur, site) de jsonld-accueil, page web et comparateur
   (même @id que sur la page du comparateur). */
const LD = {
  "@context": "https://schema.org",
  "@graph": [
    ...jsonLdAccueil["@graph"].slice(0, 3),
    {
      "@type": "WebPage",
      "@id": abs("/#webpage"),
      url: abs("/"),
      name: TITRE,
      description: DESCRIPTION,
      inLanguage: "fr-CH",
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORG_ID },
      publisher: { "@id": ORG_ID },
      mainEntity: { "@id": abs(`${OUTILS.comparateur}#outil`) },
      dateModified: DATE_PAGE.accueil,
    },
    {
      "@type": "WebApplication",
      "@id": abs(`${OUTILS.comparateur}#outil`),
      name: "Comparer les primes LAMal 2027",
      url: abs(OUTILS.comparateur),
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      inLanguage: "fr-CH",
      isAccessibleForFree: true,
      provider: { "@id": ORG_ID },
    },
  ],
};

/* Primes moyennes adulte (OFSP, primes publiées le 29.09.2026) et prime standard franchise 300 (calcul Guide Assurance). */
const PRIMES = [
  { canton: "Genève", moy: "610,60", hausse: "+4,3 %", avant: "585,40", g26: 78.6, w: 13.6, std: "771,00", min: "711,20", max: "915,70" },
  { canton: "Neuchâtel", moy: "558,80", hausse: "+5,3 %", avant: "530,80", g26: 49.1, w: 15.1, std: "730,20", min: "675,60", max: "835,00" },
  { canton: "Jura", moy: "551,00", hausse: "+5,9 %", avant: "520,50", g26: 43.5, w: 16.5, std: "703,50", min: "655,80", max: "810,60" },
  { canton: "Vaud", moy: "543,50", hausse: "+3,2 %", avant: "526,60", g26: 46.8, w: 9.1, std: "693,50", min: "614,40", max: "780,80" },
  { canton: "Fribourg", moy: "465,50", hausse: "+5,2 %", avant: "442,60", g26: 1.4, w: 12.4, std: "610,60", min: "551,00", max: "699,70" },
  { canton: "Valais", moy: "460,90", hausse: "+5,7 %", avant: "436,10", g26: -2.1, w: 13.4, std: "584,60", min: "494,50", max: "652,90" },
];

/* Guides publiés (content/fr) : la liste complète est sur /guides/. */
const GUIDES = [
  { titre: "Assurance maladie (LAMal) 2027 : franchises, modèles, changement de caisse", href: "/assurance-maladie/", pour: "Ménages", lecture: "5 min" },
  { titre: "Primes LAMal 2027 en Suisse romande, canton par canton", href: "/assurance-maladie/primes/", pour: "Ménages", lecture: "4 min" },
  { titre: "Frontaliers : LAMal ou assurance française, le droit d’option", href: "/frontaliers/", pour: "Frontaliers", lecture: "4 min" },
  { titre: "S’installer en Suisse : les assurances des premiers mois", href: "/nouveaux-arrivants/", pour: "Nouveaux arrivants", lecture: "4 min" },
  { titre: "3e pilier 2027 : plafonds, déductions et assurance décès", href: "/3e-pilier/", pour: "Prévoyance", lecture: "4 min" },
  { titre: "LPP pour les PME : seuils 2027 et choix d’une fondation", href: "/entreprises/lpp/", pour: "Entreprises", lecture: "3 min" },
];

/* Outils, dans l'ordre de l'accueil. Le premier chiffre de chaque ligne vient de l'outil lui-même (profil indiqué). */
type OutilLigne = { href: string; chiffre: string; legende: string; titre: string; texte: string; cta: string };
const OUTILS_LISTE: OutilLigne[] = [
  {
    href: OUTILS.comparateur,
    chiffre: "611,70 à 915,70",
    legende: "CHF par mois · 106 offres pour un adulte à Genève, franchise 300, primes 2027",
    titre: "Comparer les primes LAMal 2027",
    texte: "La loi fixe les prestations de base, identiques d’une caisse à l’autre. La liste donne les offres de votre région triées par prime, pour votre âge, votre franchise et votre modèle.",
    cta: "Voir les primes",
  },
  {
    href: OUTILS.simulateur,
    chiffre: "6 452 à 26 857",
    legende: "CHF par an · exemple d’un foyer de quatre, primes LAMal 2027",
    titre: `Frontalier${N}: LAMal ou assurance française${N}?`,
    texte: "Ce foyer paie l’un ou l’autre de ces montants selon l’assureur choisi. Le simulateur les met en regard de la cotisation Urssaf due pour votre revenu.",
    cta: "Simuler mon foyer",
  },
  {
    href: OUTILS.lettre,
    chiffre: "30 novembre",
    legende: "date de réception pour changer de caisse au 1er janvier",
    titre: "Lettre de résiliation",
    texte: "L’outil calcule la date limite d’après la loi et votre contrat, puis prépare une lettre à imprimer ou à copier.",
    cta: "Préparer ma lettre",
  },
];
/* TODO(3a) : outils du 3e pilier en préparation. Ajouter ici les lignes (même forme qu'OUTILS_LISTE) quand Sam
   donne les adresses publiées. Rien ne s'affiche tant que la liste est vide : aucun lien vers une page absente. */
const OUTILS_3A: OutilLigne[] = [
  {
    href: "/3e-pilier/taux-3a/",
    chiffre: `${TAUX_MIN.toFixed(2).replace(".", ",")} à ${tauxFr(TAUX_MAX)}`,
    legende: `taux des comptes 3a de ${COMPTES_3A.length} banques, relevés le ${dateCh(RELEVE_LE)}`,
    titre: "Taux des comptes 3a",
    texte: "Nous relevons le taux de chaque banque sur sa propre page, avec ses conditions. La liste va du taux le plus élevé au plus bas, et aucune banque ne paie pour y figurer.",
    cta: "Voir les taux",
  },
  {
    href: "/3e-pilier/economie-impot/",
    chiffre: "7\u202f373 CHF",
    legende: "versement 3a maximal en 2027 avec caisse de pension (OFAS)",
    titre: "Économie d’impôt 3a en Suisse romande",
    texte: "Le calcul estime la baisse d’impôt fédéral, cantonal et communal que produit un versement 3a, selon votre commune, votre revenu et votre famille.",
    cta: "Calculer",
  },
];

const Fleche = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export default function Accueil() {
  return (
    <>
      <JsonLd data={LD} />
      <SiteHeader />
      <main className="accueil">
        <AccueilFeuille saisonInitiale={calculerSaison(new Date())} cartes={<PaysageAccueil />} />
        <AccueilSituations />

        <section className="passage" id="passage" aria-labelledby="passage-titre">
          <div className="wrap grille">
            <div>
              <h2 className="titre" id="passage-titre">Jusqu’à quand changer de caisse maladie pour 2027{N}?</h2>
              <p className="texte">
                Votre caisse doit recevoir votre lettre de résiliation au plus tard le 30 novembre 2026 pour un changement au 1er janvier 2027 (art. 7 LAMal). Pour l’assurance de base, la nouvelle caisse doit vous accepter, quel que soit votre état de santé.
              </p>
              <p className="texte">
                Une complémentaire (LCA) se résilie autrement. Comme le nouvel assureur peut vous refuser en raison de votre santé, mieux vaut attendre son acceptation écrite avant de résilier. La loi permet de résilier pour la fin de la troisième année du contrat, puis de chaque année, avec trois mois de préavis (art. 35a LCA).
              </p>
              <p className="texte">
                Notre <a href={OUTILS.lettre}>modèle de lettre de résiliation</a> calcule la date limite applicable à votre contrat, sans que vos données quittent votre appareil.
              </p>
              <div className="echeances">
                <div className="echeance alerte">
                  <div className="date">30.11<span className="an">.2026</span></div>
                  <div className="quoi">Assurance de base (LAMal){N}: lettre reçue ce jour-là au plus tard</div>
                </div>
                <div className="echeance alerte">
                  <div className="date">30.09<span className="an">.2027</span></div>
                  <div className="quoi">Complémentaires (LCA){N}: échéance fréquente, à vérifier dans votre contrat</div>
                </div>
              </div>
            </div>
            <figure className="extrait document">
              <p className="source">Exemple de clause rédigé d’après des formulations courantes, sans reprendre un contrat précis</p>
              <p className="clause">
                <b>Résiliation.</b> Le preneur d’assurance peut résilier le contrat pour la fin d’une année civile, <mark>moyennant un préavis de trois mois</mark>. Toute nouvelle proposition d’assurance peut être soumise à un examen de l’état de santé.
              </p>
              <figcaption className="note">
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="i-fond" cx="12" cy="12" r="10.5" strokeWidth="1.8" />
                  <path className="i-trait" d="M12 10.5v6" strokeWidth="2.2" strokeLinecap="round" />
                  <circle className="i-point" cx="12" cy="7.3" r="1.4" />
                </svg>
                <span>
                  <b>Ce que ça veut dire</b>Votre lettre doit arriver au plus tard le 30 septembre. Le nouvel assureur pouvant vous refuser en raison de votre état de santé, mieux vaut attendre sa confirmation écrite avant de l’envoyer.
                </span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="outils" id="outils" aria-labelledby="outils-titre">
          <div className="wrap">
            <h2 className="titre" id="outils-titre">Quels outils utiliser avant de changer d’assurance{N}?</h2>
            <p className="texte">Les outils ci-dessous sont gratuits et sans inscription. Le calcul se fait sur votre appareil et vos chiffres ne nous parviennent pas.</p>
            <ol className="outils-liste">
              {[...OUTILS_LISTE, ...OUTILS_3A].map((o) => (
                <li key={o.href}>
                  <a className="outil-ligne" href={o.href}>
                    <span className="outil-chiffre">
                      {o.chiffre}
                      <small>{o.legende}</small>
                    </span>
                    <span className="outil-texte">
                      <b>{o.titre}</b>
                      {o.texte}
                    </span>
                    <span className="outil-cta">
                      {o.cta}
                      <Fleche />
                    </span>
                  </a>
                </li>
              ))}
              <li className="bientot-ligne">
                <b>Quelle franchise choisir{N}?</b> Un outil en préparation indiquera le montant de frais à partir duquel la franchise basse devient rentable.
              </li>
            </ol>
          </div>
        </section>

        <section className="primes" id="primes" aria-labelledby="primes-titre">
          <div className="wrap">
            <h2 className="titre" id="primes-titre">Combien coûte l’assurance de base en 2027 en Suisse romande ?</h2>
            <p className="texte">
              En 2027, la prime moyenne d’un adulte va de 460,90 francs par mois en Valais à 610,60 francs à Genève. La moyenne suisse est de 487,60 francs, en hausse de 4,9 % (OFSP, primes publiées le 29.09.2026).
            </p>
            <p className="texte">
              Selon les calculs de Guide Assurance sur les tableaux de l’OFSP, la prime standard d’un adulte varie de 24 à 32 % entre la prime la plus basse et la plus haute d’un même canton (franchise de 300 francs, avec accident, toutes régions de primes du canton). Le choix de l’assureur compte presque autant que le canton.
            </p>
            <div className="grille">
              <div>
                <figure className="graphe" style={{ "--ch": "25.7%" } as React.CSSProperties}>
                  <ul className="g-liste">
                    {PRIMES.map((p) => (
                      <li className="g-row" key={p.canton}>
                        <span className="g-nom">{p.canton}</span>
                        <span className="g-piste" aria-hidden="true">
                          <i className="g-seg" style={{ left: `${p.g26}%`, width: `${p.w}%` }} />
                          <i className="g-26" style={{ left: `${p.g26}%` }} />
                          <i className="g-27" style={{ left: `${(p.g26 + p.w).toFixed(1)}%` }} />
                        </span>
                        <span className="g-val">
                          {p.moy} <em>{p.hausse}</em>
                          <span className="sr"> (2026 : {p.avant})</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <figcaption className="g-leg">
                    <span className="g-k" />
                    2026 <span className="g-k g-k27" />
                    2027 <span className="g-kch" />
                    moyenne suisse 2027 (487,60). Prime moyenne adulte, francs par mois.
                  </figcaption>
                </figure>
              <p className="primes-lien">
                <a className="bouton second" href={OUTILS.comparateur}>
                  Voir les primes de votre commune
                  <Fleche />
                </a>
              </p>
              </div>
              <table>
                <caption>Primes mensuelles de l’assurance de base, adulte, en francs (OFSP, primes 2027)</caption>
                <thead>
                  <tr>
                    <th scope="col">Canton</th>
                    <th scope="col" className="num">Moyenne 2027</th>
                    <th scope="col" className="num">Hausse</th>
                    <th scope="col" className="num">Standard, franchise 300</th>
                  </tr>
                </thead>
                <tbody>
                  {PRIMES.map((p) => (
                    <tr key={p.canton}>
                      <th scope="row">{p.canton}</th>
                      <td className="num">{p.moy}</td>
                      <td className="num">{p.hausse}</td>
                      <td className="num">
                        {p.std}
                        <span className="fourchette">
                          {p.min} à {p.max}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="note-donnees">
              La moyenne inclut toutes les franchises et tous les modèles, d’où son niveau plus bas ; c’est une estimation de l’OFSP. La colonne «{N}Standard{N}» donne la médiane des assureurs du canton (modèle standard, avec accident), puis la plus basse et la plus haute ; Guide Assurance l’a calculée sur les tableaux de primes de l’OFSP du 22.10.2026, arrondis à 10 centimes. Le détail par assureur figure dans notre outil de comparaison et sur priminfo.admin.ch.
            </p>
          </div>
        </section>

        <section className="itineraires" id="itineraires" aria-labelledby="itin-titre">
          <div className="wrap">
            <h2 className="titre" id="itin-titre">Où trouver les règles pour votre situation{N}?</h2>
            <p className="texte">Les guides ci-dessous les exposent situation par situation. Chacun indique sa date de mise à jour et ses sources, et nous le revoyons quand les primes ou la loi changent.</p>
            <table>
              <thead>
                <tr>
                  <th scope="col">Guide</th>
                  <th scope="col">Pour qui</th>
                  <th scope="col" className="num">Lecture</th>
                </tr>
              </thead>
              <tbody>
                {GUIDES.map((g) => (
                  <tr key={g.href}>
                    <td>
                      <a href={g.href}>{g.titre}</a>
                    </td>
                    <td className="pour">{g.pour}</td>
                    <td className="num">{g.lecture}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <SiteFooter note="Primes : OFSP." />
    </>
  );
}
