"use client";
import { useEffect, useRef, useState } from "react";
import * as S from "@/lib/engines/somme-menage";
import { suivre } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n";
import { BarreOffres, CtaOffres } from "@/components/outils/cta-offres";
import { DEMANDE_PORTE } from "@/lib/demande-porte";

/* Calculateur de la somme d'assurance ménage : trois réponses donnent tout de suite une somme, « Affiner » ajoute les
   objets coûteux. Tout se calcule ici ; seule la somme arrondie part dans le lien « Recevoir des offres », si le
   visiteur clique. Aucune valeur saisie n'est mesurée. */
const N = " ";
const nf = { fr: new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 0 }), en: new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }) };
const demi = (x: number, l: Locale) => (l === "fr" ? String(x).replace(".", ",") : String(x));

const TXT = {
  fr: {
    pieces: "Combien de pièces ?",
    piecesAide: "Le nombre indiqué sur votre bail ou l’annonce, par exemple 3,5. Au-delà de 6, ou pour une maison, choisissez 6.",
    personnes: "Combien de personnes vivent dans le ménage ?",
    personnesAide: "Vous compris. Un enfant compte pour une demi-personne : deux adultes et un enfant, c’est 2,5.",
    standard: "Comment êtes-vous meublé ?",
    standards: {
      simple: ["Simple", "kit, premier prix"],
      moyen: ["Moyen", "magasins courants"],
      eleve: ["Élevé", "design, marques"],
    } as Record<S.Standard, [string, string]>,
    resultat: "Somme d’assurance estimée",
    chf: "CHF",
    fourchette: (a: string, b: string) => `Les deux méthodes publiées donnent ${a} et ${b} CHF, réserve de 10${N}% comprise. La somme reprend la plus haute, arrondie au millier.`,
    seule: (a: string) => `Pour ce nombre de personnes, la grille Baloise n’a pas de case : seule la formule Zurich s’applique (${a} CHF, réserve de 10${N}% comprise).`,
    cta: (s: string) => `Recevoir des offres pour ${s} CHF`,
    ctaCourt: (s: string) => `Recevoir des offres · ${s} CHF`,
    methode: "Méthode",
    montant: "Montant",
    baloise: "Grille Baloise (formulaire 140.1173, 2023)",
    zurich: "Feuille d’inventaire Zurich (ZH56108f, 2024)",
    horsGrille: "hors grille",
    detailCap: "Somme selon chaque méthode, réserve de 10 % comprise, en CHF",
    affiner: "Affiner : ajouter vos objets coûteux",
    affinerTexte: "Les deux méthodes comptent déjà les meubles, l’électroménager, la vaisselle, le linge et les vêtements. Ajoutez ici, en valeur à neuf, ce que vous avez de plus : la grille Baloise les laisse de côté, et la formule Zurich n’en compte qu’une petite partie.",
    extras: {
      electronique: "Électronique (TV, ordinateurs, téléphones)",
      sport: "Sport et vélos (vélos, e-bikes, ski)",
      loisirs: "Loisirs, jardin, outils, camping",
      collections: "Livres, disques, art, antiquités",
      divers: "Cave à vin et divers",
    } as Record<S.Extra, string>,
    valeurs: "Bijoux et montres de valeur",
    valeursAide: "Comptés à part : voir ci-dessous.",
    totalExtras: (s: string) => `Objets ajoutés : ${s} CHF.`,
    aPart: (s: string) => `Bijoux et montres : ${s} CHF, non compris dans la somme. Beaucoup de contrats les plafonnent (par exemple 20${N}% de la somme et 30${N}000 CHF au plus chez Zurich et CSS). Au-delà, ils se déclarent ou s’assurent à part.`,
    limites: "Estimation tirée de deux méthodes publiées par des assureurs ; votre contrat et vos CGA font foi. Rien de ce que vous saisissez n’est envoyé.",
    verifTitre: "Votre somme actuelle suffit-elle ?",
    verifTexte: "Indiquez la somme inscrite sur votre police : le calcul la compare à l’estimation ci-dessus et montre ce que la règle proportionnelle retiendrait sur un dommage de 10 000 CHF.",
    sommePolice: "Somme d’assurance de votre police",
    dommage: "Dommage de",
    couvre: (p: string) => `Votre somme couvre environ ${p}${N}% de la valeur estimée.`,
    ok: "Elle atteint l’estimation : pas de sous-assurance à craindre sur cette base.",
    rembourse: (d: string, r: string) => `Sur un dommage de ${d} CHF, la règle proportionnelle ramènerait l’indemnité à ${r} CHF, avant franchise, si votre contrat ne prévoit pas mieux.`,
  },
  en: {
    pieces: "How many rooms?",
    piecesAide: "The number on your lease or listing, for example 3.5. Above 6, or for a house, choose 6.",
    personnes: "How many people live in your household?",
    personnesAide: "Including you. A child counts as half a person: two adults and one child make 2.5.",
    standard: "How are you furnished?",
    standards: {
      simple: ["Basic", "flat-pack, budget"],
      moyen: ["Medium", "regular shops"],
      eleve: ["High-end", "design, brands"],
    } as Record<S.Standard, [string, string]>,
    resultat: "Estimated sum insured",
    chf: "CHF",
    fourchette: (a: string, b: string) => `The two published methods give CHF ${a} and CHF ${b}, including a 10% reserve. The sum takes the higher one, rounded up to the next thousand.`,
    seule: (a: string) => `The Baloise grid has no cell for this number of people, so only the Zurich formula applies (CHF ${a}, including a 10% reserve).`,
    cta: (s: string) => `Get quotes for CHF ${s}`,
    ctaCourt: (s: string) => `Get quotes · CHF ${s}`,
    methode: "Method",
    montant: "Amount",
    baloise: "Baloise grid (form 140.1173, 2023)",
    zurich: "Zurich inventory sheet (ZH56108f, 2024)",
    horsGrille: "outside the grid",
    detailCap: "Sum under each method, including a 10% reserve, in CHF",
    affiner: "Refine: add your costly items",
    affinerTexte: "Both methods already count furniture, appliances, crockery, linen and clothes. Add here, at replacement value, what you own on top: the Baloise grid leaves these items out, and the Zurich formula only counts a small part of them.",
    extras: {
      electronique: "Electronics (TV, computers, phones)",
      sport: "Sport and bikes (bikes, e-bikes, skis)",
      loisirs: "Hobbies, garden, tools, camping",
      collections: "Books, records, art, antiques",
      divers: "Wine cellar and other items",
    } as Record<S.Extra, string>,
    valeurs: "Valuable jewellery and watches",
    valeursAide: "Counted separately: see below.",
    totalExtras: (s: string) => `Items added: CHF ${s}.`,
    aPart: (s: string) => `Jewellery and watches: CHF ${s}, not included in the sum. Many policies cap them (for example 20% of the sum and at most CHF 30,000 at Zurich and CSS). Above that, they must be declared or insured separately.`,
    limites: "Estimate based on two methods published by insurers; your policy and its general terms prevail. Nothing you type is sent.",
    verifTitre: "Is your current sum enough?",
    verifTexte: "Enter the sum shown on your policy: the calculator compares it with the estimate above and shows what the proportional rule would pay on a CHF 10,000 loss.",
    sommePolice: "Sum insured on your policy",
    dommage: "Loss of",
    couvre: (p: string) => `Your sum covers about ${p}% of the estimated value.`,
    ok: "It reaches the estimate, so on this basis you are not underinsured.",
    rembourse: (d: string, r: string) => `On a CHF ${d} loss, the proportional rule would cut the payment to CHF ${r}, before the excess, unless your policy says otherwise.`,
  },
};

