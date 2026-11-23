"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as F from "@/lib/engines/frontaliers";
import primes from "@/data/primes-eu-fr-2027.json";
import type { Locale } from "@/lib/i18n";
import { suivre } from "@/lib/analytics";
import { Case, ChoixBoutons, Depliable } from "@/components/controles";
import { CtaDemande } from "@/components/demande/cta-demande";
import { TEXTE_CTA, ecrirePreremplissage, lienDemande } from "@/lib/demande";

/* Simulateur frontalier : le foyer se décrit personne par personne, comme dans le comparateur de primes
   (comparateur-primes.tsx). Calcul : src/lib/engines/frontaliers.ts (comparerFoyer). Résultat instantané, sans bouton.
   Tout reste dans le navigateur : aucune saisie n'est envoyée ni mise dans l'adresse, la mesure ne reçoit qu'un événement
   « simulateur_utilise » sans valeur. Les primes sont triées par montant, seul critère affiché (docs/decisions.md §0 bis). */
const D = primes as unknown as F.DonneesPrimes;
const NB = " ";
const T = " ";
const ANNEE = 2027;
const MAX_PERSONNES = 6;
/* Nombres formatés sans Intl : l'ICU de Node (build) et celle du navigateur diffèrent pour fr-CH (apostrophe ou
   espace fine), ce qui casse l'hydratation (erreur React 418). FR : espace fine et virgule ; EN : virgule et point. */
const grouper = (x: number, d: number, mille: string, dec: string) => {
  const v = Number.isFinite(x) ? x : 0;
  const [e, f] = Math.abs(v).toFixed(d).split(".");
  const s = e.replace(/\B(?=(\d{3})+(?!\d))/g, mille) + (f ? dec + f : "");
  return v < 0 && Number(Math.abs(v).toFixed(d)) !== 0 ? `-${s}` : s;
};
const nfFr = (x: number, d = 0) => grouper(x, d, T, ",");
const nfEn = (x: number, d = 0) => grouper(x, d, ",", ".");

type PersonneUI = { id: number; enfant: boolean; naissance: string; situation: F.Situation; revenu: string; moinsDe8h: boolean };
type SituationUI = F.Situation;
const SITUATIONS: SituationUI[] = ["sans", "suisse", "france", "autre"];

