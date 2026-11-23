import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { PartagerOutil } from "@/components/site/partager-outil";
import { FaqSections, faqOutilLd, type FaqOutil } from "@/components/site/faq-sections";
import { SommeMenage } from "@/components/outils/somme-menage";
import * as S from "@/lib/engines/somme-menage";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { DATE_PAGE } from "@/lib/donnees";
import { dateLongue, type Locale } from "@/lib/i18n";
import { OUTILS, OUTILS_EN } from "@/lib/nav";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/* « Calculateur de la somme d'assurance ménage » (/assurance-menage-rc/calculateur-somme/ et version anglaise). Les
   fichiers de route ne font qu'appeler ces fonctions. Méthodes et sources : src/lib/engines/somme-menage.ts. */
const N = " ";
const nfFr = { format: (x: number) => S.formaterMontant(x, "fr") };
const nfEn = { format: (x: number) => S.formaterMontant(x, "en") };

const SRC = {
  baloiseFr: "https://baloise.ch/dam/jcr:d680ea0d-346b-4620-b9e9-1c461d754691/determination%20de%20la%20somme%20assuree%20relative%20au%20mobilier%20de%20menage.pdf",
  baloiseDe: "https://baloise.ch/dam/jcr:d4813f6c-9ef6-459b-8fa5-c95402463a13/Ermittlung%20der%20VS%20f%C3%BCr%20den%20Hausrat_d.pdf",
  zurich: "https://www.zurich.ch/-/media/zurich-site/content/privatkunden/wohnen-bauen/dokumente/inventarblatt/inventarblatt-hausratversicherung-formular.pdf?sc_lang=fr",
  css: "https://www.css.ch/fr/clients-prives/bien-assure/bon-a-savoir/conseils-assurance/inventaire-menage-ce-qui-est-assure.html",
  lca: "https://www.fedlex.admin.ch/eli/cc/24/719_735_717/fr#art_51_a",
  mobiliere: "https://www.mobiliar.ch/ratgeber/hausrat-versicherungssumme",
  allianz: "https://www.allianz.ch/fr/clients-prives/guide/habitation/sous-assurance.html",
  cgaZurich: "https://www.zurich.ch/-/media/zurich-site/content/privatkunden/haftung-recht/dokumente/avb-haushaltversicherung/cga-assurance-habitation.pdf?sc_lang=fr",
  cgaCss: "https://www.css.ch/content/dam/css/fr/documents/privatkunden/richtig-versichert/avb/519_f_avb_hausratversicherung.pdf",
  cgaMobiliere: "https://www.mobiliere.ch/media/21019/download",
};

/* Exemples calculés au build avec le même moteur (lisibles sans JavaScript). */
const EXEMPLES: S.Profil[] = [
  { pieces: 2, personnes: 1, standard: "moyen" },
  { pieces: 3.5, personnes: 2, standard: "moyen" },
  { pieces: 4.5, personnes: 3, standard: "moyen" },
  { pieces: 5.5, personnes: 4, standard: "moyen" },
  { pieces: 3.5, personnes: 2, standard: "simple" },
  { pieces: 3.5, personnes: 2, standard: "eleve" },
];
const EX = EXEMPLES.map((p) => ({ p, e: S.estimer(p) }));
const REF = S.estimer({ pieces: 3.5, personnes: 2, standard: "moyen" });

