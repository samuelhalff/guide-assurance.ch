import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { PartagerOutil } from "@/components/site/partager-outil";
import { TauxLibrePassage } from "@/components/outils/taux-libre-passage";
import { BarreDemande } from "@/components/demande/barre-demande";
import { IconeTelephone, LienRappel } from "@/components/demande/lien-rappel";
import { buttonVariants } from "@/components/ui/button";
import { COMPTES_LP, NB_INSTITUTIONS, RELEVE_LE, TAUX_MAX, TAUX_MEDIAN, TAUX_MIN, dateCh, tauxEn, tauxFr } from "@/lib/tauxlp";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { DATE_PAGE } from "@/lib/donnees";
import { dateLongue } from "@/lib/i18n";
import { OUTILS, OUTILS_3A_ASSURANCE, OUTILS_EN } from "@/lib/nav";
import { chf, ESPACE_FINE as N } from "@/lib/nombres";
import type { Locale } from "@/lib/i18n";

/* Page « Taux des comptes de libre passage », en français et en anglais. Les fichiers de route
   (src/app/(fr)/libre-passage/taux, src/app/(en)/en/vested-benefits/interest-rates) ne font qu'appeler ces fonctions. */
export const PATH_LP = { fr: "/libre-passage/taux/", en: "/en/vested-benefits/interest-rates/" } as const;

const RELEVE = dateCh(RELEVE_LE);
const NB = NB_INSTITUTIONS;
const ECART_100K = (100000 * (TAUX_MAX - TAUX_MIN)) / 100;
const FEDLEX_LFLP = "https://www.fedlex.admin.ch/eli/cc/1994/2386_2386_2386/fr";
const FEDLEX_OLP = "https://www.fedlex.admin.ch/eli/cc/1994/2399_2399_2399/fr";
const FEDLEX_LB = "https://www.fedlex.admin.ch/eli/cc/51/117_121_129/fr";

type Faq = { q: string; a: string };
type Section = { id: string; h: string; p: string[] };