const TXT = {
  fr: {
    etape: "Où en êtes-vous ?",
    commence: "Je commence en Suisse",
    commenceAide: "ou je reprends après un chômage en France",
    fait: "J’ai déjà choisi",
    faitAide: "le résultat est alors indicatif",
    foyer: "Votre foyer",
    foyerAide: "Ajoutez chaque personne qui vit avec vous. Le calcul suit chaque changement.",
    vous: "Vous, frontalier",
    adulte: (n: number) => `Adulte ${n}`,
    enfant: (n: number) => `Enfant ${n}`,
    retirer: "Retirer",
    naissance: "Année de naissance",
    revenu: "Revenus 2025 (€)",
    revenuAide: "Salaires nets et autres revenus de 2025, ceux que vous déclarez à l’Urssaf.",
    quelMontant: "Quel montant indiquer ?",
    quelMontantTexte:
      "La cotisation 2027 se calcule sur les revenus de 2025 que vous déclarez à l’Urssaf, catégorie par catégorie : salaires nets, puis revenus fonciers, capitaux mobiliers, plus-values et pensions. Le revenu fiscal de référence de votre avis d’impôt 2026 sert de contrôle. Le calcul suit la méthode du",
    simulateurUrssaf: "simulateur public de l’Urssaf",
    moins8h: "Moins de 8 heures par semaine chez son employeur",
    moins8hAide: "Sinon, l’assurance accidents de l’employeur couvre les accidents et la prime LAMal se calcule sans accident.",
    situation: "Situation",
    situations: { sans: "Sans activité", suisse: "Travaille en Suisse", france: "Travaille en France", autre: "Autre cas" } as Record<SituationUI, string>,
    notes: {
      sans: "Elle suit votre choix : une prime chez le même assureur avec la LAMal, aucune cotisation avec l’assurance française.",
      suisse: "Elle a son propre droit d’option et déclare ses revenus à part. Le simulateur suppose que vous choisissez tous les deux le même système.",
      france: "Elle relève du régime français, comme les enfants du foyer, qui y sont rattachés en priorité.",
      autre: "À son compte, au chômage ou à la retraite, son affiliation dépend de sa situation. Elle n’est pas comptée ici.",
    } as Record<SituationUI, string>,
    ajouterAdulte: "Un adulte",
    ajouterEnfant: "Un enfant",
    verifier: "Indiquez une année à quatre chiffres.",
    classe: { adulte: "tarif adulte en 2027", jeune: "tarif jeune adulte (19 à 25 ans) en 2027", enfant: "tarif enfant (18 ans ou moins) en 2027" } as Record<F.Classe, string>,
    change: "Taux de change",
    changeLabel: "1 euro vaut (en francs)",
    changeAide: "Taux retenu au 22.11.2026, que vous pouvez changer. Chaque montant reste aussi donné dans sa monnaie d’origine.",
    resultat: "Ce que paierait votre foyer en 2027",
    france: "Assurance maladie française",
    lamal: "LAMal",
    parAn: "par an",
    environ: "≈",
    enEuros: (an: string, mois: string, cot: string) => `Soit ${an} par an (${mois} par mois), ${cot}.`,
    cotisations: (n: number) => (n > 1 ? `${n} cotisations, une par frontalier` : "votre seule cotisation"),
    des: "dès",
    mediane: (x: string, max: string, n: number) => `Prime médiane ${x}, la plus haute ${max}${n > 1 ? ", tout le foyer chez le même assureur" : ""}.`,
    attente: "Indiquez votre année de naissance et vos revenus pour voir le résultat.",
    verdictPlus: (x: string) => `Pour ce foyer, la LAMal coûte au moins ${x} de plus par an que l’assurance française, même avec la prime la plus basse de la liste.`,
    verdictMixte: (a: string, b: string) => `Avec la prime la plus basse, la LAMal coûte ${a} de moins par an que l’assurance française ; avec une prime médiane, ${b} de plus.`,
    verdictMoins: (x: string) => `Pour ce foyer, la LAMal coûte ${x} de moins par an, même avec une prime médiane.`,
    dejaChoisi:
      "Comme vous avez déjà choisi, ce comparatif est indicatif. Le choix ne se refait qu’en cas de nouvelle première activité en Suisse, de reprise après un régime étranger, d’installation en France ou de passage à la retraite.",
    qui: "Qui est compté",
    quiLamal: "Avec la LAMal, une prime pour :",
    accidentOui: "avec accident",
    accidentNon: "sans accident",
    quiFrance: (n: number, proches: boolean) =>
      `Avec l’assurance française, le foyer paie ${n > 1 ? `${n} cotisations, une par frontalier` : "votre cotisation"}${proches ? ", et les proches sans activité sont rattachés sans frais" : ""}.`,
    horsChoix: (l: string) => `Dans les deux cas, ces personnes sont assurées en France par l’activité d’un adulte du foyer${T}: ${l}.`,
    horsCalcul: (l: string) => `Non compté, car son affiliation dépend de sa situation${T}: ${l}.`,
    provisoire: (l: string) => `Chiffres 2027 provisoires côté français${T}: ${l}.`,
    caption: (n: number) => `Primes LAMal 2027 du foyer chez chacun des ${n} assureurs, triées de la plus basse à la plus haute.`,
    thAssureur: "Assureur",
    thMois: "CHF / mois",
    thAn: "CHF / an",
    source:
      "Sources : OFSP, primes 2027 des assurés résidant en France (Prämien_EU), opendata.swiss, mise à jour du 29.09.2026 ; Urssaf, cotisation maladie des frontaliers (page mise à jour le 24.09.2026). Franchise de 300 CHF, la seule possible pour un résident en France (art. 101a OAMal). Une seule prime par assureur pour toute la France : le département de résidence ne change pas le calcul.",
    barre: (fr: string, ch: string) => `France ≈ ${fr} · LAMal dès ${ch}`,
    voirResultat: "Voir le résultat",
  },
  en: {
    ctaHaut: "Get help with my choice",
    etape: "Where are you now?",
    commence: "I am starting in Switzerland",
    commenceAide: "or returning to work after unemployment in France",
    fait: "I have already chosen",
    faitAide: "the result is then only indicative",
    foyer: "Your household",
    foyerAide: "Add each person who lives with you. The result follows every change.",
    vous: "You, cross-border worker",
    adulte: (n: number) => `Adult ${n}`,
    enfant: (n: number) => `Child ${n}`,
    retirer: "Remove",
    naissance: "Year of birth",
    revenu: "2025 income (€)",
    revenuAide: "Net salaries and other 2025 income, as declared to Urssaf.",
    quelMontant: "Which amount should you enter?",
    quelMontantTexte:
      "The 2027 contribution is calculated on the 2025 income you declare to Urssaf, category by category: net salaries, then property income, investment income, capital gains and pensions. The reference tax income (revenu fiscal de référence) on your 2026 tax notice is a check. The calculation follows the method of the",
    simulateurUrssaf: "Urssaf public calculator",
    moins8h: "Works less than 8 hours a week for their employer",
    moins8hAide: "Otherwise, the employer’s accident insurance covers accidents and the LAMal premium is calculated without accident cover.",
    situation: "Situation",
    situations: { sans: "Not working", suisse: "Works in Switzerland", france: "Works in France", autre: "Other case" } as Record<SituationUI, string>,
    notes: {
      sans: "They follow your choice: a premium with the same insurer under LAMal, no contribution under French health insurance.",
      suisse: "They have their own right of option and declare their income separately. The calculator assumes you both choose the same system.",
      france: "They are covered by the French system, like the household’s children, who are attached to it first.",
      autre: "Self-employed, unemployed or retired: their cover depends on their situation, so they are not counted here.",
    } as Record<SituationUI, string>,
    ajouterAdulte: "An adult",
    ajouterEnfant: "A child",
    verifier: "Enter a four-digit year.",
    classe: { adulte: "adult rate in 2027", jeune: "young adult rate (19 to 25) in 2027", enfant: "child rate (18 or under) in 2027" } as Record<F.Classe, string>,
    change: "Exchange rate",
    changeLabel: "1 euro is worth (in francs)",
    changeAide: "Rate assumed on 22.11.2026, which you can change. Each amount is also shown in its original currency.",
    resultat: "What your household would pay in 2027",
    france: "French health insurance",
    lamal: "LAMal",
    parAn: "per year",
    environ: "≈",
    enEuros: (an: string, mois: string, cot: string) => `That is ${an} a year (${mois} a month), ${cot}.`,
    cotisations: (n: number) => (n > 1 ? `${n} contributions, one per cross-border worker` : "your contribution alone"),
    des: "from",
    mediane: (x: string, max: string, n: number) => `Median premium ${x}, highest ${max}${n > 1 ? ", whole household with the same insurer" : ""}.`,
    attente: "Enter your year of birth and your income to see the result.",
    verdictPlus: (x: string) => `For this household, LAMal costs at least ${x} more per year than French health insurance, even with the lowest premium on the list.`,
    verdictMixte: (a: string, b: string) => `With the lowest premium, LAMal costs ${a} less per year than French health insurance; with a median premium, ${b} more.`,
    verdictMoins: (x: string) => `For this household, LAMal costs ${x} less per year, even with a median premium.`,
    dejaChoisi:
      "As you have already chosen, this comparison is only an indication. The choice can be made again only if you start a new first job in Switzerland, return to work after a foreign scheme, move to France or retire.",
    qui: "Who is counted",
    quiLamal: "With LAMal, one premium for:",
    accidentOui: "with accident cover",
    accidentNon: "without accident cover",
    quiFrance: (n: number, proches: boolean) =>
      `With French health insurance, the household pays ${n > 1 ? `${n} contributions, one per cross-border worker` : "your contribution"}${proches ? ", and relatives not in paid work are attached at no cost" : ""}.`,
    horsChoix: (l: string) => `In both cases, these people are covered in France through an adult’s work in France: ${l}.`,
    horsCalcul: (l: string) => `Not counted, because their cover depends on their situation: ${l}.`,
    provisoire: (l: string) => `Provisional 2027 figures on the French side: ${l}.`,
    caption: (n: number) => `2027 LAMal premiums for the household with each of the ${n} insurers, sorted from lowest to highest.`,
    thAssureur: "Insurer",
    thMois: "CHF / month",
    thAn: "CHF / year",
    source:
      "Sources: FOPH (OFSP), 2027 premiums for insured persons living in France (Prämien_EU), opendata.swiss, update of 29.09.2026; Urssaf, health contribution for cross-border workers (page updated on 24.09.2026). Deductible of CHF 300, the only one possible for a resident of France (art. 101a OAMal). Each insurer has a single premium for the whole of France, so your département does not change the calculation.",
    barre: (fr: string, ch: string) => `France ≈ ${fr} · LAMal from ${ch}`,
    voirResultat: "See the result",
  },
};