const T = {
  fr: {
    path: OUTILS.sommeMenage,
    alt: OUTILS_EN.sommeMenage,
    titre: "Somme d’assurance ménage : calculateur gratuit",
    description: "Combien assurer pour votre mobilier ? Estimation de la valeur à neuf en trois réponses, avec deux méthodes publiées par des assureurs et la règle de la sous-assurance (art. 51a LCA).",
    h1: "Calculer la somme d’assurance de son ménage",
    intro: `Pour un 3,5 pièces à deux, meublé dans des magasins courants, les méthodes publiées par Baloise et Zurich donnent ${nfFr.format(REF.min)} à ${nfFr.format(REF.max)} CHF, réserve comprise. Répondez à trois questions pour votre propre estimation de la valeur à neuf.`,
    prive: "Le calcul se fait dans votre navigateur. Nous ne recevons rien de ce que vous indiquez.",
    miettes: [{ name: "Accueil", href: "/" }, { name: "Ménage et RC", href: "/assurance-menage-rc/" }, { name: "Somme d’assurance ménage" }] as Miette[],
    appli: "Calculateur de la somme d’assurance ménage",
    partage: "Estimer la somme d’assurance de son ménage en trois réponses, avec deux méthodes publiées par des assureurs.",
    exTitre: "Exemples de sommes, réserve de 10 % comprise",
    exTexte: `Les montants sont en CHF et incluent la réserve de 10${N}% que les deux assureurs conseillent. Ils ne comptent ni les objets coûteux ajoutés à part ni les bijoux.`,
    exCap: "Somme d’assurance ménage selon les méthodes Baloise et Zurich, en CHF",
    thMenage: "Ménage",
    thBaloise: "Baloise",
    thZurich: "Zurich",
    thSomme: "Somme proposée",
    menage: (p: S.Profil) => `${String(p.pieces).replace(".", ",")} pièces, ${String(p.personnes).replace(".", ",")} pers., standard ${p.standard === "simple" ? "simple" : p.standard === "moyen" ? "moyen" : "élevé"}`,
    exNote: `La CSS donne une autre règle simple : environ 1${N}000 CHF par m² de surface habitable, plus 10${N}% de réserve (page du 5 juillet 2022).`,
    faq: [
      {
        q: `Comment calculer la somme d’assurance de son ménage${N}?`,
        a: [
          "Il faut estimer ce que coûterait le rachat à neuf de tout ce que vous possédez chez vous, cave et grenier compris : meubles, électroménager, vaisselle, linge, vêtements, appareils, vélos et objets de loisirs. La somme inscrite au contrat doit atteindre ce montant.",
          `Pour aller vite, des assureurs publient des méthodes par pièces et par personnes. Baloise donne une grille pour un standard moyen, à multiplier par 0,7 ou 1,3 selon l’équipement ; Zurich, une formule dans sa feuille d’inventaire. Les deux conseillent d’ajouter une réserve de 10${N}% pour les achats futurs.`,
        ],
        src: <>Sources : <a href={SRC.baloiseFr}>Baloise, détermination de la somme assurée relative au mobilier de ménage</a> ; <a href={SRC.zurich}>Zurich, feuille d’inventaire ZH56108f (05.2024)</a> ; <a href={SRC.css}>CSS, règle de 1 000 CHF par m² (05.07.2022)</a>.</>,
      },
      {
        q: `Qu’est-ce que la sous-assurance${N}?`,
        a: [
          "Il y a sous-assurance quand la somme assurée n’atteint pas la valeur de remplacement de vos biens. Dans ce cas, le dommage est réparé dans la proportion entre la somme assurée et cette valeur, sauf si le contrat prévoit autre chose (art. 51a, al. 2, LCA).",
          "La Mobilière donne cet exemple : pour un mobilier qui vaut 100 000 CHF à neuf mais assuré pour 80 000 CHF, un dommage de 40 000 CHF n’est remboursé qu’à hauteur de 32 000 CHF. Le contrat ne paie jamais plus que la somme assurée (art. 51a, al. 1, LCA).",
        ],
        src: <>Sources : <a href={SRC.lca}>art. 51a LCA (Fedlex)</a>, en vigueur depuis le 1er janvier 2022 ; <a href={SRC.mobiliere}>Mobilière, somme d’assurance ménage (novembre 2026)</a>.</>,
      },
      {
        q: `La règle proportionnelle s’applique-t-elle à tous les sinistres${N}?`,
        a: [
          `Pas toujours, car la loi permet au contrat d’y renoncer. Zurich ne l’applique pas aux sinistres de 10${N}% de la somme au plus, jusqu’à 30${N}000 CHF (CGA 05/2026, art. 14). La CSS y renonce jusqu’à 20${N}000 CHF (CGA 02.2024, art. 22). Ces renonciations ne valent pas pour l’assurance obligatoire des dommages naturels.`,
          "Pour un gros sinistre, comme un incendie ou un dégât d’eau qui touche tout l’appartement, une somme trop basse réduit donc l’indemnité dans presque tous les contrats.",
        ],
        src: <>Sources : <a href={SRC.cgaZurich}>Zurich, CGA assurance habitation, éd. 05/2026</a> ; <a href={SRC.cgaCss}>CSS, CGA assurance inventaire du ménage, éd. 02.2024</a>.</>,
      },
      {
        q: `Valeur à neuf ou valeur actuelle${N}?`,
        a: [
          "Depuis la révision de 2022, la loi ne dit plus comment calculer l’indemnité du mobilier : c’est le contrat qui le fixe. Les CGA d’assurance ménage consultées remboursent la valeur à neuf, c’est-à-dire le prix d’un objet neuf équivalent, dans les limites de la somme d’assurance. C’est donc la valeur à neuf qu’il faut estimer, et non le prix de revente de vos meubles.",
        ],
        src: <>Sources : <a href={SRC.cgaMobiliere}>Mobilière, CGA ménage Minima, éd. 04.2025</a> ; <a href={SRC.cgaCss}>CSS, CGA éd. 02.2024</a>.</>,
      },
      {
        q: `Les bijoux et l’argent liquide sont-ils couverts${N}?`,
        a: [
          `En partie seulement. Chez Zurich et à la CSS, les bijoux volés sont remboursés jusqu’à 20${N}% de la somme d’assurance et 30${N}000 CHF au plus, et l’argent liquide jusqu’à 5${N}000 CHF, rien en cas de vol simple. Une formule d’entrée de gamme comme Minima de la Mobilière s’arrête à 1${N}000 CHF pour chacun.`,
          "Des bijoux ou des montres de valeur se déclarent donc à part, ou s’assurent avec une assurance des objets de valeur. Le calculateur les compte séparément pour cette raison.",
        ],
        src: <>Sources : <a href={SRC.cgaZurich}>Zurich, CGA 05/2026, art. 113</a> ; <a href={SRC.cgaCss}>CSS, CGA 02.2024, art. 19 et 23</a> ; <a href={SRC.cgaMobiliere}>Mobilière, CGA Minima 04.2025</a>.</>,
      },
      {
        q: `Quand faut-il revoir sa somme d’assurance${N}?`,
        a: [
          "Après un déménagement, une naissance, une mise en ménage ou un achat important, comme un vélo électrique, un ordinateur ou un canapé. La réserve de 10 % absorbe les petits achats ; au-delà, signalez la nouvelle valeur à votre assureur, qui adapte la somme et la prime.",
        ],
      },
    ] as FaqOutil[],
    sourcesTitre: "Sources",
    maj: `Mis à jour le ${dateLongue(DATE_PAGE.sommeMenage, "fr")}. Méthodes Baloise (éd. 3.23) et Zurich (05.2024), CGA Zurich, CSS et Mobilière, et art. 51a LCA (Fedlex), relevés le 23 novembre 2026.`,
    footer: "Cette estimation est donnée à titre d’information. Votre contrat et ses CGA font foi.",
  },
  en: {
    path: OUTILS_EN.sommeMenage,
    alt: OUTILS.sommeMenage,
    titre: "Household contents sum insured: free calculator",
    description: "How much should you insure your household contents for? A replacement-value estimate in three answers, using two methods published by Swiss insurers, plus the underinsurance rule.",
    h1: "Work out the sum insured for your household contents",
    intro: `For a 3.5-room flat shared by two people, furnished from regular shops, the methods published by Baloise and Zurich give CHF ${nfEn.format(REF.min)} to CHF ${nfEn.format(REF.max)}, reserve included. Answer three questions for your own replacement-value estimate.`,
    prive: "The calculation runs in your browser. We receive nothing of what you enter.",
    miettes: [{ name: "Home", href: "/en/" }, { name: "Household and liability", href: "/en/household-and-liability-insurance/" }, { name: "Household sum insured" }] as Miette[],
    appli: "Household contents sum insured calculator",
    partage: "Estimate the sum insured for your household contents in three answers, using two methods published by insurers.",
    exTitre: "Example sums, including a 10% reserve",
    exTexte: "Amounts are in CHF and include the 10% reserve both insurers recommend. They leave out costly items added separately and jewellery.",
    exCap: "Household contents sum insured under the Baloise and Zurich methods, in CHF",
    thMenage: "Household",
    thBaloise: "Baloise",
    thZurich: "Zurich",
    thSomme: "Suggested sum",
    menage: (p: S.Profil) => `${p.pieces} rooms, ${p.personnes} ${p.personnes === 1 ? "person" : "people"}, ${p.standard === "simple" ? "basic" : p.standard === "moyen" ? "medium" : "high-end"} furnishing`,
    exNote: "CSS gives another rule of thumb: about CHF 1,000 per m² of living space, plus a 10% reserve (page of 5 July 2022).",
    faq: [
      {
        q: "How do you work out the sum insured for household contents?",
        a: [
          "You estimate what it would cost to buy new everything you own at home, cellar and attic included: furniture, appliances, crockery, linen, clothes, devices, bikes and leisure items. The sum in the policy should reach that amount.",
          "For a quick answer, some insurers publish methods based on rooms and people. Baloise provides a grid for a medium standard, multiplied by 0.7 or 1.3 depending on how you are furnished; Zurich provides a formula in its inventory sheet. Both recommend adding a 10% reserve for future purchases.",
        ],
        src: <>Sources: <a href={SRC.baloiseDe}>Baloise, Ermittlung der Versicherungssumme für den Hausrat (ed. 3.23)</a>; <a href={SRC.zurich}>Zurich, inventory sheet ZH56108f (05.2024)</a>; <a href={SRC.css}>CSS, CHF 1,000 per m² rule (05.07.2022)</a>.</>,
      },
      {
        q: "What is underinsurance?",
        a: [
          "You are underinsured when the sum insured is lower than the replacement value of your belongings. The loss is then paid in the proportion between the sum insured and that value, unless the policy provides otherwise (art. 51a para. 2 LCA, Insurance Contract Act).",
          "Mobiliar gives this example: for contents worth CHF 100,000 new but insured for CHF 80,000, a CHF 40,000 loss is paid at only CHF 32,000. The policy never pays more than the sum insured (art. 51a para. 1 LCA).",
        ],
        src: <>Sources: <a href={SRC.lca}>art. 51a LCA (Fedlex)</a>, in force since 1 January 2022; <a href={SRC.mobiliere}>Mobiliar, household sum insured (November 2026)</a>.</>,
      },
      {
        q: "Does the proportional rule apply to every claim?",
        a: [
          "Not always, because the law lets the policy waive it. Zurich does not apply it to claims of up to 10% of the sum insured, capped at CHF 30,000 (general terms 05/2026, art. 14). CSS waives it up to CHF 20,000 (general terms 02.2024, art. 22). These waivers do not apply to the compulsory natural hazards cover.",
          "For a large claim, such as a fire or water damage affecting the whole flat, a sum that is too low therefore cuts the payment under almost every policy.",
        ],
        src: <>Sources: <a href={SRC.cgaZurich}>Zurich, home insurance general terms, ed. 05/2026</a>; <a href={SRC.cgaCss}>CSS, household contents general terms, ed. 02.2024</a>.</>,
      },
      {
        q: "Replacement value or current value?",
        a: [
          "Since the 2022 revision, the law no longer says how household contents are valued: the policy sets the rule. The household general terms we read pay the replacement value, meaning the price of an equivalent new item, within the sum insured. That is the value to estimate, not what your furniture would sell for second-hand.",
        ],
        src: <>Sources: <a href={SRC.cgaMobiliere}>Mobiliar, household general terms Minima, ed. 04.2025</a>; <a href={SRC.cgaCss}>CSS, general terms ed. 02.2024</a>.</>,
      },
      {
        q: "Are jewellery and cash covered?",
        a: [
          "Only in part. At Zurich and CSS, stolen jewellery is paid up to 20% of the sum insured and at most CHF 30,000, and cash up to CHF 5,000, with nothing for simple theft. An entry-level product such as Mobiliar’s Minima stops at CHF 1,000 for each.",
          "Valuable jewellery or watches are therefore declared separately or insured under a valuables policy. That is why the calculator counts them separately.",
        ],
        src: <>Sources: <a href={SRC.cgaZurich}>Zurich, general terms 05/2026, art. 113</a>; <a href={SRC.cgaCss}>CSS, general terms 02.2024, art. 19 and 23</a>; <a href={SRC.cgaMobiliere}>Mobiliar, Minima general terms 04.2025</a>.</>,
      },
      {
        q: "When should you review your sum insured?",
        a: [
          "After a move, a birth, moving in together or a large purchase such as an e-bike, a computer or a sofa. The 10% reserve absorbs small purchases; beyond that, tell your insurer the new value so it can adjust the sum and the premium.",
        ],
      },
    ] as FaqOutil[],
    sourcesTitre: "Sources",
    maj: `Updated on ${dateLongue(DATE_PAGE.sommeMenage, "en")}. Baloise (ed. 3.23) and Zurich (05.2024) methods, Zurich, CSS and Mobiliar general terms, and art. 51a LCA (Fedlex), read on 23 November 2026.`,
    footer: "This estimate is for information only. Your policy and its general terms prevail.",
  },
};