export function SommeMenage({ locale }: { locale: Locale }) {
  const t = TXT[locale];
  const f = (x: number) => nf[locale].format(x);
  const [pieces, setPieces] = useState(3.5);
  const [personnes, setPersonnes] = useState(2);
  const [standard, setStandard] = useState<S.Standard>("moyen");
  const [extras, setExtras] = useState<Record<S.Extra, string>>({ electronique: "", sport: "", loisirs: "", collections: "", divers: "" });
  const [valeurs, setValeurs] = useState("");
  const [police, setPolice] = useState("");
  const [ctaVisible, setCtaVisible] = useState(true);
  const mesure = useRef({ utilise: false, affiner: false });
  const cta = useRef<HTMLDivElement>(null);

  const nums = Object.fromEntries(S.EXTRAS.map((e) => [e.id, S.lireMontant(extras[e.id])])) as Record<S.Extra, number>;
  const e = S.estimer({ pieces, personnes, standard, extras: nums });
  const ajoutes = S.totalExtras(nums);
  const v = S.lireMontant(valeurs);
  const sommePolice = S.lireMontant(police);
  const DOMMAGE = 10000;
  const href = DEMANDE_PORTE[locale]("menage-rc", { somme: String(e.somme) });

  function toucher() {
    if (!mesure.current.utilise) {
      mesure.current.utilise = true;
      suivre("somme_menage_utilise");
    }
  }

  /* Barre collante (mobile) : dès que le bouton du résultat est hors de l'écran. Elle porte la somme, qui suit chaque réponse :
     sur mobile, c'est là que le visiteur voit le résultat changer pendant qu'il répond. */
  useEffect(() => {
    const el = cta.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([x]) => setCtaVisible(x.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Pastilles = <T extends string | number>({ nom, valeurs: vs, val, choisir, label, classe }: { nom: string; valeurs: readonly T[]; val: T; choisir: (x: T) => void; label: (x: T) => React.ReactNode; classe: string }) => (
    <div className={`pastilles ${classe}`}>
      {vs.map((x) => (
        <label className="pastille" key={String(x)}>
          <input type="radio" name={nom} checked={val === x} onChange={() => { choisir(x); toucher(); }} />
          <span>{label(x)}</span>
        </label>
      ))}
    </div>
  );

  return (
    <>
      <div className="ph-sensitive outil outil-menage" id="outil" data-ph-mask>
        <form className="form" onSubmit={(ev) => ev.preventDefault()}>
          <fieldset>
            <legend>{t.pieces}</legend>
            {Pastilles({ nom: "m-pieces", valeurs: S.PIECES, val: pieces as (typeof S.PIECES)[number], choisir: setPieces, label: (x) => (x === 6 ? "6 +" : demi(x, locale)), classe: "pastilles-6" })}
            <p className="note-outil">{t.piecesAide}</p>
          </fieldset>
          <fieldset>
            <legend>{t.personnes}</legend>
            {Pastilles({ nom: "m-personnes", valeurs: S.PERSONNES, val: personnes as (typeof S.PERSONNES)[number], choisir: setPersonnes, label: (x) => demi(x, locale), classe: "pastilles-6" })}
            <p className="note-outil">{t.personnesAide}</p>
          </fieldset>
          <fieldset className="dernier">
            <legend>{t.standard}</legend>
            {Pastilles({
              nom: "m-standard",
              valeurs: S.STANDARDS,
              val: standard,
              choisir: setStandard,
              label: (x) => (
                <>
                  {t.standards[x][0]}
                  <small>{t.standards[x][1]}</small>
                </>
              ),
              classe: "pastilles-3",
            })}
          </fieldset>
        </form>

        <div className="apercu resultat-menage" aria-live="polite">
          <div className="somme-menage">
            <h2>{t.resultat}</h2>
            <p className="montant">
              {f(e.somme)} <small>{t.chf}</small>
            </p>
            <p className="base">{e.baloise == null ? t.seule(f(e.zurich)) : t.fourchette(f(e.min), f(e.max))}</p>
            <div ref={cta}>
              <CtaOffres locale={locale} href={href} libelle={t.cta(f(e.somme))} />
            </div>
          </div>

          <table className="assureurs detail-3a">
            <caption className="visually-hidden">{t.detailCap}</caption>
            <thead>
              <tr>
                <th scope="col">{t.methode}</th>
                <th scope="col">{t.montant}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{t.baloise}</th>
                <td>{e.baloise == null ? t.horsGrille : f(e.baloise)}</td>
              </tr>
              <tr>
                <th scope="row">{t.zurich}</th>
                <td>{f(e.zurich)}</td>
              </tr>
            </tbody>
          </table>

          <details
            className="affiner"
            onToggle={(ev) => {
              if ((ev.target as HTMLDetailsElement).open && !mesure.current.affiner) {
                mesure.current.affiner = true;
                suivre("somme_menage_affiner");
              }
            }}
          >
            <summary>{t.affiner}</summary>
            <p className="note-outil">{t.affinerTexte}</p>
            <div className="categories">
              {S.EXTRAS.map((x) => (
                <div className="champ" key={x.id}>
                  <label htmlFor={`m-${x.id}`}>{t.extras[x.id]}</label>
                  <input
                    className="saisie"
                    id={`m-${x.id}`}
                    inputMode="numeric"
                    placeholder="0"
                    value={extras[x.id]}
                    onChange={(ev) => { setExtras({ ...extras, [x.id]: ev.target.value }); toucher(); }}
                  />
                </div>
              ))}
              <div className="champ">
                <label htmlFor="m-valeurs">{t.valeurs}</label>
                <input className="saisie" id="m-valeurs" inputMode="numeric" placeholder="0" value={valeurs} onChange={(ev) => { setValeurs(ev.target.value); toucher(); }} />
                <span className="aide">{t.valeursAide}</span>
              </div>
            </div>
            {ajoutes > 0 ? <p className="total-affine">{t.totalExtras(f(ajoutes))}</p> : null}
          </details>

          {v > 0 ? <p className="valeur-a-part">{t.aPart(f(v))}</p> : null}

          <div className="integrite">
            <p>{t.limites}</p>
          </div>
        </div>
      </div>

      <section className="sous-assurance" id="sous-assurance">
        <h2>{t.verifTitre}</h2>
        <p>{t.verifTexte}</p>
        <div className="verif-police ph-sensitive" data-ph-mask>
          <div className="champ champ-court">
            <label htmlFor="m-police">{t.sommePolice}</label>
            <input className="saisie" id="m-police" inputMode="numeric" placeholder="60000" value={police} onChange={(ev) => setPolice(ev.target.value)} />
          </div>
          {sommePolice > 0 ? (
            <div className="reponse" aria-live="polite">
              <p style={{ margin: 0 }}>
                <b>{t.couvre(f(Math.round(S.tauxCouverture(sommePolice, e.somme) * 100)))}</b>
              </p>
              <span className="jauge" aria-hidden="true">
                <span style={{ width: `${Math.round(S.tauxCouverture(sommePolice, e.somme) * 100)}%` }} />
              </span>
              <p style={{ margin: "var(--s2) 0 0" }}>
                {sommePolice >= e.somme ? t.ok : t.rembourse(f(DOMMAGE), f(Math.round(S.indemniteProportionnelle(sommePolice, e.somme, DOMMAGE))))}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <BarreOffres locale={locale} href={href} libelle={t.ctaCourt(f(e.somme))} visible={!ctaVisible} />
    </>
  );
}
