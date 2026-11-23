import { Assureurs3aListe } from "@/components/outils/assureurs-3a-liste";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { PartagerOutil } from "@/components/site/partager-outil";
import { CtaDemande } from "@/components/demande/cta-demande";
import { BarreDemande } from "@/components/demande/barre-demande";
import { FaqSections, faqOutilLd, type FaqOutil } from "@/components/site/faq-sections";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { DATE_PAGE } from "@/lib/donnees";
import { dateLongue, type Locale } from "@/lib/i18n";
import { OUTILS, OUTILS_EN } from "@/lib/nav";
import * as I from "@/lib/engines/impot3a";
import D from "@/data/assureurs-3a-3b.json";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/* Page « 3a et 3b auprès d'un assureur » (FR /3e-pilier/assurance-3a-3b/, EN /en/pillar-3a/insurance-3a-3b/).
   Faits relevés le 23.11.2026 dans les documents publics des assureurs (src/data/assureurs-3a-3b.json) et dans le droit
   fédéral. Cadre (docs/decisions.md §0 bis) : ordre alphabétique, aucun classement, aucune recommandation. */

type TypeContrat = "risque" | "mixte" | "fonds" | "hybride" | "nc";
type Produit = { nom: string; pilier: string; type: string; primes_fr: string; rachat_fr: string; primes_en?: string; rachat_en?: string; liberation_primes: boolean | null; url: string };
type Assureur = { id: string; nom: string; entite: string; lu_le: string; produits: Produit[] };

const T = " ";
const LU_LE: string = D.lu_le;
export const ASSUREURS_3A: Assureur[] = [...(D.assureurs as Assureur[])].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
const NB = ASSUREURS_3A.length;
const NB_PRODUITS = ASSUREURS_3A.reduce((s, a) => s + a.produits.length, 0);
const TYPES: TypeContrat[] = ["risque", "mixte", "hybride", "fonds", "nc"];
const P26 = I.PLAFONDS["2026"];
const P27 = I.PLAFONDS["2027"];
const nf = { fr: (x: number) => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, T), en: (x: number) => new Intl.NumberFormat("en-GB").format(x) };
const dch = (iso: string) => iso.split("-").reverse().join(".");

const SRC = {
  opp3: "https://www.fedlex.admin.ch/eli/cc/1985/1778_1778_1778/fr",
  opp3a1: "https://www.fedlex.admin.ch/eli/cc/1985/1778_1778_1778/fr#art_1",
  opp3a3: "https://www.fedlex.admin.ch/eli/cc/1985/1778_1778_1778/fr#art_3",
  opp3a3a: "https://www.fedlex.admin.ch/eli/cc/1985/1778_1778_1778/fr#art_3a",
  opp3a7a: "https://www.fedlex.admin.ch/eli/cc/1985/1778_1778_1778/fr#art_7a",
  lca90: "https://www.fedlex.admin.ch/eli/cc/24/719_735_717/fr#art_90",
  lca91: "https://www.fedlex.admin.ch/eli/cc/24/719_735_717/fr#art_91",
  finma: "https://www.finma.ch/fr/~/media/finma/dokumente/dokumentencenter/myfinma/rundschreiben/finma-rs-2024-02-20240626_de.pdf?sc_lang=fr&hash=5153E3B59FD7DDEE92E46F99546E2B6D",
  finmaNews: "https://www.finma.ch/fr/news/2023/08/20230823-mm-bsp-rng-lebensver/",
  cf: "https://www.bsv.admin.ch/dam/fr/sd-web/sp8RwoLu37qQ/br-analyse-flexibilisierung-saeule-3a.pdf",
  afc18a: "https://www.estv.admin.ch/dam/fr/sd-web/yQgKmvu80LEr/dbst-ks-2025-1-018a-dv-fr.pdf",
  lifd: "https://www.fedlex.admin.ch/eli/cc/1991/1184_1184_1184/fr#art_20",
  ofas: "https://www.bsv.admin.ch/fr/le-troisieme-pilier",
  rachatFaq: "https://faq.bsv.admin.ch/fr/prevoyance-professionnelle-et-3e-pilier/rachats-dans-le-pilier-3a/partir-de-quand-un-rachat-est-il",
};