const QUI_EN = (q: string) => (q === "Vous" ? "You" : q.replace(/^Adulte (\d+)$/, "Adult $1").replace(/^Enfant (\d+)$/, "Child $1"));
const PROVISOIRE_EN: Record<string, string> = {
  "taux 2027 non confirmé tant que la LFSS 2027 n’est pas votée": "2027 rate not confirmed until the French 2027 social security financing act (LFSS) is passed",
  "PASS 2027 annoncé, arrêté à paraître": "2027 social security ceiling (PASS) announced, decree still to be published",
};

const lireNombre = (s: string) => {
  const v = parseFloat(String(s).replace(/[\s  ']/g, "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};

function Pastilles<V extends string>({ nom, valeurs, val, choisir, label, classe = "" }: {
  nom: string; valeurs: readonly V[]; val: V; choisir: (x: V) => void; label: (x: V) => React.ReactNode; classe?: string;
}) {
  return (
    <ChoixBoutons
      name={nom}
      variante="pastille"
      className={`pastilles ${classe}`}
      value={val}
      onChange={choisir}
      options={valeurs.map((x) => ({ value: x, label: label(x) }))}
    />
  );
}

export function SimulateurFrontalier({ locale = "fr" }: { locale?: Locale }) {
  const isEn = locale === "en";
  const t = TXT[locale];
  const nf = isEn ? nfEn : nfFr;
  const chf = (x: number) => (isEn ? `CHF${NB}${nf(x)}` : `${nf(x)}${NB}CHF`);
  const eur = (x: number) => (isEn ? `€${nf(x)}` : `${nf(x)}${NB}€`);
  const qui = (q: string) => (isEn ? QUI_EN(q) : q);

  const [etape, setEtape] = useState<"ouvert" | "fait">("ouvert");
  const [personnes, setPersonnes] = useState<PersonneUI[]>([{ id: 1, enfant: false, naissance: "", situation: "suisse", revenu: "", moinsDe8h: false }]);
  const [tx, setTx] = useState("0.93");
  const [barre, setBarre] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const resultatRef = useRef<HTMLElement>(null);

  const maj = (id: number, ch: Partial<PersonneUI>) => setPersonnes((cur) => cur.map((p) => (p.id === id ? { ...p, ...ch } : p)));
  const ajouter = (enfant: boolean) =>
    setPersonnes((cur) => (cur.length >= MAX_PERSONNES ? cur : [...cur, { id: Math.max(...cur.map((x) => x.id)) + 1, enfant, naissance: "", situation: "sans", revenu: "", moinsDe8h: false }]));

  /* Années valides seulement : une personne en cours de saisie n'est pas comptée, le reste du foyer reste affiché. */
  const lues = personnes.map((p) => {
    const annee = parseInt(p.naissance, 10);
    const ok = p.naissance.length === 4 && annee >= 1920 && annee <= ANNEE;
    return { ...p, annee, ok, cl: ok ? F.classe(annee, ANNEE) : null };
  });
  const valides = lues.filter((p) => p.ok);
  /* Résultat seulement quand le visiteur a donné son année et ses revenus : aucun chiffre pour un profil qui n’est pas le sien. */
  const pret = lues[0].ok && lues[0].revenu.trim() !== "";

  const c = useMemo(
    () =>
      pret
        ? F.comparerFoyer(D, {
            annee: ANNEE,
            tauxEurChf: lireNombre(tx) || 1,
            personnes: valides.map((p) => ({ naissance: p.annee, enfant: p.enfant, situation: p.situation, revenu: lireNombre(p.revenu), moinsDe8h: p.moinsDe8h })),
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pret, tx, JSON.stringify(valides)],
  );

  /* Mesure : un seul événement, au premier changement de saisie (aucune valeur n'est envoyée). */
  const monte = useRef(false);
  const suivi = useRef(false);
  useEffect(() => {
    if (!monte.current) { monte.current = true; return; }
    if (!suivi.current) { suivi.current = true; suivre("simulateur_utilise"); }
  }, [personnes, tx, etape]);

  /* Barre collante (mobile) : dès que le bouton du résultat est hors de l'écran ; elle porte les deux montants, qui suivent
     chaque saisie, pour que le résultat reste visible pendant qu'on remplit le formulaire. */
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([x]) => setBarre(!x.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [pret]);

  function prerempli() {
    const p1 = lues[0];
    ecrirePreremplissage({
      porte: "frontaliers",
      ...(p1.ok ? { birthYear: p1.annee } : {}),
      householdSize: Math.min(4, Math.max(1, valides.length)),
    });
  }

  const nAdulte = (k: number) => lues.slice(0, k + 1).filter((p, i) => i === 0 || !p.enfant).length;
  const nEnfant = (k: number) => lues.slice(0, k + 1).filter((p, i) => i > 0 && p.enfant).length;

  let verdict = "";
  if (c) {
    const e = c.ecart.min, m = c.ecart.mediane;
    verdict = e > 0 ? t.verdictPlus(chf(e)) : m > 0 ? t.verdictMixte(chf(-e), chf(m)) : t.verdictMoins(chf(-m));
  }
  const nF = c?.france.detail.length ?? 0;
  const mx = c?.lamal.max ?? 1;
  const provisoires = c?.france.detail[0]?.provisoire ?? [];

  return (
    <>
      <div className="cta-haut-outil">
        <a className="bouton" href={lienDemande(locale, "frontaliers")} onClick={prerempli}>
          {TEXTE_CTA[locale].bouton}
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
        </a>
        <p>{TEXTE_CTA[locale].rassurance}</p>
      </div>

      <div className="ph-sensitive outil outil-simulateur outil-frontalier" data-ph-mask>
        <form ref={formRef} className="form" onSubmit={(ev) => ev.preventDefault()} noValidate>
          <fieldset>
            <legend>{t.etape}</legend>
            <Pastilles
              nom="sf-etape"
              classe="pastilles-2 pastilles-texte"
              valeurs={["ouvert", "fait"] as const}
              val={etape}
              choisir={setEtape}
              label={(x) => (x === "ouvert" ? <>{t.commence}<small>{t.commenceAide}</small></> : <>{t.fait}<small>{t.faitAide}</small></>)}
            />
          </fieldset>

          <fieldset>
            <legend>{t.foyer}</legend>
            <p className="note-outil foyer-aide">{t.foyerAide}</p>
            {lues.map((p, k) => {
              const titre = k === 0 ? t.vous : p.enfant ? t.enfant(nEnfant(k)) : t.adulte(nAdulte(k));
              const frontalier = k === 0 || (!p.enfant && p.situation === "suisse");
              return (
                <fieldset className="personne" key={p.id}>
                  <legend>
                    {titre}
                    {k > 0 ? (
                      <button type="button" className="retirer" onClick={() => setPersonnes((cur) => cur.filter((x) => x.id !== p.id))}>
                        {t.retirer}
                      </button>
                    ) : null}
                  </legend>
                  <div className="ligne">
                    <div className="champ">
                      <label htmlFor={`sf-n-${p.id}`}>{t.naissance}</label>
                      <input
                        className="saisie"
                        id={`sf-n-${p.id}`}
                        inputMode="numeric"
                        maxLength={4}
                        placeholder={p.enfant ? "2016" : "1988"}
                        value={p.naissance}
                        aria-describedby={`sf-cl-${p.id}`}
                        onChange={(e) => maj(p.id, { naissance: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      />
                    </div>
                    {frontalier ? (
                      <div className="champ">
                        <label htmlFor={`sf-r-${p.id}`}>{t.revenu}</label>
                        <input
                          className="saisie"
                          id={`sf-r-${p.id}`}
                          inputMode="numeric"
                          placeholder="55000"
                          value={p.revenu}
                          onChange={(e) => maj(p.id, { revenu: e.target.value.replace(/[^\d\s']/g, "").slice(0, 9) })}
                        />
                      </div>
                    ) : null}
                  </div>
                  <p className="note-outil classe" id={`sf-cl-${p.id}`} role="status">
                    {p.cl ? t.classe[p.cl] : p.naissance.length ? t.verifier : frontalier ? t.revenuAide : NB}
                  </p>
                  {k === 0 ? (
                    <Depliable className="aide-revenus" titre={t.quelMontant}>
                      <p>
                        {t.quelMontantTexte}{" "}
                        <a href="https://mon-entreprise.urssaf.fr/simulateurs/cotisation-maladie-frontalier-suisse" rel="noopener">{t.simulateurUrssaf}</a>.
                      </p>
                    </Depliable>
                  ) : null}
                  {k > 0 && !p.enfant ? (
                    <>
                      <p className="sous-q">{t.situation}</p>
                      <Pastilles
                        nom={`sf-s-${p.id}`}
                        classe="pastilles-4"
                        valeurs={SITUATIONS}
                        val={p.situation}
                        choisir={(x) => maj(p.id, { situation: x })}
                        label={(x) => t.situations[x]}
                      />
                      <p className={p.situation === "autre" ? "provisoire" : "note-outil"}>{t.notes[p.situation]}</p>
                    </>
                  ) : null}
                  {frontalier ? (
                    <Case checked={p.moinsDe8h} onChange={(c) => maj(p.id, { moinsDe8h: c })}>
                      {t.moins8h}<small>{t.moins8hAide}</small>
                    </Case>
                  ) : null}
                </fieldset>
              );
            })}
            {personnes.length < MAX_PERSONNES ? (
              <div className="ajouts">
                <button type="button" className="ajouter-personne" onClick={() => ajouter(false)} aria-label={isEn ? "Add an adult" : "Ajouter un adulte"}>+ {t.ajouterAdulte}</button>
                <button type="button" className="ajouter-personne" onClick={() => ajouter(true)} aria-label={isEn ? "Add a child" : "Ajouter un enfant"}>+ {t.ajouterEnfant}</button>
              </div>
            ) : null}
          </fieldset>

          <fieldset className="dernier">
            <Depliable className="taux-change" titre={<>{t.change}{isEn ? ": " : `${T}: `}{tx.replace(".", isEn ? "." : ",")}</>}>
              <div className="champ">
                <label htmlFor="sf-tx">{t.changeLabel}</label>
                <input className="saisie" id="sf-tx" inputMode="decimal" value={tx} onChange={(e) => setTx(e.target.value.replace(",", ".").replace(/[^\d.]/g, "").slice(0, 5))} />
                <span className="aide">{t.changeAide}</span>
              </div>
            </Depliable>
          </fieldset>
        </form>

        <section className="apercu" aria-live="polite" ref={resultatRef}>
          <h2 className="titre-resultat">{t.resultat}</h2>
          {!c ? (
            <p className="attente">{t.attente}</p>
          ) : (
            <>
              <div className="duel duel-serre">
                <div className="duel-option">
                  <h3>{t.france}</h3>
                  <div className="prix"><small className="des">{t.environ}</small> {chf(c.france.chf)} <small>{t.parAn}</small></div>
                  <p>{t.enEuros(eur(c.france.eur), eur(c.france.mensuelEur), t.cotisations(nF))}</p>
                </div>
                <div className="duel-option">
                  <h3>{t.lamal}</h3>
                  <div className="prix"><small className="des">{t.des}</small> {chf(Math.round(c.lamal.min * 12))} <small>{t.parAn}</small></div>
                  <p>{t.mediane(chf(Math.round(c.lamal.mediane * 12)), chf(Math.round(c.lamal.max * 12)), c.assuresCH.length)}</p>
                </div>
              </div>
              {etape === "fait" ? <p className="provisoire">{t.dejaChoisi}</p> : null}
              <p className="verdict">{verdict}</p>
              <div ref={ctaRef}>
                <CtaDemande locale={locale} porte="frontaliers" emplacement="frontalier" onClick={prerempli} />
              </div>

              <div className="qui">
                <h3>{t.qui}</h3>
                <p>{t.quiLamal}</p>
                <ul>
                  {c.assuresCH.map((p) => (
                    <li key={p.qui}>
                      {qui(p.qui)} ({t.classe[p.classe]}){p.role === "frontalier" ? `, ${p.accident ? t.accidentOui : t.accidentNon}` : ""}
                    </li>
                  ))}
                </ul>
                <p>{t.quiFrance(nF, c.assuresCH.length > nF)}</p>
                {c.horsChoix.length ? <p>{t.horsChoix(c.horsChoix.map((p) => qui(p.qui)).join(", "))}</p> : null}
                {c.horsCalcul.length ? <p>{t.horsCalcul(c.horsCalcul.map((p) => qui(p.qui)).join(", "))}</p> : null}
              </div>
              {provisoires.length ? <p className="provisoire">{t.provisoire(provisoires.map((x) => (isEn ? PROVISOIRE_EN[x] ?? x : x)).join(isEn ? "; " : `${T}; `))}</p> : null}

              <table className="assureurs">
                <caption>{t.caption(c.lamal.liste.length)}</caption>
                <thead>
                  <tr><th scope="col">{t.thAssureur}</th><th scope="col">{t.thMois}</th><th scope="col">{t.thAn}</th></tr>
                </thead>
                <tbody>
                  {c.lamal.liste.map((r) => (
                    <tr key={r.no}>
                      <td>{r.nom}<span className="barre" style={{ width: `${Math.round((r.mensuel / mx) * 100)}%` }} /></td>
                      <td>{nf(r.mensuel, 2)}</td>
                      <td>{nf(Math.round(r.annuel))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="source-outil">{t.source}</p>
            </>
          )}
        </section>
      </div>

      {c ? (
        <div className="barre-demande barre-frontalier" data-visible={barre || undefined} aria-hidden={!barre} inert={!barre}>
          <button type="button" className="barre-resume" onClick={() => resultatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} aria-label={t.voirResultat}>
            {t.barre(chf(c.france.chf), chf(Math.round(c.lamal.min * 12)))}
          </button>
          <a className="bouton" href={lienDemande(locale, "frontaliers")} onClick={prerempli}>{TEXTE_CTA[locale].bouton}</a>
        </div>
      ) : null}
    </>
  );
}
