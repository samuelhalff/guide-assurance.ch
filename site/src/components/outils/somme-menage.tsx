"use client";
import { useEffect, useRef, useState } from "react";
import * as S from "@/lib/engines/somme-menage";
import { suivre } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n";
import { BarreOffres, CtaOffres } from "@/components/outils/cta-offres";
import { ChoixBoutons } from "@/components/controle-boutons";
import { Depliable } from "@/components/controle-depliable";
import { DEMANDE_PORTE } from "@/lib/demande-porte";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ESPACE_FINE as N } from "@/lib/nombres";

/* Calculateur de la somme d'assurance ménage : trois réponses donnent tout de suite une somme, « Affiner » ajoute les
   objets coûteux. Tout se calcule ici ; seule la somme arrondie part dans le lien « Recevoir des offres », si le
   visiteur clique. Aucune valeur saisie n'est mesurée. */
const nf = { fr: { format: (x: number) => S.formaterMontant(x, "fr") }, en: { format: (x: number) => S.formaterMontant(x, "en") } };
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
    ctaSomme: (s: string) => `pour ${s} CHF`,
    methode: "Méthode",
    montant: "Montant",
    baloise: "Grille Baloise (formulaire 140.1173, 2023)",
    zurich: "Feuille d’inventaire Zurich (ZH56108f, 2024)",
    horsGrille: "hors grille",
    detailCap: "Somme selon chaque méthode, réserve de 10 % comprise, en CHF",
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
    attente: "Indiquez le nombre de pièces et de personnes pour voir la somme.",
    attentePolice: "Répondez d’abord aux questions du calculateur, plus haut, pour comparer votre somme.",
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
    ctaSomme: (s: string) => `for CHF ${s}`,
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
    attente: "Enter the number of rooms and people to see the sum.",
    attentePolice: "First answer the calculator questions above to compare your sum.",
  },
};