const TXT = {
  fr: {
    path: OUTILS.assurance3a,
    alt: OUTILS_EN.assurance3a,
    titre: `3a et 3b auprès d’un assureur${T}: ${NB} assureurs vie`,
    description: `Les contrats 3a et 3b de ${NB} assureurs vie (risque pur, épargne garantie, fonds), leurs primes et leurs règles de rachat d’après leurs documents, et ce qui les distingue d’un 3a bancaire.`,
    h1: "Le 3e pilier auprès d’un assureur",
    intro: `${NB} assureurs vie proposent des contrats de prévoyance liée (3a) ou libre (3b) en Suisse romande. Nous avons relevé ${NB_PRODUITS} contrats sur leurs pages et fiches produits le ${dch(LU_LE)} : le type de contrat, la souplesse des primes et ce que disent leurs documents du rachat. Les assureurs sont listés par ordre alphabétique, sans classement.`,
    miettes: [{ name: "Accueil", href: "/" }, { name: "3e pilier", href: "/3e-pilier/" }, { name: "3a et 3b auprès d’un assureur" }] as Miette[],
    partage: "Les contrats 3a et 3b des assureurs vie, leurs primes et leurs règles de rachat, avec les différences par rapport à un 3a bancaire.",
    types: { risque: "Risque pur", mixte: "Épargne garantie", hybride: "Hybride", fonds: "Liée à des fonds", nc: "Type non précisé" } as Record<TypeContrat, string>,
    typesDef: [
      ["Risque pur", "Un capital ou une rente en cas de décès, parfois d’incapacité de gain. Aucune épargne n’est constituée : si rien n’arrive, rien n’est versé à l’échéance."],
      ["Épargne garantie (assurance mixte)", "Une épargne avec un capital garanti à l’échéance et une couverture en cas de décès. Le Conseil fédéral relève que la police traditionnelle garantit un capital à un taux fixé à la signature."],
      ["Liée à des fonds", "L’épargne est placée en fonds. La valeur à l’échéance suit les marchés et n’est pas garantie, sauf option de garantie prévue au contrat."],
      ["Hybride", "Une part garantie et une part placée en fonds, dans des proportions fixées ou modifiables selon le contrat."],
    ] as [string, string][],
    typesTitre: `Quels types de contrats les assureurs proposent-ils${T}?`,
    tableauTitre: `Qui propose quoi en 3a et en 3b${T}?`,
    tableauTexte: `Pour chaque assureur, les types de contrats trouvés sur ses pages le ${dch(LU_LE)}. Un type absent signifie que nous ne l’avons pas trouvé dans ses documents publics, pas qu’il n’existe pas.`,
    ordre: "Ordre alphabétique des assureurs.",
    caption: `Types de contrats 3a et 3b proposés par ${NB} assureurs vie, relevés le ${dch(LU_LE)} sur leurs pages`,
    thAssureur: "Assureur",
    th3a: "En 3a",
    th3b: "En 3b",
    aucun: "aucun trouvé",
    detailsTitre: `Ce que disent les documents de chaque contrat`,
    detailsTexte: "Primes, libération du paiement des primes en cas d’incapacité de gain et règles de rachat, résumées depuis la page ou la fiche de l’assureur. Le contrat et ses conditions générales font foi.",
    pilier: (p: string) => (p === "3a+3b" ? "3a et 3b" : p),
    primes: "Primes",
    rachat: "Rachat et sortie",
    liberation: "Libération des primes",
    oui: "prévue",
    non: "non mentionnée",
    nc: "non précisée",
    source: (d: string) => `page de l’assureur, lue le ${d}`,
    comparTitre: `Assurance ou banque${T}: qu’est-ce qui change pour un 3a${T}?`,
    comparTexte: "Les deux formes sont reconnues par la loi (art. 1 OPP 3) et donnent droit à la même déduction. Elles diffèrent sur les points suivants.",
    thCritere: "Point",
    thAssurance: "Contrat d’assurance",
    thBanque: "Compte ou titres en banque",
    compar: [
      ["Décès et invalidité", "Le contrat peut couvrir le décès et l’invalidité, en capital ou en rente, en plus de l’épargne.", "La convention bancaire est une épargne. Une couverture des risques demande un contrat séparé.", SRC.opp3a1],
      ["Garantie", "La police traditionnelle garantit un capital à un taux fixé à la signature. Ce n’est pas le cas des polices liées à des fonds.", "Le compte porte un intérêt variable. L’épargne en titres ne garantit aucun capital et dépend des marchés.", SRC.cf],
      ["Versements", "La prime est fixée au contrat ; plusieurs assureurs permettent une pause ou une baisse sous conditions. En cas d’incapacité de gain, la libération du paiement des primes peut prendre le relais.", "Le montant versé peut changer chaque année, dans la limite du plafond.", SRC.cf],
      ["Sortie avant l’échéance", "La valeur de rachat correspond à la réserve du contrat, moins les frais d’acquisition non encore amortis (au plus 5 % pour une assurance d’épargne) et une éventuelle déduction pour risque de taux.", "Il n’y a pas de valeur de rachat : l’avoir reste celui du compte ou des titres.", SRC.finma],
      ["Frais", "La FINMA a relevé en 2023 que les frais de gestion et d’acquisition réduisent le rendement des assurances vie et que leur présentation à la souscription est souvent lacunaire.", "Les frais figurent dans les grilles tarifaires des banques et des fournisseurs.", SRC.finmaNews],
      ["Plafond annuel", "Les primes d’une couverture de risque comptent dans le plafond 3a, ce qui réduit d’autant la part d’épargne.", "Tout le versement va à l’épargne.", SRC.afc18a],
      ["Changer de prestataire", "Le transfert vers une banque ou un autre assureur est possible, en résiliant tout le contrat, sans partager l’avoir.", "Même règle : transfert complet, sans partage.", SRC.opp3a3a],
    ] as [string, string, string, string][],
    lienFrais: "Taux et frais des comptes 3a et des solutions en titres",
    lienFraisTexte: "Les frais publiés par les banques et les fournisseurs numériques, relevés sur leurs grilles tarifaires.",
    faq: [
      {
        q: `Peut-on récupérer son argent avant l’échéance d’une assurance 3a${T}?`,
        a: [
          "En 3a, l’avoir ne peut sortir que dans les cas prévus par l’art. 3 OPP 3 : retraite au plus tôt 5 ans avant l’âge de référence, achat du logement, départ définitif de Suisse, début d’une activité indépendante ou rente entière d’invalidité. Le transfert vers une banque ou un autre assureur reste possible.",
          "Dans ces cas, l’assureur verse la valeur de rachat. Elle se calcule sur la réserve du contrat, moins les frais d’acquisition non encore amortis et une éventuelle déduction pour risque de taux (circulaire FINMA 2024/2). Les premières années, elle peut donc être inférieure aux primes payées.",
        ],
        src: <>Sources : <a href={SRC.opp3a3}>OPP 3, art. 3</a> ; <a href={SRC.finma}>FINMA, circulaire 2024/2</a> ; <a href={SRC.lca91}>LCA, art. 91</a>.</>,
      },
      {
        q: `Combien peut-on verser en 3a en 2026 et en 2027${T}?`,
        a: [`Avec une caisse de pension, ${nf.fr(P26.avecLPP)} CHF en 2026 et ${nf.fr(P27.avecLPP)} CHF en 2027. Sans caisse de pension, 20 % du revenu de l’activité, au plus ${nf.fr(P26.sansLPP)} CHF en 2026 et ${nf.fr(P27.sansLPP)} CHF en 2027. Le plafond vaut pour tous vos contrats 3a ensemble, banque et assurance, et il inclut les primes de risque d’une assurance.`],
        src: <>Sources : <a href={SRC.ofas}>OFAS</a> ; <a href={SRC.afc18a}>AFC, circulaire 18a</a>.</>,
      },
      {
        q: `Quelle est la différence entre un 3a et un 3b auprès d’un assureur${T}?`,
        a: [
          "Le 3a est une prévoyance liée : les primes se déduisent du revenu imposable jusqu’au plafond, et l’argent reste bloqué jusqu’aux cas de l’art. 3 OPP 3. Le 3b est une prévoyance libre, sans plafond ni blocage légal.",
          "À l’impôt fédéral, le capital d’une assurance vie rachetable est en principe exonéré. Pour une assurance à prime unique, le rendement n’est exonéré que si le capital est versé après 60 ans, après au moins 5 ans de contrat, et que le contrat a été conclu avant 66 ans (art. 20 et 24 LIFD).",
        ],
        src: <>Sources : <a href={SRC.opp3}>OPP 3</a> ; <a href={SRC.lifd}>LIFD, art. 20 et 24</a>.</>,
      },
      {
        q: `Peut-on racheter des années de 3a manquées${T}?`,
        a: ["Oui, depuis le 1er janvier 2025, pour les années où vous pouviez cotiser sans verser le maximum. Le rachat est possible sur les 10 années précédentes, à condition de verser le maximum l’année du rachat, et il est plafonné chaque année à la petite cotisation. Seules les lacunes nées depuis 2025 comptent, d’où un premier rachat possible en 2026 pour l’année 2025."],
        src: <>Sources : <a href={SRC.opp3a7a}>OPP 3, art. 7a</a> ; <a href={SRC.rachatFaq}>OFAS, questions sur le rachat 3a</a>.</>,
      },
      {
        q: `Pourquoi ce tableau ne classe-t-il pas les assureurs${T}?`,
        a: ["Les contrats diffèrent par leur structure (part garantie, fonds, couverture de risque), et les assureurs ne publient pas leurs frais sous une forme comparable : un classement serait trompeur. Nous listons ce que disent leurs documents, par ordre alphabétique. Aucun assureur ne paie pour figurer ici."],
      },
    ] as FaqOutil[],
    maj: (d: string) => `Mis à jour le ${d}. Contrats relevés sur les pages et fiches des assureurs le ${dch(LU_LE)} ; textes de loi sur Fedlex.`,
    footer: "Ces informations sont un résumé des documents publics des assureurs. Le contrat et ses conditions générales font foi.",
  },
  en: {
    path: OUTILS_EN.assurance3a,
    alt: OUTILS.assurance3a,
    titre: `Pillar 3a and 3b with an insurer: ${NB} life insurers`,
    description: `The 3a and 3b policies of ${NB} life insurers (pure risk, guaranteed savings, unit-linked), their premiums and surrender rules from their own documents, and how they differ from a bank 3a.`,
    h1: "Pillar 3 with an insurer",
    intro: `${NB} life insurers offer tied (3a) or free (3b) pension policies in French-speaking Switzerland. On ${dch(LU_LE)} we read ${NB_PRODUITS} policies on their product pages and fact sheets: the type of policy, how flexible the premiums are and what their documents say about surrender. Insurers are listed alphabetically, with no ranking.`,
    miettes: [{ name: "Home", href: "/en/" }, { name: "Pillar 3a", href: "/en/pillar-3a/" }, { name: "3a and 3b with an insurer" }] as Miette[],
    partage: "Life insurers’ 3a and 3b policies, their premiums and surrender rules, and how they differ from a bank 3a.",
    types: { risque: "Pure risk", mixte: "Guaranteed savings", hybride: "Hybrid", fonds: "Unit-linked", nc: "Type not stated" } as Record<TypeContrat, string>,
    typesDef: [
      ["Pure risk", "A lump sum or a pension on death, sometimes on incapacity to work. No savings build up: if nothing happens, nothing is paid at the end."],
      ["Guaranteed savings (endowment)", "Savings with a guaranteed sum at maturity and cover on death. The Federal Council notes that a traditional policy guarantees a sum at a rate set when it is signed."],
      ["Unit-linked", "The savings are invested in funds. The value at maturity follows the markets and is not guaranteed, unless the policy includes a guarantee option."],
      ["Hybrid", "A guaranteed part and a part invested in funds, in fixed or adjustable proportions depending on the policy."],
    ] as [string, string][],
    typesTitre: "What types of policy do insurers offer?",
    tableauTitre: "Who offers what in 3a and 3b?",
    tableauTexte: `For each insurer, the policy types found on its pages on ${dch(LU_LE)}. A missing type means we did not find it in its public documents, not that it does not exist.`,
    ordre: "Insurers in alphabetical order.",
    caption: `3a and 3b policy types offered by ${NB} life insurers, read on their pages on ${dch(LU_LE)}`,
    thAssureur: "Insurer",
    th3a: "In 3a",
    th3b: "In 3b",
    aucun: "none found",
    detailsTitre: "What each policy’s documents say",
    detailsTexte: "Premiums, premium waiver on incapacity to work and surrender rules, summarised from the insurer’s page or fact sheet. The policy and its general terms prevail.",
    pilier: (p: string) => (p === "3a+3b" ? "3a and 3b" : p),
    primes: "Premiums",
    rachat: "Surrender and exit",
    liberation: "Premium waiver",
    oui: "available",
    non: "not mentioned",
    nc: "not stated",
    source: (d: string) => `insurer’s page, read on ${d}`,
    comparTitre: "Insurer or bank: what changes for a pillar 3a?",
    comparTexte: "Both forms are recognised by law (art. 1 OPP 3) and give the same deduction. They differ on the following points.",
    thCritere: "Point",
    thAssurance: "Insurance policy",
    thBanque: "Bank account or securities",
    compar: [
      ["Death and disability", "The policy can cover death and disability, as a lump sum or a pension, on top of the savings.", "The bank agreement is a savings plan. Risk cover needs a separate contract.", SRC.opp3a1],
      ["Guarantee", "A traditional policy guarantees a sum at a rate set when it is signed. Unit-linked policies do not.", "The account pays a variable interest rate. Securities savings guarantee no capital and depend on the markets.", SRC.cf],
      ["Payments", "The premium is set in the policy; several insurers allow a pause or a reduction under conditions. If you become unable to work, a premium waiver can take over.", "The amount paid in can change every year, within the cap.", SRC.cf],
      ["Leaving early", "The surrender value is the policy reserve, minus acquisition costs not yet amortised (at most 5% for a savings policy) and a possible deduction for interest-rate risk.", "There is no surrender value: the balance is what the account or the securities hold.", SRC.finma],
      ["Fees", "FINMA noted in 2023 that management and acquisition costs reduce life insurance returns and that how they are shown at signing often falls short.", "Fees appear in the price lists of banks and providers.", SRC.finmaNews],
      ["Annual cap", "Premiums for risk cover count towards the 3a cap, which reduces the savings part by the same amount.", "The whole payment goes to savings.", SRC.afc18a],
      ["Changing provider", "A transfer to a bank or another insurer is possible by terminating the whole policy, without splitting the balance.", "Same rule: full transfer, no splitting.", SRC.opp3a3a],
    ] as [string, string, string, string][],
    lienFrais: "Rates and fees of 3a accounts and securities solutions",
    lienFraisTexte: "The fees published by banks and digital providers, read on their price lists.",
    faq: [
      {
        q: "Can you get your money back before a 3a insurance policy matures?",
        a: [
          "In 3a, the money can only leave in the cases listed in art. 3 OPP 3: retirement at the earliest 5 years before the reference age, buying your home, leaving Switzerland for good, becoming self-employed or a full disability pension. A transfer to a bank or another insurer remains possible.",
          "In those cases, the insurer pays the surrender value. It is based on the policy reserve, minus acquisition costs not yet amortised and a possible deduction for interest-rate risk (FINMA circular 2024/2). In the first years it can therefore be lower than the premiums paid.",
        ],
        src: <>Sources: <a href={SRC.opp3a3}>OPP 3, art. 3</a>; <a href={SRC.finma}>FINMA, circular 2024/2</a>; <a href={SRC.lca91}>LCA, art. 91</a>.</>,
      },
      {
        q: "How much can you pay into 3a in 2026 and 2027?",
        a: [`With a pension fund, CHF ${nf.en(P26.avecLPP)} in 2026 and CHF ${nf.en(P27.avecLPP)} in 2027. Without a pension fund, 20% of earned income, up to CHF ${nf.en(P26.sansLPP)} in 2026 and CHF ${nf.en(P27.sansLPP)} in 2027. The cap applies to all your 3a contracts together, bank and insurance, and it includes the risk premiums of an insurance policy.`],
        src: <>Sources: <a href={SRC.ofas}>FSIO (OFAS)</a>; <a href={SRC.afc18a}>Federal Tax Administration, circular 18a</a>.</>,
      },
      {
        q: "What is the difference between 3a and 3b with an insurer?",
        a: [
          "Pillar 3a is tied pension saving: premiums are deducted from taxable income up to the cap, and the money stays locked until one of the cases in art. 3 OPP 3. Pillar 3b is free saving, with no cap and no legal lock.",
          "For federal tax, the capital of a life policy with a surrender value is in principle tax-free. For a single-premium policy, the return is only tax-free if the capital is paid after age 60, after at least 5 years, and the policy was signed before age 66 (arts. 20 and 24 LIFD).",
        ],
        src: <>Sources: <a href={SRC.opp3}>OPP 3</a>; <a href={SRC.lifd}>LIFD, arts. 20 and 24</a>.</>,
      },
      {
        q: "Can you make up for missed 3a years?",
        a: ["Yes, since 1 January 2025, for years in which you could contribute but did not pay the maximum. You can buy back the previous 10 years, provided you pay the maximum in the year of the buy-back, and each year’s buy-back is capped at the small contribution. Only gaps arising from 2025 count, so the first buy-back is possible in 2026 for the year 2025."],
        src: <>Sources: <a href={SRC.opp3a7a}>OPP 3, art. 7a</a>; <a href={SRC.rachatFaq}>FSIO, questions on 3a buy-backs</a>.</>,
      },
      {
        q: "Why does this table not rank the insurers?",
        a: ["The policies differ in structure (guaranteed part, funds, risk cover), and insurers do not publish their fees in a comparable form, so a ranking would be misleading. We list what their documents say, in alphabetical order. No insurer pays to be listed here."],
      },
    ] as FaqOutil[],
    maj: (d: string) => `Updated on ${d}. Policies read on the insurers’ pages and fact sheets on ${dch(LU_LE)}; legal texts on Fedlex.`,
    footer: "This information summarises insurers’ public documents. The policy and its general terms prevail.",
  },
};