const SOURCES = (l: Locale) =>
  l === "fr"
    ? [
        ["Baloise, « Détermination de la somme assurée relative au mobilier de ménage », formulaire 140.1173 f (même grille que l’éd. allemande 3.23)", SRC.baloiseFr],
        ["Zurich, « Feuille d’inventaire de l’assurance inventaire du ménage », ZH56108f-2405 (mai 2024)", SRC.zurich],
        ["CSS, « Inventaire du ménage : ce qui est assuré » (5 juillet 2022)", SRC.css],
        ["Art. 51a LCA, somme assurée et sous-assurance (Fedlex, en vigueur depuis le 1er janvier 2022)", SRC.lca],
        ["Mobilière, « Hausrat-Versicherungssumme berechnen » (mise à jour de novembre 2026)", SRC.mobiliere],
        ["Allianz, « Sous-assurance »", SRC.allianz],
        ["Zurich, CGA assurance habitation, éd. 05/2026", SRC.cgaZurich],
        ["CSS, CGA assurance inventaire du ménage, éd. 02.2024", SRC.cgaCss],
        ["Mobilière, CGA assurance ménage Minima, éd. 04.2025", SRC.cgaMobiliere],
      ]
    : [
        ["Baloise, “Ermittlung der Versicherungssumme für den Hausrat”, form 140.1173 d, ed. 3.23", SRC.baloiseDe],
        ["Zurich, household contents inventory sheet, ZH56108f-2405 (May 2024)", SRC.zurich],
        ["CSS, household contents: what is insured (5 July 2022)", SRC.css],
        ["Art. 51a LCA, sum insured and underinsurance (Fedlex, in force since 1 January 2022)", SRC.lca],
        ["Mobiliar, “Hausrat-Versicherungssumme berechnen” (updated November 2026)", SRC.mobiliere],
        ["Allianz, underinsurance", SRC.allianz],
        ["Zurich, home insurance general terms, ed. 05/2026", SRC.cgaZurich],
        ["CSS, household contents general terms, ed. 02.2024", SRC.cgaCss],
        ["Mobiliar, household insurance general terms Minima, ed. 04.2025", SRC.cgaMobiliere],
      ];