export function SommeMenage({ locale }: { locale: Locale }) {
  const t = TXT[locale];
  const f = (x: number) => nf[locale].format(x);
  /* Formulaire vide au départ : le résultat attend les deux réponses personnelles ; le standard garde un défaut raisonnable. */
  const [pieces, setPieces] = useState<number | null>(null);
  const [personnes, setPersonnes] = useState<number | null>(null);
  const [standard, setStandard] = useState<S.Standard>("moyen");
  const [extras, setExtras] = useState<Record<S.Extra, string>>({ electronique: "", sport: "", loisirs: "", collections: "", divers: "" });
  const [valeurs, setValeurs] = useState("");
  const [police, setPolice] = useState("");
  const [ctaVisible, setCtaVisible] = useState(true);
  const mesure = useRef({ utilise: false, affiner: false });
  const cta = useRef<HTMLDivElement>(null);

  const nums = Object.fromEntries(S.EXTRAS.map((e) => [e.id, S.lireMontant(extras[e.id])])) as Record<S.Extra, number>;
  const e = pieces != null && personnes != null ? S.estimer({ pieces, personnes, standard, extras: nums }) : null;
  const pret = e != null;
  const ajoutes = S.totalExtras(nums);
  const v = S.lireMontant(valeurs);
  const sommePolice = S.lireMontant(police);
  const DOMMAGE = 10000;
  const href = DEMANDE_PORTE[locale]("menage-rc", e ? { somme: String(e.somme) } : undefined);

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
  }, [pret]);

  const Pastilles = <T extends string | number>({ nom, valeurs: vs, val, choisir, label, detail, classe }: { nom: string; valeurs: readonly T[]; val: T | null; choisir: (x: T) => void; label: (x: T) => React.ReactNode; detail?: (x: T) => React.ReactNode; classe: string }) => (
    <ChoixBoutons
      variante="pastille"
      className={`pastilles ${classe}`}
      name={nom}
      value={val}
      onChange={(x) => { choisir(x); toucher(); }}
      options={vs.map((x) => ({ value: x, label: label(x), detail: detail ? detail(x) : undefined }))}
    />
  );

  return (
    <>
      <div className="ph-sensitive outil outil-menage" id="outil" data-ph-mask>
        <form className="form" onSubmit={(ev) => ev.preventDefault()}>
          <Card><CardContent>
          <fieldset>
            <legend>{t.pieces}</legend>
            {Pastilles({ nom: "m-pieces", valeurs: S.PIECES, val: pieces as (typeof S.PIECES)[number] | null, choisir: setPieces, label: (x) => (x === 6 ? "6 +" : demi(x, locale)), classe: "pastilles-6" })}
            <p className="note-outil">{t.piecesAide}</p>
          </fieldset>
          <fieldset>
            <legend>{t.personnes}</legend>
            {Pastilles({ nom: "m-personnes", valeurs: S.PERSONNES, val: personnes as (typeof S.PERSONNES)[number] | null, choisir: setPersonnes, label: (x) => demi(x, locale), classe: "pastilles-6" })}
            <p className="note-outil">{t.personnesAide}</p>
          </fieldset>
          <fieldset className="dernier">
            <legend>{t.standard}</legend>
            {Pastilles({
              nom: "m-standard",
              valeurs: S.STANDARDS,
              val: standard,
              choisir: setStandard,
              label: (x) => t.standards[x][0],
              detail: (x) => t.standards[x][1],
              classe: "pastilles-3",
            })}
          </fieldset>
          </CardContent></Card>
        </form>

        <div className="apercu resultat-menage">
          <Card className="somme-menage">
            <CardContent>
              <h2>{t.resultat}</h2>
              {/* Seule ligne annoncée aux lecteurs d'écran : la somme, ou la phrase d'attente. */}
              <div aria-live="polite">
                {e ? <p className="montant">{f(e.somme)} <small>{t.chf}</small></p> : <p className="base">{t.attente}</p>}
              </div>
              {e ? (
                <>
                  <p className="base">{e.baloise == null ? t.seule(f(e.zurich)) : t.fourchette(f(e.min), f(e.max))}</p>
                  <div ref={cta}>
                    <CtaOffres locale={locale} href={href} libelle={t.cta(f(e.somme))} pleine />
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          {e ? (
            <Table variant="chiffres" className="detail-3a">
              <TableCaption className="visually-hidden">{t.detailCap}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t.methode}</TableHead>
                  <TableHead scope="col">{t.montant}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableHead scope="row">{t.baloise}</TableHead>
                  <TableCell>{e.baloise == null ? t.horsGrille : f(e.baloise)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableHead scope="row">{t.zurich}</TableHead>
                  <TableCell>{f(e.zurich)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : null}

          <Card size="sm">
          <CardContent>
          <Depliable
            className="affiner"
            titre={t.affiner}
            onOpenChange={(o) => {
              if (o && !mesure.current.affiner) {
                mesure.current.affiner = true;
                suivre("somme_menage_affiner");
              }
            }}
          >
            <p className="note-outil">{t.affinerTexte}</p>
            <div className="categories">
              {S.EXTRAS.map((x) => (
                <div className="champ" key={x.id}>
                  <label htmlFor={`m-${x.id}`}>{t.extras[x.id]}</label>
                  <Input
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
                <Input id="m-valeurs" inputMode="numeric" placeholder="0" value={valeurs} onChange={(ev) => { setValeurs(ev.target.value); toucher(); }} />
                <span className="aide">{t.valeursAide}</span>
              </div>
            </div>
            {ajoutes > 0 ? <p className="total-affine">{t.totalExtras(f(ajoutes))}</p> : null}
          </Depliable>
          </CardContent>
          </Card>

          {v > 0 ? <Alert className="valeur-a-part">{t.aPart(f(v))}</Alert> : null}

          <div className="integrite">
            <p>{t.limites}</p>
          </div>
        </div>
      </div>

      <section className="sous-assurance" id="sous-assurance">
        <h2>{t.verifTitre}</h2>
        <p>{t.verifTexte}</p>
        <Card className="verif-police ph-sensitive" data-ph-mask>
          <CardContent>
          <div className="champ champ-court">
            <label htmlFor="m-police">{t.sommePolice}</label>
            <Input id="m-police" inputMode="numeric" placeholder="60000" value={police} onChange={(ev) => setPolice(ev.target.value)} />
          </div>
          {sommePolice > 0 && !e ? <p className="note-outil reponse">{t.attentePolice}</p> : null}
          {sommePolice > 0 && e ? (
            <div className="reponse">
              <p className="sans-marge" aria-live="polite">
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
          </CardContent>
        </Card>
      </section>

      {e ? <BarreOffres locale={locale} href={href} detail={t.ctaSomme(f(e.somme))} visible={!ctaVisible} /> : null}
    </>
  );
}