export const metaAssurance3a = (locale: Locale) => {
  const t = TXT[locale];
  return pageMetadata({ title: t.titre, description: t.description, path: t.path, locale, ...(locale === "fr" ? { enPath: t.alt } : { frPath: t.alt }) });
};

const typesDe = (a: Assureur, pilier: "3a" | "3b") =>
  TYPES.filter((ty) => a.produits.some((p) => (p.type || "nc") === ty && p.pilier.includes(pilier)));

export function PageAssurance3a({ locale }: { locale: Locale }) {
  const t = TXT[locale];
  const en = locale === "en";
  const url = abs(t.path);
  const ld = graph(
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: t.titre,
      description: t.description,
      inLanguage: en ? "en" : "fr-CH",
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORG_ID },
      datePublished: "2026-11-23",
      dateModified: DATE_PAGE.assurance3a,
      breadcrumb: { "@id": `${url}#breadcrumb` },
      mainEntity: { "@id": `${url}#contrats` },
      citation: [...new Set([...Object.values(SRC), ...ASSUREURS_3A.flatMap((a) => a.produits.map((p) => p.url))])],
    },
    {
      "@type": "Dataset",
      "@id": `${url}#contrats`,
      name: t.h1,
      description: t.description,
      inLanguage: en ? "en" : "fr-CH",
      dateModified: LU_LE,
      temporalCoverage: LU_LE,
      isAccessibleForFree: true,
      creator: { "@id": ORG_ID },
      variableMeasured: en ? ["Policy type", "Pillar (3a, 3b)", "Premium flexibility", "Premium waiver", "Surrender rules"] : ["Type de contrat", "Pilier (3a, 3b)", "Souplesse des primes", "Libération du paiement des primes", "Règles de rachat"],
    },
    breadcrumbLd(t.miettes, `${url}#breadcrumb`),
    { ...faqLd(faqOutilLd(t.faq)), "@id": `${url}#faq` },
  );
  const sep = en ? ": " : `${T}: `;
  return (
    <div className="page-outil page-assurance-3a">
      <JsonLd data={ld} />
      <SiteHeader current="prevoyance" locale={locale} altPath={t.alt} />
      <main>
        <div className="wrap">
          <Breadcrumbs items={t.miettes} locale={locale} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>
          <div className="cta-haut-3a">
            <CtaDemande locale={locale} porte="prevoyance" emplacement="outil3a" />
          </div>
          <PartagerOutil path={t.path} title={t.h1} text={t.partage} locale={locale} />

          <section className="bloc-3a">
            <h2>{t.typesTitre}</h2>
            <div className="types-3a">
              {t.typesDef.map(([dt, dd]) => (
                <Card key={dt} size="sm">
                  <CardHeader>
                    <CardTitle>{dt}</CardTitle>
                    <CardDescription>{dd}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <p className="source-outil">{en ? "Source" : "Source"}{sep}<a href={SRC.cf}>{en ? "Federal Council, report on making pillar 3a more flexible (7.6.2024)" : "Conseil fédéral, rapport sur l’assouplissement du pilier 3a (7.6.2024)"}</a>.</p>
          </section>

          <section className="bloc-3a">
            <h2>{t.tableauTitre}</h2>
            <p>{t.tableauTexte}</p>
            <p className="note-outil ordre">{t.ordre}</p>
            <Table className="table-assureurs-3a">
              <TableCaption className="visually-hidden">{t.caption}</TableCaption>
              <TableHeader>
                <TableRow><TableHead scope="col">{t.thAssureur}</TableHead><TableHead scope="col">{t.th3a}</TableHead><TableHead scope="col">{t.th3b}</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {ASSUREURS_3A.map((a) => (
                  <TableRow key={a.id}>
                    <TableHead scope="row"><a href={`#${a.id}`}>{a.nom}</a></TableHead>
                    {(["3a", "3b"] as const).map((pl) => (
                      <TableCell key={pl}>
                        {typesDe(a, pl).length ? (
                          <ul className="puces-types">{typesDe(a, pl).map((ty) => <li key={ty} data-type={ty}><Badge variant="outline">{t.types[ty]}</Badge></li>)}</ul>
                        ) : <span className="aucun">{t.aucun}</span>}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <section className="bloc-3a">
            <h2>{t.detailsTitre}</h2>
            <p>{t.detailsTexte}</p>
            <Assureurs3aListe
              blocs={ASSUREURS_3A.map((a) => ({
                id: a.id,
                titre: a.nom,
                nombre: `${a.produits.length} ${en ? (a.produits.length > 1 ? "policies" : "policy") : `contrat${a.produits.length > 1 ? "s" : ""}`}`,
                contenu: (
                  <>
                      <p className="entite">{a.entite}</p>
                      {a.produits.map((p) => (
                        <div className="contrat-3a" key={p.nom}>
                          <h3>{p.nom}</h3>
                          <p className="etiquettes"><Badge variant="outline">{t.pilier(p.pilier)}</Badge><Badge variant="outline" data-type={p.type || "nc"}>{t.types[(p.type || "nc") as TypeContrat]}</Badge></p>
                          <dl>
                            <div><dt>{t.primes}</dt><dd>{(en ? p.primes_en : p.primes_fr) || p.primes_fr}</dd></div>
                            <div><dt>{t.liberation}</dt><dd>{p.liberation_primes === true ? t.oui : p.liberation_primes === false ? t.non : t.nc}</dd></div>
                            <div><dt>{t.rachat}</dt><dd>{(en ? p.rachat_en : p.rachat_fr) || p.rachat_fr}</dd></div>
                          </dl>
                          <p className="source-outil"><a href={p.url} rel="nofollow noopener" target="_blank">{t.source(dch(a.lu_le))}</a></p>
                        </div>
                      ))}
                  </>
                ),
              }))}
            />
          </section>

          <section className="bloc-3a">
            <h2>{t.comparTitre}</h2>
            <p>{t.comparTexte}</p>
            {/* Mobile : une carte par critère ; à partir de 720 px : le tableau. */}
            <div className="cartes-compar-3a min-[720px]:hidden">
              {t.compar.map(([c, a, b, u]) => (
                <Card key={c} size="sm">
                  <CardHeader>
                    <CardTitle>{c}</CardTitle>
                    <CardDescription><a href={u} rel="noopener">{en ? "source" : "source"}</a></CardDescription>
                  </CardHeader>
                  <CardContent>
                    <dl>
                      <div><dt>{t.thAssurance}</dt><dd>{a}</dd></div>
                      <div><dt>{t.thBanque}</dt><dd>{b}</dd></div>
                    </dl>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Table className="table-compar-3a hidden min-[720px]:table">
              <TableCaption className="visually-hidden">{t.comparTitre}</TableCaption>
              <TableHeader>
                <TableRow><TableHead scope="col">{t.thCritere}</TableHead><TableHead scope="col">{t.thAssurance}</TableHead><TableHead scope="col">{t.thBanque}</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {t.compar.map(([c, a, b, u]) => (
                  <TableRow key={c}>
                    <TableHead scope="row">{c}<a href={u} rel="noopener" className="src-ligne">{en ? "source" : "source"}</a></TableHead>
                    <TableCell>{a}</TableCell>
                    <TableCell>{b}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <div className="cta-bas-3a">
            <CtaDemande locale={locale} porte="prevoyance" emplacement="outil3a" />
          </div>
          <Alert variant="info" className="lien-outil-3a">
            <p><a href={en ? OUTILS_EN.taux3a : OUTILS.taux3a}>{t.lienFrais}</a> {t.lienFraisTexte}</p>
          </Alert>
        </div>
        <div className="wrap faq">
          <FaqSections faq={t.faq} />
          <p className="maj">{t.maj(dateLongue(DATE_PAGE.assurance3a, locale))}</p>
        </div>
      </main>
      <BarreDemande locale={locale} porte="prevoyance" />
      <SiteFooter note={t.footer} locale={locale} altPath={t.alt} />
    </div>
  );
}

