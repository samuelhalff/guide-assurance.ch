import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { IconeTelephone, LienRappel } from "@/components/demande/lien-rappel";
import { FaqSections, faqOutilLd, type FaqOutil } from "@/components/site/faq-sections";
import { pageMetadata } from "@/lib/metadata";
import { ORG_ID, WEBSITE_ID, breadcrumbLd, faqLd, graph, type Miette } from "@/lib/jsonld";
import { abs } from "@/lib/site";
import { dateLongue, type Locale } from "@/lib/i18n";
import { MAJ_IDEES, ROUTES_IDEES } from "@/lib/pages-idees";
import { OUTILS, OUTILS_EN } from "@/lib/nav";
import { buttonVariants } from "@/components/ui/button";

/* Page du kit RH (idée 8) : deux PDF d'une page, FR et EN, produits par scripts/kit-rh.mjs dans public/kit-rh/. */
const T = " ";
export const PDF_KIT = { fr: "/kit-rh/guide-assurance-kit-rh-fr.pdf", en: "/kit-rh/guide-assurance-kit-rh-en.pdf" };
const FED = {
  lamal3: "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_3",
  lamal5: "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_5",
  lamal8: "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_8",
  olaa13: "https://www.fedlex.admin.ch/eli/cc/1983/38_38_38/fr#art_13",
  cleiss: "https://www.cleiss.fr/faq/droit_d_option_des_frontaliers_france-suisse.html",
  ge: "https://www.ge.ch/assurance-maladie-frontaliers-residant-france",
};

const TXT = {
  fr: {
    titre: "Kit RH : assurance maladie des frontaliers (PDF)",
    description: "Une fiche PDF d’une page, en français et en anglais, sur les délais d’assurance maladie des frontaliers et des nouveaux arrivants, à remettre à l’embauche.",
    h1: "Kit RH : l’assurance maladie des frontaliers et des nouveaux arrivants",
    intro: "Une fiche d’une page, en français et en anglais, à remettre aux personnes qui commencent à travailler en Suisse. Elle rappelle les deux délais de trois mois de l’assurance maladie et renvoie, par un code QR, au simulateur frontalier et au guide des nouveaux arrivants.",
    miettes: [{ name: "Accueil", href: "/" }, { name: "Entreprises", href: "/entreprises/" }, { name: "Kit RH" }] as Miette[],
    pdfFr: "Télécharger la fiche en français (PDF)",
    pdfEn: "Télécharger la fiche en anglais (PDF)",
    apercu: "Aperçu de la fiche en français",
    h2Contenu: `Que contient la fiche${T}?`,
    contenu: [
      "Pour le frontalier qui vit en France, le délai de trois mois du droit d’option entre la LAMal et l’assurance française, ce qui se passe à Genève sans réponse, et le formulaire à remplir côté français.",
      "Pour la personne qui s’installe en Suisse, le délai de trois mois pour s’affilier, la couverture rétroactive, le supplément en cas de retard et la suspension de la couverture accidents dans la LAMal grâce à la LAA de l’employeur.",
      "Deux codes QR vers le simulateur frontalier et le guide « Arriver en Suisse ». Leur adresse porte seulement la mention de la fiche (utm_source=kit-rh), sans aucun identifiant de personne ni d’entreprise.",
    ],
    rappel: "Vous cherchez aussi une assurance accidents (LAA) ou une perte de gain maladie pour votre entreprise ? Un conseiller peut vous rappeler. ",
    lienEntreprises: "Les assurances obligatoires et facultatives d’une PME sont décrites dans le guide Entreprises.",
    maj: `Mis à jour le ${dateLongue(MAJ_IDEES, "fr")}. Sources${T}: Fedlex (LAMal, OLAA), CLEISS, canton de Genève.`,
  },
  en: {
    titre: "HR kit: health insurance for cross-border staff (PDF)",
    description: "A one-page PDF in French and English on the health insurance deadlines of cross-border workers and newcomers, to hand out when you hire someone.",
    h1: "HR kit: health insurance for cross-border workers and newcomers",
    intro: "A one-page sheet, in French and English, to give to people who start working in Switzerland. It sets out the two three-month health insurance deadlines and links, with a QR code, to the cross-border calculator and the newcomers’ guide.",
    miettes: [{ name: "Home", href: "/en/" }, { name: "Business", href: "/en/business/" }, { name: "HR kit" }] as Miette[],
    pdfFr: "Download the sheet in French (PDF)",
    pdfEn: "Download the sheet in English (PDF)",
    apercu: "Preview of the English sheet",
    h2Contenu: "What is in the sheet?",
    contenu: [
      "For cross-border workers living in France: the three-month deadline of the right of option between LAMal and French insurance, what happens in Geneva without a reply, and the form to fill in on the French side.",
      "For people moving to Switzerland: the three-month deadline to enrol, retroactive cover, the surcharge for late enrolment and how accident cover in LAMal can be suspended thanks to the employer’s accident insurance (LAA).",
      "Two QR codes to the cross-border calculator and the “Moving to Switzerland” guide. Their address only says it comes from the sheet (utm_source=kit-rh), with no identifier of a person or company.",
    ],
    rappel: "Also looking for accident insurance (LAA) or sickness daily allowance cover for your company? An adviser can call you back. ",
    lienEntreprises: "The compulsory and optional insurance of a small business is described in the Business guide.",
    maj: `Updated on ${dateLongue(MAJ_IDEES, "en")}. Sources: Fedlex (LAMal, OLAA), CLEISS, canton of Geneva.`,
  },
};