export const metaSommeMenage = (locale: Locale) => {
  const t = T[locale];
  return pageMetadata({ title: t.titre, description: t.description, path: t.path, locale, ...(locale === "fr" ? { enPath: t.alt } : { frPath: t.alt }) });
};

export function PageSommeMenage({ locale }: { locale: Locale }) {
  const t = T[locale];
  const nf = locale === "fr" ? nfFr : nfEn;
  const url = abs(t.path);
  const sources = SOURCES(locale);
  const ld = graph(
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: t.titre,
      description: t.description,
      inLanguage: locale === "fr" ? "fr-CH" : "en",
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORG_ID },
      datePublished: "2026-11-23",
      dateModified: DATE_PAGE.sommeMenage,
      breadcrumb: { "@id": `${url}#breadcrumb` },
      mainEntity: { "@id": `${url}#outil` },
      citation: sources.map((s) => s[1]),
    },
    {
      "@type": "WebApplication",
      "@id": `${url}#outil`,
      name: t.appli,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      inLanguage: locale === "fr" ? "fr-CH" : "en",
      isAccessibleForFree: true,
      provider: { "@id": ORG_ID },
    },
    breadcrumbLd(t.miettes, `${url}#breadcrumb`),
    { ...faqLd(faqOutilLd(t.faq)), "@id": `${url}#faq` },
  );
  return (
    <div className="page-outil page-somme-menage">
      <JsonLd data={ld} />
      <SiteHeader current="outils" locale={locale} altPath={t.alt} />
      <main>
        <div className="wrap">
          <Breadcrumbs items={t.miettes} locale={locale} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>
          <p className="prive">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 9V6a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <rect x="3" y="9" width="14" height="10" rx="1.5" fill="currentColor" />
            </svg>
            {t.prive}
          </p>
          <SommeMenage locale={locale} />

          <section className="reperes-statiques reperes-menage">
            <h2>{t.exTitre}</h2>
            <p>{t.exTexte}</p>
            <Table variant="chiffres">
              <TableCaption className="visually-hidden">{t.exCap}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t.thMenage}</TableHead>
                  <TableHead scope="col">{t.thBaloise}</TableHead>
                  <TableHead scope="col">{t.thZurich}</TableHead>
                  <TableHead scope="col">{t.thSomme}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {EX.map(({ p, e }) => (
                  <TableRow key={t.menage(p)}>
                    <TableHead scope="row">{t.menage(p)}</TableHead>
                    <TableCell>{e.baloise == null ? "–" : nf.format(e.baloise)}</TableCell>
                    <TableCell>{nf.format(e.zurich)}</TableCell>
                    <TableCell><b>{nf.format(e.somme)}</b></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="source-outil">{t.exNote}</p>
            <PartagerOutil path={t.path} title={t.appli} text={t.partage} locale={locale} />
          </section>

          <section className="sources-pj">
            <h2>{t.sourcesTitre}</h2>
            <ol>
              {sources.map(([label, href]) => (
                <li key={href}>
                  <a href={href}>{label}</a>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="wrap faq">
          <p className="maj">{t.maj}</p>
          <FaqSections faq={t.faq} />
        </div>
      </main>
      <SiteFooter note={t.footer} locale={locale} altPath={t.alt} />
    </div>
  );
}