const LP = {
  fr: {
    path: PATH_LP.fr,
    alt: PATH_LP.en,
    titre: `Compte de libre passage : taux 2026, ${NB} institutions`,
    description: `Taux de ${NB} comptes de libre passage, lus le ${RELEVE} sur les pages des banques et de l’institution supplétive. Tri au choix, intérêt sur votre avoir.`,
    h1: "Taux des comptes de libre passage",
    intro: `Au ${RELEVE}, les comptes de libre passage de ${NB} institutions rapportent entre ${tauxFr(TAUX_MIN)} et ${tauxFr(TAUX_MAX)} par an, et la moitié d’entre eux ${tauxFr(TAUX_MEDIAN)} ou moins. Chaque taux a été lu sur la page de l’institution ou de sa fondation, avec sa date. Saisissez votre avoir pour voir ce que chaque taux rapporte en un an.`,
    source: `Source : pages officielles de chaque institution (un lien par ligne), relevées le ${dateLongue(RELEVE_LE, "fr")}. Les comparateurs en ligne ne servent jamais de source.`,
    rappelTexte: "Un conseiller d’un courtier partenaire peut vous rappeler pour parler de votre libre passage, gratuitement et sans engagement.",
    rappel: "Être rappelé",
    hListe: "Taux par institution",
    miettes: [{ name: "Accueil", href: "/" }, { name: "Prévoyance", href: "/3e-pilier/" }, { name: "Taux des comptes de libre passage" }] as Miette[],
    appli: "Taux des comptes de libre passage",
    partage: `Les taux des comptes de libre passage de ${NB} institutions suisses, relevés sur leurs pages.`,
    chiffres: `Au ${RELEVE}, le taux le plus élevé relevé est de ${tauxFr(TAUX_MAX)} et le plus bas de ${tauxFr(TAUX_MIN)}, pour une médiane de ${tauxFr(TAUX_MEDIAN)} sur ${NB} institutions. Sur 100${N}000${N}CHF, l’écart entre ces deux taux représente ${chf(ECART_100K, "fr", 0)} d’intérêts par an.`,
    sections: [
      {
        id: "definition",
        h: "Qu’est-ce qu’un compte de libre passage et quand en ouvre-t-on un ?",
        p: [
          "Quand vous quittez une caisse de pension avant la retraite, par exemple en changeant d’employeur, en vous mettant à votre compte ou en arrêtant de travailler, vous avez droit à une prestation de sortie (art. 2 LFLP). Si vous n’entrez pas dans une nouvelle caisse, cet argent doit rester dans la prévoyance, et vous indiquez à votre ancienne caisse sous quelle forme (art. 4, al. 1, LFLP). Le compte de libre passage, tenu par une fondation de libre passage, en est la forme la plus courante. Il est bloqué : on ne peut en sortir l’argent que dans les cas prévus par la loi.",
        ],
      },
      {
        id: "deux-comptes",
        h: "Combien de comptes peut-on avoir ?",
        p: [
          "La prestation de sortie peut être transférée à deux institutions de libre passage au maximum (art. 12, al. 1, OLP). Vous pouvez en changer en tout temps (art. 12, al. 2, OLP). Les taux ci-dessus aident à comparer, mais les conditions de chaque institution, en particulier les frais, restent à lire sur son site.",
        ],
      },
      {
        id: "protection",
        h: "Que devient l’argent si la banque fait faillite ?",
        p: [
          "Les créances d’une fondation de libre passage reconnue sont comptées au nom de chaque assuré. Elles sont privilégiées, en deuxième classe, jusqu’à 100 000 CHF par assuré, en plus de ses autres dépôts (art. 37a, al. 1 et 5, LB). Au-delà de ce montant, le solde est une créance ordinaire. Ce privilège concerne les comptes bancaires ; il ne vaut pas pour une solution de libre passage en titres, dont la valeur suit les marchés.",
        ],
      },
      {
        id: "depart",
        h: "Que se passe-t-il si vous quittez la Suisse ?",
        p: [
          "En quittant définitivement la Suisse, vous pouvez en principe demander le paiement en espèces de votre avoir (art. 5, al. 1, let. a, LFLP). Si vous êtes marié ou en partenariat enregistré, le consentement écrit de votre conjoint est nécessaire (art. 5, al. 2, LFLP).",
          "Une exception vise la part obligatoire de l’avoir (art. 15 LPP) : vous ne pouvez pas la retirer en espèces si vous restez obligatoirement assuré contre la vieillesse, le décès et l’invalidité dans un État membre de l’Union européenne ou en Islande et en Norvège, ni si vous habitez au Liechtenstein (art. 25f LFLP). Elle reste alors sur un compte ou une police de libre passage. Votre situation précise dépend de votre nouveau pays : demandez confirmation à l’institution avant de partir.",
        ],
      },
      {
        id: "supletive",
        h: "Que se passe-t-il si vous ne choisissez pas ?",
        p: [
          "Si vous ne dites pas à votre ancienne caisse où placer l’argent, elle le verse à l’institution supplétive LPP, au plus tôt six mois et au plus tard deux ans après votre départ (art. 4, al. 2, LFLP). Celle-ci tient alors un compte de libre passage à votre nom. Son taux figure dans la liste (Fondation institution supplétive LPP, Stiftung Auffangeinrichtung BVG).",
        ],
      },
      {
        id: "retrait",
        h: "Quand peut-on retirer son libre passage ?",
        p: [
          "Les prestations de vieillesse peuvent être versées au plus tôt cinq ans avant l’âge de référence. Elles sont dues à cet âge, et on peut les reporter jusqu’à cinq ans de plus si l’on prouve qu’on continue à travailler (art. 16, al. 1, OLP). Un retrait en capital exige le consentement écrit du conjoint (art. 16, al. 3, OLP). D’autres cas de paiement existent, notamment le départ définitif de Suisse, le début d’une activité à son compte sans prévoyance obligatoire ou un avoir inférieur à la cotisation annuelle (art. 5 LFLP).",
        ],
      },
    ] as Section[],
    liensTitre: "À lire ensuite",
    lienTaux3a: "Taux des comptes 3a",
    lienTaux3aTexte: "Les taux de 17 banques pour votre 3e pilier, relevés sur leurs pages.",
    lienImpot: "Économie d’impôt 3a",
    lienImpotTexte: "Ce qu’un versement 3a vous fait économiser selon votre canton.",
    lienAssurance: "3a et 3b auprès d’un assureur",
    lienAssuranceTexte: "Les contrats d’assureurs et ce qui les distingue d’un 3a bancaire.",
    lienPrevoyance: "Plafonds et règles du 3e pilier",
    lienPrevoyanceTexte: "Montants 2027, rachat et couverture décès.",
    faq: [
      {
        q: `Qu’est-ce qu’un compte de libre passage${N}?`,
        a: "C’est un compte bloqué, ouvert auprès d’une fondation de libre passage, qui reçoit votre capital de caisse de pension quand vous la quittez sans entrer dans une autre (art. 2 et 4 LFLP). Il porte intérêt, et l’argent reste dans la prévoyance jusqu’à un cas de retrait prévu par la loi.",
      },
      {
        q: `Quel taux d’intérêt rapporte un compte de libre passage en 2026${N}?`,
        a: `Entre ${tauxFr(TAUX_MIN)} et ${tauxFr(TAUX_MAX)} par an selon nos relevés du ${RELEVE} sur les pages de ${NB} institutions ; le taux médian est de ${tauxFr(TAUX_MEDIAN)}. Sur 100${N}000${N}CHF, l’écart entre le taux le plus bas et le plus élevé relevés représente ${chf(ECART_100K, "fr", 0)} d’intérêts par an. Ces taux sont variables.`,
      },
      {
        q: `Peut-on avoir deux comptes de libre passage${N}?`,
        a: "Oui, deux au maximum : la prestation de sortie peut être transférée à deux institutions de libre passage au plus (art. 12, al. 1, OLP), et vous pouvez en changer en tout temps (art. 12, al. 2).",
      },
      {
        q: `Que devient mon libre passage si je quitte la Suisse${N}?`,
        a: "Vous pouvez en principe demander le paiement en espèces en quittant définitivement la Suisse, avec l’accord écrit de votre conjoint le cas échéant (art. 5 LFLP). La part obligatoire ne peut pas être retirée en espèces si vous restez obligatoirement assuré dans un État de l’Union européenne, en Islande ou en Norvège, ou si vous habitez au Liechtenstein (art. 25f LFLP).",
      },
      {
        q: `L’argent est-il protégé en cas de faillite de la banque${N}?`,
        a: "Les créances d’une fondation de libre passage reconnue sont privilégiées en deuxième classe jusqu’à 100 000 CHF par assuré, en plus de ses autres dépôts (art. 37a LB). Le solde au-delà est une créance ordinaire.",
      },
      {
        q: `Quand peut-on retirer son libre passage${N}?`,
        a: "Au plus tôt cinq ans avant l’âge de référence ; l’avoir est dû à cet âge, et on peut le reporter jusqu’à cinq ans si l’on continue à travailler (art. 16 OLP). Certains autres cas permettent un retrait plus tôt, par exemple le départ définitif de Suisse (art. 5 LFLP).",
      },
    ] as Faq[],
    sources: [
      { label: "LFLP (Fedlex)", url: FEDLEX_LFLP },
      { label: "OLP (Fedlex)", url: FEDLEX_OLP },
      { label: "LB, art. 37a (Fedlex)", url: FEDLEX_LB },
    ],
    maj: `Taux relevés le ${RELEVE} sur les pages des institutions ; textes de loi vérifiés sur Fedlex le ${RELEVE}. Ces taux peuvent changer, et le site de l’institution fait foi.`,
    sourcesTitre: "Textes de loi cités",
    footer: "Ces taux sont donnés à titre d’information. Les conditions de l’institution font foi.",
    prevoyancePath: "/3e-pilier/",
  },
  en: {
    path: PATH_LP.en,
    alt: PATH_LP.fr,
    titre: `Vested benefits account rates 2026, ${NB} providers`,
    description: `Rates on ${NB} vested benefits accounts, read on ${RELEVE} on the banks’ pages and the substitute institution’s. Sort the list and see a year of interest.`,
    h1: "Vested benefits account interest rates",
    intro: `On ${RELEVE}, vested benefits accounts at ${NB} institutions paid between ${tauxEn(TAUX_MIN)} and ${tauxEn(TAUX_MAX)} a year, and half of them ${tauxEn(TAUX_MEDIAN)} or less. Each rate was read on the institution’s own page or its foundation’s page, with its date. Enter your balance to see what each rate pays over a year.`,
    source: `Source: each institution’s official pages (one link per row), read on ${dateLongue(RELEVE_LE, "en")}. Online comparison sites are never used as a source.`,
    rappelTexte: "An adviser from a partner broker can call you back to talk about your vested benefits, free and without commitment.",
    rappel: "Request a call-back",
    hListe: "Rates by institution",
    miettes: [{ name: "Home", href: "/en/" }, { name: "Pensions", href: "/en/pillar-3a/" }, { name: "Vested benefits account rates" }] as Miette[],
    appli: "Vested benefits account rates",
    partage: `Interest rates on vested benefits accounts at ${NB} Swiss institutions, read on their own pages.`,
    chiffres: `On ${RELEVE}, the highest rate read is ${tauxEn(TAUX_MAX)} and the lowest ${tauxEn(TAUX_MIN)}, with a median of ${tauxEn(TAUX_MEDIAN)} across ${NB} institutions. On CHF 100,000, the gap between those two rates is ${chf(ECART_100K, "en", 0)} of interest a year.`,
    sections: [
      {
        id: "definition",
        h: "What is a vested benefits account, and when do you get one?",
        p: [
          "When you leave a pension fund before retirement, for example by changing employer, becoming self-employed or stopping work, you are entitled to an exit benefit (art. 2 of the Vested Benefits Act, LFLP). If you do not join a new fund, the money has to stay in the pension system, and you tell your former fund in which form (art. 4 para. 1 LFLP). A vested benefits account, held by a vested benefits foundation, is the most common form. It is blocked: you can only take the money out in the cases set by law.",
        ],
      },
      {
        id: "deux-comptes",
        h: "How many accounts can you have?",
        p: [
          "The exit benefit can be transferred to two vested benefits institutions at most (art. 12 para. 1 OLP), and you can change institution at any time (art. 12 para. 2 OLP). The rates above help compare, but each institution’s conditions, fees in particular, are still to be read on its website.",
        ],
      },
      {
        id: "protection",
        h: "What happens to the money if the bank fails?",
        p: [
          "The claims of a recognised vested benefits foundation are counted in the name of each insured person. They rank as privileged, in the second class, up to CHF 100,000 per insured person, on top of that person’s other deposits (art. 37a paras. 1 and 5 Banking Act). Above that amount, the balance is an ordinary claim. This privilege covers bank accounts; it does not apply to a securities-based vested benefits solution, whose value follows the markets.",
        ],
      },
      {
        id: "depart",
        h: "What happens if you leave Switzerland?",
        p: [
          "If you leave Switzerland for good, you can in principle ask for the balance to be paid out in cash (art. 5 para. 1 let. a LFLP). If you are married or in a registered partnership, your spouse’s written consent is required (art. 5 para. 2 LFLP).",
          "One exception concerns the mandatory part of the balance (art. 15 of the Occupational Pensions Act, LPP): you cannot take it out in cash if you remain compulsorily insured against old age, death and disability in a European Union member state, in Iceland or in Norway, or if you live in Liechtenstein (art. 25f LFLP). It then stays in a vested benefits account or policy. Your exact situation depends on your new country, so ask the institution to confirm before you leave.",
        ],
      },
      {
        id: "supletive",
        h: "What if you do not choose?",
        p: [
          "If you do not tell your former fund where to place the money, it pays it to the Substitute Occupational Benefit Institution, at the earliest six months and at the latest two years after you leave (art. 4 para. 2 LFLP). The institution then keeps a vested benefits account in your name. Its rate is in the list (Stiftung Auffangeinrichtung BVG, or Fondation institution supplétive LPP in French).",
        ],
      },
      {
        id: "retrait",
        h: "When can you withdraw vested benefits?",
        p: [
          "Retirement benefits can be paid out at the earliest five years before the reference age. They fall due at that age, and you can defer them by up to five years if you show that you are still working (art. 16 para. 1 OLP). A lump-sum withdrawal needs your spouse’s written consent (art. 16 para. 3 OLP). Other cases of payment exist, notably leaving Switzerland for good, starting self-employment without compulsory pension cover, or a balance below your annual contribution (art. 5 LFLP).",
        ],
      },
    ] as Section[],
    liensTitre: "Read next",
    lienTaux3a: "Pillar 3a account rates",
    lienTaux3aTexte: "Rates at 17 banks for your pillar 3a, read on their own pages.",
    lienImpot: "Pillar 3a tax savings",
    lienImpotTexte: "What a 3a payment saves you, depending on your canton.",
    lienAssurance: "Pillar 3a and 3b with an insurer",
    lienAssuranceTexte: "Insurer policies and how they differ from a bank 3a.",
    lienPrevoyance: "Pillar 3a limits and rules",
    lienPrevoyanceTexte: "2027 amounts, buy-backs and death cover.",
    faq: [
      {
        q: "What is a vested benefits account?",
        a: "It is a blocked account held with a vested benefits foundation. It receives your pension fund capital when you leave a fund without joining another (art. 2 and 4 LFLP). It earns interest, and the money stays in the pension system until a withdrawal case set by law applies.",
      },
      {
        q: "What interest rate does a vested benefits account pay in 2026?",
        a: `Between ${tauxEn(TAUX_MIN)} and ${tauxEn(TAUX_MAX)} a year according to our survey of ${NB} institutions’ pages on ${RELEVE}; the median rate is ${tauxEn(TAUX_MEDIAN)}. On CHF 100,000, the gap between the lowest and the highest rate read is ${chf(ECART_100K, "en", 0)} of interest a year. These rates are variable.`,
      },
      {
        q: "Can you have two vested benefits accounts?",
        a: "Yes, two at most: the exit benefit can be transferred to no more than two vested benefits institutions (art. 12 para. 1 OLP), and you can change institution at any time (art. 12 para. 2).",
      },
      {
        q: "What happens to my vested benefits if I leave Switzerland?",
        a: "You can in principle ask for a cash payment when you leave Switzerland for good, with your spouse’s written consent where relevant (art. 5 LFLP). The mandatory part cannot be paid out in cash if you remain compulsorily insured in a European Union state, in Iceland or in Norway, or if you live in Liechtenstein (art. 25f LFLP).",
      },
      {
        q: "Is the money protected if the bank fails?",
        a: "The claims of a recognised vested benefits foundation rank as privileged, in the second class, up to CHF 100,000 per insured person, on top of that person’s other deposits (art. 37a Banking Act). The balance above that is an ordinary claim.",
      },
      {
        q: "When can you withdraw vested benefits?",
        a: "At the earliest five years before the reference age; the balance falls due at that age, and you can defer it by up to five years if you keep working (art. 16 OLP). A few other cases allow earlier payment, such as leaving Switzerland for good (art. 5 LFLP).",
      },
    ] as Faq[],
    sources: [
      { label: "LFLP (Fedlex)", url: FEDLEX_LFLP },
      { label: "OLP (Fedlex)", url: FEDLEX_OLP },
      { label: "Banking Act, art. 37a (Fedlex)", url: FEDLEX_LB },
    ],
    maj: `Rates read on ${RELEVE} on the institutions’ pages; legal texts checked on Fedlex on ${RELEVE}. These rates can change, and the institution’s website is authoritative.`,
    sourcesTitre: "Legal texts cited",
    footer: "These rates are for information only. The institution’s conditions are authoritative.",
    prevoyancePath: "/en/pillar-3a/",
  },
};