const FAQ: Record<Locale, FaqOutil[]> = {
  fr: [
    {
      q: `Quel délai pour un frontalier qui vit en France${T}?`,
      a: ["Il a trois mois dès le début de son activité en Suisse pour choisir entre la LAMal et l’assurance maladie française (art. 3, al. 3, LAMal ; CLEISS). Ce choix est en principe irrévocable. À Genève, la personne qui ne renvoie pas le formulaire du Service de l’assurance-maladie dans ce délai est affiliée d’office à la LAMal."],
    },
    {
      q: `Quel délai pour une personne qui s’installe en Suisse${T}?`,
      a: ["Elle a trois mois après sa prise de domicile pour conclure l’assurance maladie de base (art. 3, al. 1, LAMal). Dans ce délai, la couverture remonte au jour de l’arrivée ; en cas de retard, elle commence à l’affiliation et un supplément de prime peut être dû (art. 5 LAMal)."],
    },
    {
      q: `Que doit faire l’employeur pour la couverture accidents${T}?`,
      a: ["Un salarié qui travaille au moins huit heures par semaine chez le même employeur est assuré par la LAA de celui-ci aussi pour les accidents non professionnels (art. 13 OLAA). Avec l’attestation de l’employeur, il peut suspendre la couverture accidents de sa prime LAMal (art. 8 LAMal)."],
      src: (
        <>
          Textes : <a href={FED.lamal3}>art. 3</a>, <a href={FED.lamal5}>5</a> et <a href={FED.lamal8}>8 LAMal</a>, <a href={FED.olaa13}>art. 13 OLAA</a>, <a href={FED.cleiss}>CLEISS</a>, <a href={FED.ge}>canton de Genève</a>.
        </>
      ),
    },
    {
      q: `Peut-on imprimer et diffuser la fiche${T}?`,
      a: ["Oui, gratuitement, sur papier ou par e-mail, à condition de ne pas modifier son contenu. La date de mise à jour figure en bas de la fiche ; la version en ligne est toujours la plus récente."],
    },
  ],
  en: [
    {
      q: "What deadline applies to a cross-border worker living in France?",
      a: ["They have three months from the start of their work in Switzerland to choose between LAMal and French health insurance (art. 3 para. 3 LAMal; CLEISS). The choice is in principle irrevocable. In Geneva, anyone who does not return the cantonal health insurance office’s form within this period is enrolled in LAMal automatically."],
    },
    {
      q: "What deadline applies to someone moving to Switzerland?",
      a: ["They have three months after taking up residence to take out basic health insurance (art. 3 para. 1 LAMal). Within this period, cover goes back to the day of arrival; if they are late, it starts on enrolment and a premium surcharge may be due (art. 5 LAMal)."],
    },
    {
      q: "What does the employer do about accident cover?",
      a: ["An employee who works at least eight hours a week for the same employer is covered by that employer’s accident insurance (LAA) for non-work accidents too (art. 13 OLAA). With the employer’s certificate, they can suspend accident cover in their LAMal premium (art. 8 LAMal)."],
      src: (
        <>
          Texts (in French): <a href={FED.lamal3}>art. 3</a>, <a href={FED.lamal5}>5</a> and <a href={FED.lamal8}>8 LAMal</a>, <a href={FED.olaa13}>art. 13 OLAA</a>, <a href={FED.cleiss}>CLEISS</a>, <a href={FED.ge}>canton of Geneva</a>.
        </>
      ),
    },
    {
      q: "Can I print and share the sheet?",
      a: ["Yes, free of charge, on paper or by e-mail, as long as its content is not changed. The update date is at the bottom of the sheet; the online version is always the most recent one."],
    },
  ],
};

