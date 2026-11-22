"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as F from "@/lib/engines/frontaliers";
import primes from "@/data/primes-eu-fr-2027.json";
import type { Locale } from "@/lib/i18n";
import { suivre } from "@/lib/analytics";
import { CtaDemande } from "@/components/demande/cta-demande";
import { ecrirePreremplissage } from "@/lib/demande";

/* Simulateur frontalier : interface de mockups/v2/simulateur-frontalier.html, calcul par src/lib/engines/frontaliers.ts.
   Tout reste dans le navigateur : aucune saisie n'est envoyée ni mise dans l'adresse. */
const D = primes as unknown as F.DonneesPrimes;
const NB = " ";
const nfFr = (x: number, d = 0) =>
  new Intl.NumberFormat("fr-CH", { minimumFractionDigits: d, maximumFractionDigits: d }).format(x).replace(/\s/g, NB);
const nfEn = (x: number, d = 0) => new Intl.NumberFormat("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d }).format(x);
const CL_FR: Record<F.Classe, string> = { adulte: "26 ans et plus", jeune: "19 à 25 ans", enfant: "moins de 19 ans" };

type StatutUI = "aucun" | "sans" | "france" | "suisse" | "autre";
const NOTES_FR: Record<StatutUI, string> = {
  aucun: "",
  sans: "Il suit votre choix. Avec la LAMal, il paie une prime chez le même assureur ; avec l’assurance française, il y est rattaché sans cotisation.",
  france: "Il relève du régime français, et vos enfants y sont rattachés en priorité, quel que soit votre choix.",
  suisse:
    "Il a son propre droit d’option et déclare ses revenus séparément. Le simulateur compare les deux cas où vous choisissez le même système, mais chacun peut aussi choisir un système différent.",
  autre:
    "Ce cas n’est pas calculé, car son affiliation dépend de sa situation. Le résultat ne compte que vous et vos enfants, et votre situation mérite d’être vérifiée.",
};

/* Version anglaise (/en/cross-border-calculator/). Les libellés produits par le moteur (Vous, Enfant 1, chiffres
   provisoires) sont traduits ici, sans toucher au moteur. */
const CL_EN: Record<F.Classe, string> = { adulte: "aged 26 and over", jeune: "aged 19 to 25", enfant: "under 19" };
const NOTES_EN: Record<StatutUI, string> = {
  aucun: "",
  sans: "They follow your choice. With LAMal, they pay a premium with the same insurer; with French health insurance, they are covered as a dependant with no contribution.",
  france: "They are covered by the French system, and your children are attached to it first, whatever you choose.",
  suisse:
    "They have their own right of option and declare their income separately. The calculator compares the two cases where you both choose the same system, although each of you can choose a different one.",
  autre:
    "This case is not calculated, because their cover depends on their situation. The result counts only you and your children, and your situation is worth checking.",
};
const QUI_EN = (q: string) => (q === "Vous" ? "You" : q === "Votre conjoint" ? "Your spouse or partner" : q.replace(/^Enfant (\d+)$/, "Child $1"));
const PROVISOIRE_EN: Record<string, string> = {
  "taux 2027 non confirmé tant que la LFSS 2027 n’est pas votée": "2027 rate not confirmed until the French 2027 social security financing act (LFSS) is passed",
  "PASS 2027 annoncé, arrêté à paraître": "2027 social security ceiling (PASS) announced, decree still to be published",
};

const num = (s: string) => {
  const v = parseFloat(String(s).replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};

function Champ({ id, label, value, onChange, aide, placeholder, ...rest }: {
  id: string; label: string; value: string; onChange: (v: string) => void; aide?: string; placeholder?: string;
  min?: number; max?: number; step?: number | string; inputMode?: "numeric" | "decimal";
}) {
  return (
    <div className="champ">
      <label htmlFor={id}>{label}</label>
      <input className="saisie" type="number" id={id} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} inputMode={rest.inputMode ?? "numeric"} min={rest.min} max={rest.max} step={rest.step} />
      {aide ? <span className="aide">{aide}</span> : null}
    </div>
  );
}

export function SimulateurFrontalier({ locale = "fr" }: { locale?: Locale }) {
  const isEn = locale === "en";
  const nf = isEn ? nfEn : nfFr;
  const chf = (x: string) => (isEn ? `CHF${NB}${x}` : `${x}${NB}CHF`);
  const CL = isEn ? CL_EN : CL_FR;
  const NOTES = isEn ? NOTES_EN : NOTES_FR;
  const qui = (q: string) => (isEn ? QUI_EN(q) : q);
  const [etape, setEtape] = useState<"ouvert" | "fait">("ouvert");
  const [n1, setN1] = useState("1985");
  const [r1, setR1] = useState("60000");
  const [a1, setA1] = useState("0");
  const [h1, setH1] = useState(false);
  const [cj, setCj] = useState<StatutUI>("sans");
  /* Mesure : un seul événement, au premier changement de saisie (aucune valeur saisie n'est envoyée). */
  const monte = useRef(false);
  const suivi = useRef(false);
  useEffect(() => {
    if (!monte.current) { monte.current = true; return; }
    if (!suivi.current) { suivi.current = true; suivre("simulateur_utilise"); }
  }, [n1, r1, a1, h1, cj]);
  const [n2, setN2] = useState("1987");
  const [r2, setR2] = useState("50000");
  const [h2, setH2] = useState(false);
  const [enfants, setEnfants] = useState<string[]>(["2015", "2018"]);
  const [tx, setTx] = useState("0.93");

  function nbEnfants(n: number) {
    setEnfants((cur) => {
      const out = cur.slice(0, n);
      while (out.length < n) out.push(String(2012 + (out.length + 1) * 3));
      return out;
    });
  }

  const c = useMemo(
    () =>
      F.comparer(D, {
        annee: 2027,
        tauxEurChf: num(tx) || 1,
        frontalier: { naissance: num(n1), assiette: num(r1), autres: num(a1), moinsDe8h: h1 },
        conjoint: { statut: cj === "autre" ? "aucun" : cj, naissance: num(n2), assiette: num(r2), moinsDe8h: h2 },
        enfants: enfants.map((e) => num(e)),
      }),
    [tx, n1, r1, a1, h1, cj, n2, r2, h2, enfants],
  );

  const nC = c.assuresCH.length;
  const nF = c.france.detail.length;
  const e = c.ecart.min;
  const m = c.ecart.mediane;
  const verdict =
    e > 0
      ? (isEn ? `For this household, LAMal costs at least ${chf(nf(e))} more per year than French health insurance, even with the lowest premium on the list.` : `Pour ce foyer, la LAMal coûte au moins ${nf(e)}${NB}CHF de plus par an que l’assurance française, même avec la prime la plus basse de la liste.`)
      : m > 0
        ? (isEn ? `With the lowest premium, LAMal costs ${chf(nf(-e))} less per year; with a median premium, it costs ${chf(nf(m))} more.` : `Avec la prime la plus basse, la LAMal coûte ${nf(-e)}${NB}CHF de moins par an ; avec une prime médiane, elle coûte ${nf(m)}${NB}CHF de plus.`)
        : (isEn ? `For this household, LAMal costs ${chf(nf(-m))} less per year, even with a median premium.` : `Pour ce foyer, la LAMal coûte ${nf(-m)}${NB}CHF de moins par an, même avec une prime médiane.`);
  const mx = c.lamal.max;

  return (
    <div className="outil outil-simulateur">
      <form className="form" onSubmit={(ev) => ev.preventDefault()} noValidate>
        <fieldset>
          <legend><span className="n">1</span>{isEn ? "Where are you now?" : "Où en êtes-vous ?"}</legend>
          <div className="choix-liste" role="radiogroup">
            <label className="option">
              <input type="radio" name="etape" value="ouvert" checked={etape === "ouvert"} onChange={() => setEtape("ouvert")} />
              <span className="repere" aria-hidden="true" />
              <span className="libelle">{isEn ? "I am starting work in Switzerland" : "Je commence à travailler en Suisse"}<small>{isEn ? "Or I am going back to work after unemployment in France. The choice stays open for 3 months." : "Ou je reprends un emploi après un chômage en France. Le choix reste ouvert pendant 3 mois."}</small></span>
            </label>
            <label className="option">
              <input type="radio" name="etape" value="fait" checked={etape === "fait"} onChange={() => setEtape("fait")} />
              <span className="repere" aria-hidden="true" />
              <span className="libelle">{isEn ? "I have already chosen" : "J’ai déjà choisi"}<small>{isEn ? "The comparison is then only indicative, because in principle the choice can no longer be changed." : "La comparaison est alors indicative, car le choix ne peut en principe plus être changé."}</small></span>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend><span className="n">2</span>{isEn ? "You" : "Vous"}</legend>
          <div className="ligne">
            <Champ id="n1" label={isEn ? "Year of birth" : "Année de naissance"} placeholder="1985" value={n1} onChange={setN1} min={1940} max={2010} />
            <Champ id="r1" label={isEn ? "Net salaries 2025 (€)" : "Salaires 2025 nets (€)"} placeholder="60000" value={r1} onChange={setR1} min={0} step={1000} />
          </div>
          <Champ id="a1" label={isEn ? "Other income 2025 (€), optional" : "Autres revenus 2025 (€), facultatif"} placeholder="2000" value={a1} onChange={setA1} min={0} step={500} aide={isEn ? "Net property income, investment income, capital gains, pensions." : "Revenus fonciers nets, capitaux mobiliers, plus-values, pensions."} />
          <details className="aide-revenus">
            <summary>{isEn ? "Which amount should you enter?" : "Quel montant indiquer ?"}</summary>
            <p>
              {isEn ? "These are the 2025 amounts you declare to Urssaf, category by category (net salaries, then other income). The 2027 contribution is calculated on the income of two years earlier. The reference tax income (revenu fiscal de référence) on your 2026 tax notice is only a check. The calculation follows the method of the" : "Il s’agit des montants de 2025 que vous déclarez à l’Urssaf, catégorie par catégorie (salaires nets, puis autres revenus). La cotisation 2027 se calcule sur les revenus d’il y a deux ans. Le revenu fiscal de référence de votre avis d’impôt 2026 sert seulement de contrôle. Le calcul suit la méthode du"}{" "}
              <a href="https://mon-entreprise.urssaf.fr/simulateurs/cotisation-maladie-frontalier-suisse" rel="noopener">{isEn ? "Urssaf public calculator" : "simulateur public de l’Urssaf"}</a>.
            </p>
          </details>
          <label className="case">
            <input type="checkbox" checked={h1} onChange={(ev) => setH1(ev.target.checked)} />
            <span>
              {isEn ? "I work less than 8 hours a week for my employer" : "Je travaille moins de 8 heures par semaine chez mon employeur"}{" "}
              <small>{isEn ? "Otherwise, your employer’s accident insurance covers you and the LAMal premium is calculated without accident cover, which the insurer grants on request with a certificate from your employer." : "Sinon, l’assurance accidents de votre employeur vous couvre et la prime LAMal est calculée sans accident, ce que l’assureur accorde sur demande avec une attestation de l’employeur."}</small>
            </span>
          </label>
        </fieldset>

        <fieldset>
          <legend><span className="n">3</span>{isEn ? "Your spouse or partner" : "Votre conjoint"}</legend>
          <div className="champ">
            <label htmlFor="cj">Situation</label>
            <select className="saisie" id="cj" value={cj} onChange={(ev) => setCj(ev.target.value as StatutUI)}>
              <option value="aucun">{isEn ? "No spouse or partner" : "Pas de conjoint"}</option>
              <option value="sans">{isEn ? "Not in paid work" : "Sans activité professionnelle"}</option>
              <option value="france">{isEn ? "Works in France" : "Travaille en France"}</option>
              <option value="suisse">{isEn ? "Also works in Switzerland" : "Travaille aussi en Suisse"}</option>
              <option value="autre">{isEn ? "Other situation (self-employed, unemployed, retired)" : "Autre situation (à son compte, chômage, retraite)"}</option>
            </select>
          </div>
          <div className="ligne" hidden={cj === "aucun" || cj === "autre"}>
            <Champ id="n2" label={isEn ? "Year of birth" : "Année de naissance"} placeholder="1987" value={n2} onChange={setN2} min={1940} max={2010} />
            <div hidden={cj !== "suisse"}>
              <Champ id="r2" label={isEn ? "Their net salaries 2025 (€)" : "Ses salaires 2025 nets (€)"} placeholder="45000" value={r2} onChange={setR2} min={0} step={1000} />
            </div>
          </div>
          <label className="case" hidden={cj !== "suisse"}>
            <input type="checkbox" checked={h2} onChange={(ev) => setH2(ev.target.checked)} />
            <span>{isEn ? "Less than 8 hours a week" : "Moins de 8 heures par semaine"}</span>
          </label>
          {NOTES[cj] ? <p className={cj === "autre" ? "provisoire" : "note-outil"}>{NOTES[cj]}</p> : null}
        </fieldset>

        <fieldset>
          <legend><span className="n">4</span>{isEn ? "Your children" : "Vos enfants"}</legend>
          <div className="champ">
            <label htmlFor="ne">{isEn ? "Dependent children" : "Enfants à charge"}</label>
            <select className="saisie" id="ne" value={enfants.length} onChange={(ev) => nbEnfants(+ev.target.value)}>
              {[0, 1, 2, 3, 4].map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <div className="ligne">
            {enfants.map((v, k) => (
              <Champ
                key={k}
                id={`e${k + 1}`}
                label={isEn ? `Child ${k + 1}, year of birth` : `Enfant ${k + 1}, né en`}
                placeholder="2015"
                value={v}
                min={2000}
                max={2027}
                onChange={(nv) => setEnfants((cur) => cur.map((x, i) => (i === k ? nv : x)))}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="dernier">
          <legend><span className="n">5</span>{isEn ? "Exchange rate" : "Taux de change"}</legend>
          <Champ id="tx" label={isEn ? "1 euro is worth (in francs)" : "1 euro vaut (en francs)"} placeholder={isEn ? "0.94" : "0,94"} value={tx} onChange={setTx} inputMode="decimal" step="0.01" min={0.5} max={1.5} aide={isEn ? "Rate assumed on 22.11.2026, which you can change. Each amount is also shown in its original currency." : "Taux retenu au 22.11.2026, modifiable. Chaque montant est aussi donné dans sa monnaie d’origine."} />
        </fieldset>
      </form>

      <section className="apercu" aria-live="polite">
        <h2 className="visually-hidden">{isEn ? "Result" : "Résultat"}</h2>
        <div className="duel">
          <div className="duel-option">
            <h3>{isEn ? "French health insurance" : "Assurance maladie française"}</h3>
            <div className="prix">{isEn ? `€${nf(c.france.eur)}` : `${nf(c.france.eur)}${NB}€`} <small>{isEn ? "per year" : "par an"}</small></div>
            <p>{isEn ? `That is about ${chf(nf(c.france.chf))}, ${nF > 1 ? "for two contributions (one per cross-border worker)." : "for your contribution alone."}` : <>Soit environ {nf(c.france.chf)}{NB}CHF, {nF > 1 ? "pour deux cotisations (une par frontalier)." : "pour votre seule cotisation."}</>}</p>
          </div>
          <div className="duel-option">
            <h3>{isEn ? "LAMal, from the lowest to the highest premium" : "LAMal, de la prime la plus basse à la plus haute"}</h3>
            <div className="prix">{isEn ? `CHF${NB}${nf(c.lamal.min * 12)} to ${nf(c.lamal.max * 12)}` : <>{nf(c.lamal.min * 12)} à {nf(c.lamal.max * 12)}{NB}CHF</>} <small>{isEn ? "per year" : "par an"}</small></div>
            <p>{isEn ? `Median ${chf(nf(c.lamal.mediane * 12))}, for ${nC} premium${nC > 1 ? "s" : ""} with the same insurer.` : <>Médiane de {nf(c.lamal.mediane * 12)}{NB}CHF, pour {nC} prime{nC > 1 ? "s" : ""} chez le même assureur.</>}</p>
          </div>
        </div>
        {etape === "fait" ? (
          <p className="provisoire">
            {isEn ? "As you have already chosen, this comparison is only an indication. The choice can be made again only if you start a new first job in Switzerland, return to work after a foreign scheme, move to France or retire." : "Comme vous avez déjà choisi, ce comparatif est indicatif. Le choix ne peut être refait qu’en cas de nouvelle première activité en Suisse, de reprise après un régime étranger, d’installation en France ou de passage à la retraite."}
          </p>
        ) : null}
        <p className="verdict">{verdict}</p>
        <CtaDemande
          locale={locale}
          porte="frontaliers"
          emplacement="frontalier"
          onClick={() => {
            const annee = num(n1);
            const conjoint = cj === "aucun" ? 0 : 1;
            ecrirePreremplissage({
              porte: "frontaliers",
              ...(Number.isInteger(annee) && annee >= 1900 && annee <= new Date().getFullYear() ? { birthYear: annee } : {}),
              householdSize: Math.min(4, 1 + conjoint + enfants.length),
            });
          }}
        />
        <div className="qui">
          <h3>{isEn ? "Who is counted" : "Qui est compté"}</h3>
          <p>{isEn ? "With LAMal, one premium for:" : "Avec la LAMal, une prime pour :"}</p>
          <ul>
            {c.assuresCH.map((p) => (
              <li key={p.qui}>
                {qui(p.qui)} ({CL[p.classe]})
                {p.role === "frontalier" ? (isEn ? `, ${p.accident ? "with" : "without"} accident cover under LAMal` : `, ${p.accident ? "avec" : "sans"} accident côté LAMal`) : ""}
              </li>
            ))}
          </ul>
          {isEn ? (
            <p>
              With French health insurance, the household pays {nF > 1 ? "two contributions (you and your spouse or partner)" : "your contribution"}
              {c.assuresCH.length > nF ? ", and your relatives not in paid work are attached at no cost" : ""}.
            </p>
          ) : (
            <p>
              Avec l’assurance française, le foyer paie {nF > 1 ? "deux cotisations (vous et votre conjoint)" : "votre cotisation"}
              {c.assuresCH.length > nF ? ", et vos proches sans activité sont rattachés sans frais" : ""}.
            </p>
          )}
          {c.horsChoix.length ? (
            <p>{isEn ? `In both cases, these people are covered in France through your spouse or partner’s work: ${c.horsChoix.map((p) => qui(p.qui).toLowerCase()).join(", ")}.` : <>Dans les deux cas, ces personnes sont assurées en France par l’activité de votre conjoint : {c.horsChoix.map((p) => p.qui.toLowerCase()).join(", ")}.</>}</p>
          ) : null}
        </div>
        <p className="provisoire">{isEn ? `Provisional 2027 figures on the French side: ${(c.france.detail[0]?.provisoire ?? []).map((x) => PROVISOIRE_EN[x] ?? x).join("; ")}.` : <>Chiffres 2027 provisoires côté français : {c.france.detail[0]?.provisoire.join(" ; ")}.</>}</p>
        <table className="assureurs">
          <caption>{isEn ? `2027 LAMal premiums for the household with each of the ${c.lamal.liste.length} insurers, sorted from lowest to highest.` : <>Primes LAMal 2027 du foyer chez chacun des {c.lamal.liste.length} assureurs, triées de la plus basse à la plus haute.</>}</caption>
          <thead>
            <tr><th scope="col">{isEn ? "Insurer" : "Assureur"}</th><th scope="col">{isEn ? "CHF / month" : "CHF / mois"}</th><th scope="col">{isEn ? "CHF / year" : "CHF / an"}</th></tr>
          </thead>
          <tbody>
            {c.lamal.liste.map((r) => (
              <tr key={r.no}>
                <td>{r.nom}<span className="barre" style={{ width: `${Math.round((r.mensuel / mx) * 100)}%` }} /></td>
                <td>{nf(r.mensuel, 2)}</td>
                <td>{nf(r.annuel)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="source-outil">
          {isEn ? "Source: FOPH (OFSP), 2027 premiums for insured persons living in France (Prämien_EU), opendata.swiss, update of 29.09.2026. Urssaf, health contribution for cross-border workers (page updated on 24.09.2026). Deductible of CHF 300, the only one possible for a resident of France (art. 101a OAMal, Health Insurance Ordinance)." : "Source : OFSP, primes 2027 des assurés résidant en France (Prämien_EU), opendata.swiss, mise à jour du 29.09.2026. Urssaf, cotisation maladie des frontaliers (page mise à jour le 24.09.2026). Franchise de 300 CHF, la seule possible pour un résident en France (art. 101a OAMal)."}
        </p>

        <div className="nuances">
          <h2>{isEn ? "What the price does not tell you" : "Ce que le prix ne dit pas"}</h2>
          <dl>
            <div><dt>{isEn ? "Where to get treatment" : "Où se faire soigner"}</dt><dd>{isEn ? "With LAMal, in Switzerland and in France (form S1 from the CPAM, the French local health insurance fund). With French health insurance, in France; in Switzerland, emergencies are covered, and non-urgent care at the French rate or with prior approval (S2)." : "Avec la LAMal, en Suisse et en France (formulaire S1 auprès de la CPAM). Avec l’assurance française, en France ; en Suisse, les urgences sont prises en charge, et les soins non urgents au tarif français ou avec un accord préalable (S2)."}</dd></div>
            <div><dt>{isEn ? "What you still pay yourself" : "Ce qui reste à votre charge"}</dt><dd>{isEn ? "With LAMal, you pay the CHF 300 deductible per adult, then 10% of costs up to CHF 700 per year (CHF 350 per child). In France, you pay the patient co-payment (ticket modérateur), which a top-up policy (mutuelle) often covers. Top-up cover is optional in both cases." : "Avec la LAMal, vous payez la franchise de 300 CHF par adulte, puis 10 % des frais jusqu’à 700 CHF par an (350 CHF par enfant). En France, il s’agit du ticket modérateur, souvent couvert par une mutuelle. Une assurance complémentaire reste facultative dans les deux cas."}</dd></div>
            <div><dt>{isEn ? "The family" : "La famille"}</dt><dd>{isEn ? "With LAMal, each member pays their own premium, with the same insurer. In France, a spouse or partner not in paid work and the children are attached with no extra contribution." : "Avec la LAMal, chaque membre paie sa prime, chez le même assureur. En France, le conjoint sans activité et les enfants sont rattachés sans cotisation supplémentaire."}</dd></div>
            <div><dt>{isEn ? "A choice that is final in principle" : "Un choix en principe définitif"}</dt><dd>{isEn ? "You have 3 months after you start work in Switzerland. Without a valid choice, you are automatically enrolled in LAMal. The choice can be made again only if you start a new first job in Switzerland, return to work after a foreign scheme (for example unemployment in France), move to France or retire." : "Vous avez 3 mois après le début de votre travail en Suisse. Sans choix valable, vous êtes affilié d’office à la LAMal. Le choix ne peut être refait qu’en cas de nouvelle première activité en Suisse, de reprise après un régime étranger (par exemple le chômage en France), d’installation en France ou de passage à la retraite."}</dd></div>
          </dl>
        </div>
        {/* liste d'attente : en attente du service ; l'encadré « Vous hésitez ? » et son bouton « Je souhaite être accompagné » reviendront avec elle. */}
      </section>
    </div>
  );
}