export const metaLibrePassage = (locale: Locale) => {
  const t = LP[locale];
  return pageMetadata({ title: t.titre, description: t.description, path: t.path, locale, ...(locale === "fr" ? { enPath: t.alt } : { frPath: t.alt }) });
};

/* Contenu exposé aux tests et à llms : titre, description, FAQ. */
export const CONTENU_LP = LP;

export function PageLibrePassage({ locale }: { locale: Locale }) {
  const t = LP[locale];
  const fr = locale === "fr";
  const url = abs(t.path);
  const o = fr ? OUTILS : OUTILS_EN;
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
      datePublished: "2026-11-24",
      dateModified: DATE_PAGE.tauxLibrePassage,
      breadcrumb: { "@id": `${url}#breadcrumb` },
      mainEntity: { "@id": `${url}#taux` },
      citation: [...new Set([...COMPTES_LP.map((c) => c.url), ...t.sources.map((s) => s.url)])],
    },
    {
      "@type": "WebApplication",
      "@id": `${url}#outil`,
      name: t.appli,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      inLanguage: fr ? "fr-CH" : "en",
      isAccessibleForFree: true,
      provider: { "@id": ORG_ID },
    },
    {
      "@type": "Dataset",
      "@id": `${url}#taux`,
      name: t.appli,
      description: t.description,
      inLanguage: fr ? "fr-CH" : "en",
      dateModified: RELEVE_LE,
      temporalCoverage: RELEVE_LE,
      isAccessibleForFree: true,
      creator: { "@id": ORG_ID },
      variableMeasured: fr ? ["Taux d’intérêt annuel du compte de libre passage (%)"] : ["Annual interest rate of the vested benefits account (%)"],
    },
    breadcrumbLd(t.miettes, `${url}#breadcrumb`),
    { ...faqLd(t.faq), "@id": `${url}#faq` },
  );
  return (
    <div className="page-outil page-lp">
      <JsonLd data={ld} />
      <SiteHeader current="prevoyance" locale={locale} altPath={t.alt} />
      <main id="contenu">
        <div className="wrap">
          <Breadcrumbs items={t.miettes} locale={locale} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>
          <div className="cta-haut-lp">
            <div className="cta-demande">
              <LienRappel locale={locale} emplacement="libre_passage" sujet="prevoyance" className={buttonVariants()}>
                <IconeTelephone />
                {t.rappel}
              </LienRappel>
              <p>{t.rappelTexte}</p>
            </div>
          </div>
          <PartagerOutil path={t.path} title={t.appli} text={t.partage} locale={locale} />
          <h2 className="titre-section-lp" id="taux">{t.hListe}</h2>
          <p className="chiffres-lp">{t.chiffres}</p>
          <p className="note-outil">{t.source}</p>
          <div className="outil-lp">
            <TauxLibrePassage locale={locale} />
          </div>
          {t.sections.map((s) => (
            <section key={s.id} className="prose-lp" id={s.id}>
              <h2 className="titre-section-lp">{s.h}</h2>
              {s.p.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
            </section>
          ))}
          <p className="note-outil">
            {t.sourcesTitre} :{" "}
            {t.sources.map((s, i) => (
              <span key={s.url}>
                {i ? ", " : ""}
                <a href={s.url} rel="noopener" target="_blank">{s.label}</a>
              </span>
            ))}
            .
          </p>
          <div className="cta-bas-lp">
            <div className="cta-demande">
              <LienRappel locale={locale} emplacement="libre_passage" sujet="prevoyance" className={buttonVariants()}>
                <IconeTelephone />
                {t.rappel}
              </LienRappel>
            </div>
          </div>
          <h2 className="titre-section-lp">{t.liensTitre}</h2>
          <div className="liens-lp">
            <p><a href={o.taux3a}>{t.lienTaux3a}</a> {t.lienTaux3aTexte}</p>
            <p><a href={o.impot3a}>{t.lienImpot}</a> {t.lienImpotTexte}</p>
            <p><a href={fr ? OUTILS_3A_ASSURANCE.fr : OUTILS_3A_ASSURANCE.en}>{t.lienAssurance}</a> {t.lienAssuranceTexte}</p>
            <p><a href={t.prevoyancePath}>{t.lienPrevoyance}</a> {t.lienPrevoyanceTexte}</p>
          </div>
        </div>
        <div className="wrap faq">
          {t.faq.map((f) => (
            <section key={f.q}>
              <h2>{f.q}</h2>
              <p>{f.a}</p>
            </section>
          ))}
          <p className="maj">{t.maj}</p>
        </div>
      </main>
      <BarreDemande locale={locale} rappelSujet="prevoyance" />
      <SiteFooter note={t.footer} locale={locale} altPath={t.alt} />
    </div>
  );
}