export function metadataKitRh(l: Locale): Metadata {
  const t = TXT[l];
  return pageMetadata({ title: t.titre, description: t.description, path: ROUTES_IDEES.kitRh[l], locale: l, ...(l === "fr" ? { enPath: ROUTES_IDEES.kitRh.en } : { frPath: ROUTES_IDEES.kitRh.fr }) });
}

export function PageKitRh({ l }: { l: Locale }) {
  const t = TXT[l];
  const fr = l === "fr";
  const path = ROUTES_IDEES.kitRh[l];
  const autre = ROUTES_IDEES.kitRh[fr ? "en" : "fr"];
  const URL_ = abs(path);
  const doc = (lang: Locale) => ({
    "@type": "DigitalDocument",
    "@id": `${URL_}#pdf-${lang}`,
    name: lang === "fr" ? "Kit RH : frontalier ou nouvel arrivant, deux délais de trois mois" : "HR kit: cross-border worker or newcomer, two three-month deadlines",
    inLanguage: lang === "fr" ? "fr-CH" : "en",
    encodingFormat: "application/pdf",
    url: abs(PDF_KIT[lang]),
    dateModified: MAJ_IDEES,
    publisher: { "@id": ORG_ID },
  });
  const LD = graph(
    {
      "@type": "WebPage",
      "@id": `${URL_}#webpage`,
      url: URL_,
      name: t.titre,
      description: t.description,
      inLanguage: fr ? "fr-CH" : "en",
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORG_ID },
      datePublished: MAJ_IDEES,
      dateModified: MAJ_IDEES,
      breadcrumb: { "@id": `${URL_}#breadcrumb` },
      hasPart: [{ "@id": `${URL_}#pdf-fr` }, { "@id": `${URL_}#pdf-en` }],
      citation: Object.values(FED),
    },
    doc("fr"),
    doc("en"),
    breadcrumbLd(t.miettes, `${URL_}#breadcrumb`),
    { ...faqLd(faqOutilLd(FAQ[l])), "@id": `${URL_}#faq` },
  );
  return (
    <div className="page-outil page-kit">
      <JsonLd data={LD} />
      <SiteHeader current="entreprises" locale={l} altPath={autre} />
      <main id="contenu">
        <div className="wrap">
          <Breadcrumbs items={t.miettes} locale={l} />
          <h1>{t.h1}</h1>
          <p className="intro">{t.intro}</p>
          <div className="kit-grille">
            <a className="kit-apercu" href={PDF_KIT[l]}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/kit-rh/apercu-${l}.jpg`} width={794} height={1123} alt={t.apercu} loading="lazy" />
            </a>
            <div className="kit-actions">
              <a className={buttonVariants()} href={PDF_KIT[fr ? "fr" : "en"]} download>{fr ? t.pdfFr : t.pdfEn}</a>
              <a className={buttonVariants({ variant: "outline" })} href={PDF_KIT[fr ? "en" : "fr"]} download>{fr ? t.pdfEn : t.pdfFr}</a>
              <h2>{t.h2Contenu}</h2>
              <ul className="kit-contenu">
                {t.contenu.map((x) => <li key={x}>{x}</li>)}
              </ul>
              <p className="note-outil">
                <a href={fr ? "/entreprises/" : "/en/business/"}>{t.lienEntreprises}</a>{" "}
                <a href={fr ? OUTILS.simulateur : OUTILS_EN.simulateur}>{fr ? "Simulateur frontalier" : "Cross-border calculator"}</a>
                {" · "}
                <a href={fr ? "/nouveaux-arrivants/" : "/en/moving-to-switzerland/"}>{fr ? "Arriver en Suisse" : "Moving to Switzerland"}</a>
              </p>
            </div>
          </div>
          <p className="rappel-liste">
            {t.rappel}
            <LienRappel locale={l} emplacement="kit_rh" sujet="entreprises">
              <IconeTelephone size={16} />
              {fr ? "Être rappelé" : "Call me back"}
            </LienRappel>
          </p>
        </div>
        <div className="wrap faq">
          <FaqSections faq={FAQ[l]} />
          <p className="maj">{t.maj}</p>
        </div>
      </main>
      <SiteFooter locale={l} altPath={autre} note={fr ? "La fiche donne une information générale ; les textes de loi font foi." : "The sheet gives general information; the legal texts prevail."} />
    </div>
  );
}
