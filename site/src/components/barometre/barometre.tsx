import { IconeTelephone, LienRappel } from "@/components/demande/lien-rappel";
import { FaqSections, type FaqOutil } from "@/components/site/faq-sections";
import {
  ANNEE_BAROMETRE as A,
  ANNEE_PREC as P,
  DATE_BAROMETRE,
  DATE_OFSP,
  DONNEES,
  LIBELLE_PROFIL,
  VARIATION_PAR_REGION,
  cantonsParMoyenne,
  chf,
  donneesCanton,
  ecartMensuel,
  infoCanton,
  pct,
  phrasesCanton,
  rangHausse,
  regionPrincipale,
  type RegionB,
} from "@/lib/barometre";
import { dateLongue, type Locale } from "@/lib/i18n";
import { OUTILS, OUTILS_EN } from "@/lib/nav";
import { ROUTES_IDEES, cheminBarometre } from "@/lib/pages-idees";

/* Baromètre des primes : page d'ensemble et page par canton, FR et EN. Rendu côté serveur, lisible sans JavaScript.
   Aucun assureur n'est nommé ; les tableaux donnent des valeurs de distribution (plus basse, quartiles, médiane, plus haute). */
const T = " ";
const DATE_RELEVE = DONNEES.date_donnees;
const URL_OFSP_MOYENNES = DONNEES.source.moyennes.urls[0];

const nomCanton = (code: string, l: Locale) => (l === "fr" ? infoCanton(code).fr : infoCanton(code).en);
const titreRegion = (r: RegionB, multi: boolean, l: Locale) =>
  multi ? (l === "fr" ? `Région ${r.region} (${r.commune})` : `Region ${r.region} (${r.commune})`) : l === "fr" ? `Tout le canton (${r.commune})` : `Whole canton (${r.commune})`;

function TableRegion({ r, multi, l }: { r: RegionB; multi: boolean; l: Locale }) {
  const fr = l === "fr";
  return (
    <table className="assureurs table-barometre">
      <caption>
        {fr
          ? `${titreRegion(r, multi, l)}, primes ${A} en CHF par mois, modèle standard (libre choix du médecin), accident inclus, ${r.assureurs} assureurs. Source${T}: OFSP, primes approuvées, relevées le ${dateLongue(DATE_RELEVE, l)}.`
          : `${titreRegion(r, multi, l)}, ${A} premiums in CHF per month, standard model (free choice of doctor), accident cover included, ${r.assureurs} insurers. Source: FOPH, approved premiums, retrieved on ${dateLongue(DATE_RELEVE, l)}.`}
      </caption>
      <thead>
        <tr>
          <th scope="col">{fr ? "Profil" : "Profile"}</th>
          <th scope="col">{fr ? "Plus basse" : "Lowest"}</th>
          <th scope="col" className="q">{fr ? "1er quartile" : "1st quartile"}</th>
          <th scope="col">{fr ? "Médiane" : "Median"}</th>
          <th scope="col" className="q">{fr ? "3e quartile" : "3rd quartile"}</th>
          <th scope="col">{fr ? "Plus haute" : "Highest"}</th>
        </tr>
      </thead>
      <tbody>
        {r.profils.map((p) => (
          <tr key={p.cle}>
            <th scope="row">{LIBELLE_PROFIL[p.cle][l]}</th>
            <td>{chf(p.standard.min, l).replace(/ ?CHF ?/, "")}</td>
            <td className="q">{chf(p.standard.q1, l).replace(/ ?CHF ?/, "")}</td>
            <td><b>{chf(p.standard.med, l).replace(/ ?CHF ?/, "")}</b></td>
            <td className="q">{chf(p.standard.q3, l).replace(/ ?CHF ?/, "")}</td>
            <td>{chf(p.standard.max, l).replace(/ ?CHF ?/, "")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AppelsBas({ l, canton }: { l: Locale; canton?: string }) {
  const fr = l === "fr";
  const comparateur = fr ? OUTILS.comparateur : OUTILS_EN.comparateur;
  return (
    <>
      <aside className="conseil" aria-label={fr ? "Votre prime" : "Your premium"}>
        <p>
          <b>{fr ? `Et pour vous${T}?` : "What about you?"}</b>{" "}
          {fr
            ? "Le comparateur affiche les primes de votre région pour votre âge et votre franchise, triées de la plus basse à la plus haute."
            : "The comparison tool shows the premiums of your region for your age and deductible, sorted from lowest to highest."}
        </p>
        <a href={comparateur}>{fr ? "Voir les primes de ma région" : "See the premiums in my region"}</a>
      </aside>
      <p className="rappel-liste">
        {fr
          ? "Vous préférez en parler de vive voix, pour la base ou une complémentaire ? Un conseiller peut vous rappeler. "
          : "Would you rather talk it through, for basic or supplementary insurance? An adviser can call you back. "}
        <LienRappel locale={l} emplacement="barometre" sujet="sante">
          <IconeTelephone size={16} />
          {fr ? "Être rappelé" : "Call me back"}
        </LienRappel>
      </p>
      <p className="note-outil">
        {fr ? "Journaliste, commune ou employeur ? " : "Journalist, municipality or employer? "}
        <a href={ROUTES_IDEES.integrer[l]}>
          {fr
            ? `La prime médiane de chaque région${canton ? ` ${infoCanton(canton).deFr}` : ""} peut s’intégrer sur votre site`
            : `The median premium of each region${canton ? ` in ${infoCanton(canton).en}` : ""} can be embedded on your site`}
        </a>
        {fr ? ", avec la source et la date." : ", with its source and date."}
      </p>
    </>
  );
}

/* ---- Page d'un canton ---- */

export function faqCanton(code: string, l: Locale): FaqOutil[] {
  const fr = l === "fr";
  const i = infoCanton(code);
  return fr
    ? [
        {
          q: `Que mesure la prime moyenne publiée par l’OFSP${T}?`,
          a: [
            `C’est la moyenne des primes des adultes du canton, toutes franchises et tous modèles confondus, pondérée par le nombre d’assurés attendu. Elle est donc plus basse que la prime d’un adulte avec la franchise de 300 francs et le modèle standard. Pour ${A}, l’OFSP la présente comme une projection, qui peut encore varier légèrement.`,
          ],
        },
        {
          q: `Pourquoi deux personnes ${i.deFr} ne paient-elles pas la même prime${T}?`,
          a: [
            `La prime dépend de la région de prime de la commune, de la classe d’âge, de la franchise, du modèle choisi et de l’assureur. Les prestations de l’assurance de base sont les mêmes chez tous les assureurs, car la liste est fixée par la loi.`,
          ],
        },
        {
          q: `Jusqu’à quand peut-on changer d’assureur${T}?`,
          a: [
            `Pour un changement au 1er janvier ${A}, l’assureur doit recevoir la lettre de résiliation au plus tard le 30 novembre ${P} (art. 7, al. 2, LAMal). Avec la franchise de 300 francs et le libre choix du médecin, un changement au 1er juillet ${A} reste possible avec une lettre reçue le 31 mars ${A} (art. 7, al. 1, LAMal).`,
          ],
          src: (
            <>
              Texte : <a href="https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_7">art. 7 LAMal</a>.
            </>
          ),
        },
        {
          q: `D’où viennent ces chiffres${T}?`,
          a: [
            `La prime moyenne et sa variation viennent du tableau des primes moyennes cantonales de l’OFSP, publié le ${dateLongue(DATE_OFSP, l)}. Les valeurs par région viennent des primes ${A} approuvées par l’OFSP, relevées sur priminfo.admin.ch le ${dateLongue(DATE_RELEVE, l)} ; chaque assureur compte pour une offre en modèle standard, sans pondération. Les montants sont mensuels, avant la redistribution des taxes environnementales.`,
          ],
        },
      ]
    : [
        {
          q: "What does the FOPH average premium measure?",
          a: [
            `It is the average premium paid by adults in the canton, across every deductible and model, weighted by the expected number of insured people. That is why it is lower than the premium of an adult with the CHF 300 deductible and the standard model. For ${A}, the FOPH presents it as a projection that may still change slightly.`,
          ],
        },
        {
          q: `Why do two people in ${i.en_in} pay different premiums?`,
          a: [
            "The premium depends on the premium region of the municipality, the age group, the deductible, the chosen model and the insurer. Basic insurance benefits are the same with every insurer, because the list is set by law.",
          ],
        },
        {
          q: "Until when can you change insurer?",
          a: [
            `To change on 1 January ${A}, your insurer must receive the cancellation letter by 30 November ${P} at the latest (art. 7 para. 2 LAMal). With the CHF 300 deductible and free choice of doctor, a change on 1 July ${A} is still possible with a letter received by 31 March ${A} (art. 7 para. 1 LAMal).`,
          ],
          src: (
            <>
              Text: <a href="https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_7">art. 7 LAMal</a> (in French).
            </>
          ),
        },
        {
          q: "Where do these figures come from?",
          a: [
            `The average premium and its change come from the FOPH table of cantonal average premiums, published on ${dateLongue(DATE_OFSP, l)}. The regional values come from the ${A} premiums approved by the FOPH, retrieved from priminfo.admin.ch on ${dateLongue(DATE_RELEVE, l)}; each insurer counts as one offer in the standard model, without weighting. Amounts are monthly, before the redistribution of environmental levies.`,
          ],
        },
      ];
}

export function leadCanton(code: string, l: Locale) {
  const c = donneesCanton(code);
  const i = infoCanton(code);
  const n = DONNEES.national;
  return l === "fr"
    ? `En ${A}, la prime mensuelle moyenne de l’assurance maladie de base pour un adulte ${i.aFr} est de ${chf(c.officiel.adulte, l)}, soit ${pct(c.officiel.variation_pct, l, false)} de plus qu’en ${P}, selon l’Office fédéral de la santé publique (OFSP). En Suisse, la hausse moyenne est de ${pct(n.variation_pct, l, false)}.`
    : `In ${A}, the average monthly basic health insurance premium for an adult in ${i.en_in} is ${chf(c.officiel.adulte, l)}, ${pct(c.officiel.variation_pct, l, false)} more than in ${P}, according to the Federal Office of Public Health (FOPH). Across Switzerland, the average increase is ${pct(n.variation_pct, l, false)}.`;
}

export function BarometreCanton({ code, l }: { code: string; l: Locale }) {
  const fr = l === "fr";
  const c = donneesCanton(code);
  const i = infoCanton(code);
  const multi = c.regions.length > 1;
  const r0 = regionPrincipale(c);
  const p0 = r0.profils.find((p) => p.cle === "adulte_300")!;
  const o = c.officiel;
  const n = DONNEES.national;
  const sources = (
    <ul className="sources-barometre">
      <li><a href={URL_OFSP_MOYENNES}>{fr ? `OFSP, primes moyennes cantonales mensuelles ${P} et ${A} (PDF, ${dateLongue(DATE_OFSP, l)})` : `FOPH, cantonal average monthly premiums ${P} and ${A} (PDF, ${dateLongue(DATE_OFSP, l)})`}</a></li>
      <li><a href="https://www.priminfo.admin.ch/">{fr ? `Priminfo (OFSP), primes ${A} approuvées, relevées le ${dateLongue(DATE_RELEVE, l)}` : `Priminfo (FOPH), approved ${A} premiums, retrieved on ${dateLongue(DATE_RELEVE, l)}`}</a></li>
      <li><a href="https://www.priminfo.admin.ch/downloads/praemienregionen-2027.xlsx">{fr ? `OFSP, régions de primes ${A}` : `FOPH, ${A} premium regions`}</a></li>
      <li><a href="https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr#art_7">{fr ? "Art. 7 LAMal (Fedlex)" : "Art. 7 LAMal (Fedlex, in French)"}</a></li>
    </ul>
  );
  return (
    <>
      <p className="intro lead-barometre">{leadCanton(code, l)}</p>
      <aside className="faits-barometre" aria-labelledby="t-faits">
        <p id="t-faits" className="titre-faits">{fr ? "L’essentiel" : "Key facts"}</p>
        <ul>
          <li>
            <b>{chf(o.adulte, l)}</b>
            {fr ? ` par mois, prime moyenne d’un adulte en ${A} (${chf(o.adulte_prec, l)} en ${P}). OFSP, ${dateLongue(DATE_OFSP, l)}.` : ` a month, average adult premium in ${A} (${chf(o.adulte_prec, l)} in ${P}). FOPH, ${dateLongue(DATE_OFSP, l)}.`}
          </li>
          <li>
            <b>{pct(o.variation_pct, l)}</b>
            {fr ? `, hausse de la prime moyenne, contre ${pct(n.variation_pct, l)} en Suisse (${rangHausse(code) === 1 ? "la plus forte" : rangHausse(code) === DONNEES.cantons.length ? "la plus faible" : `${rangHausse(code)}e`} des six cantons romands). OFSP.` : `, change in the average premium, against ${pct(n.variation_pct, l)} for Switzerland. FOPH.`}
          </li>
          {o.jeune && o.enfant ? (
            <li>
              <b>{chf(o.jeune, l)}</b>
              {fr ? ` pour un jeune adulte et ` : ` for a young adult and `}
              <b>{chf(o.enfant, l)}</b>
              {fr ? ` pour un enfant, primes moyennes ${A}. OFSP.` : ` for a child, ${A} average premiums. FOPH.`}
            </li>
          ) : null}
          <li>
            <b>{chf(ecartMensuel(p0.standard), l)}</b>
            {fr
              ? ` par mois d’écart entre l’offre la plus basse et la plus haute, adulte, franchise 300, modèle standard${multi ? `, région de ${r0.commune}` : ""}. Primes approuvées, ${dateLongue(DATE_RELEVE, l)}.`
              : ` a month between the lowest and highest offer, adult, CHF 300 deductible, standard model${multi ? `, ${r0.commune} region` : ""}. Approved premiums, ${dateLongue(DATE_RELEVE, l)}.`}
          </li>
          <li>
            <b>{c.regions.length}</b>
            {fr
              ? ` région${multi ? "s" : ""} de prime et ${r0.assureurs} assureurs${multi ? " dans la région principale" : ""}. OFSP, régions de primes ${A}.`
              : ` premium region${multi ? "s" : ""} and ${r0.assureurs} insurers${multi ? " in the main region" : ""}. FOPH, ${A} premium regions.`}
          </li>
        </ul>
      </aside>

      <section className="section-barometre">
        <h2>{fr ? `Que retenir des primes ${A} ${i.deFr}${T}?` : `What stands out in the ${A} premiums in ${i.en_in}?`}</h2>
        <p>{phrasesCanton(code, l).join(" ")}</p>
      </section>

      <section className="section-barometre">
        <h2>{fr ? `De combien les primes augmentent-elles en ${A}${T}?` : `How much are premiums going up in ${A}?`}</h2>
        <p>
          {fr
            ? `La prime moyenne d’un adulte passe de ${chf(o.adulte_prec, l)} à ${chf(o.adulte, l)} par mois (${pct(o.variation_pct, l)}), selon le tableau des primes moyennes cantonales de l’OFSP. Cette moyenne tient compte de toutes les franchises et de tous les modèles ; votre propre hausse dépend de votre contrat.`
            : `The average adult premium goes from ${chf(o.adulte_prec, l)} to ${chf(o.adulte, l)} a month (${pct(o.variation_pct, l)}), according to the FOPH table of cantonal average premiums. This average covers every deductible and model; your own increase depends on your contract.`}
        </p>
        {VARIATION_PAR_REGION ? null : (
          <p>
            {fr
              ? `La hausse n’est pas encore calculée région par région. Il faudrait pour cela les primes ${P} de chaque assureur, que le serveur de données ouvertes de l’OFSP ne livrait pas lors du relevé (erreur à chaque essai, les 22 et 23 novembre 2026). Les primes ${A} sont conservées : le baromètre ${A + 1} donnera la variation par région et par profil.`
              : `The increase is not yet calculated region by region. That would require each insurer’s ${P} premiums, which the FOPH open data server did not deliver when the data was collected (an error on every attempt, on 22 and 23 November 2026). The ${A} premiums are kept, so the ${A + 1} barometer will show the change by region and by profile.`}
          </p>
        )}
      </section>

      <section className="section-barometre">
        <h2>{fr ? `Quel écart entre l’offre la plus basse et la plus haute${T}?` : "How far apart are the lowest and highest offers?"}</h2>
        <p>
          {fr
            ? `Pour un même profil, les prestations sont identiques d’un assureur à l’autre ; les primes, elles, varient. Le tableau donne, pour le modèle standard, l’offre la plus basse, la médiane (la moitié des assureurs sont en dessous), les quartiles et l’offre la plus haute. Aucun assureur n’est nommé ; le comparateur donne la liste complète, triée par prime.`
            : `For the same profile, benefits are identical from one insurer to another, while premiums vary. For the standard model, the table gives the lowest offer, the median (half of the insurers are below it), the quartiles and the highest offer. No insurer is named; the comparison tool gives the full list, sorted by premium.`}
        </p>
        {c.regions.map((r) => (
          <div key={r.region} className="region-barometre" id={`region-${r.region}`}>
            {multi ? <h3>{titreRegion(r, multi, l)}</h3> : null}
            <div className="defile">
              <TableRegion r={r} multi={multi} l={l} />
            </div>
          </div>
        ))}
      </section>

      <AppelsBas l={l} canton={code} />

      <div className="faq faq-barometre">
        <FaqSections faq={faqCanton(code, l)} />
        <section>
          <h2>{fr ? "Sur quelles données repose ce baromètre ?" : "What data is this barometer based on?"}</h2>
          {sources}
        </section>
        <p className="maj">
          {fr ? `Mis à jour le ${dateLongue(DATE_BAROMETRE, l)}. Données : OFSP.` : `Updated on ${dateLongue(DATE_BAROMETRE, l)}. Data: FOPH.`}
        </p>
      </div>
    </>
  );
}

/* ---- Page d'ensemble ---- */

export function faqHub(l: Locale): FaqOutil[] {
  const delai = faqCanton("GE", l)[2];
  return [...faqHubBase(l), delai];
}

function faqHubBase(l: Locale): FaqOutil[] {
  return l === "fr"
    ? [
        {
          q: `Pourquoi la prime moyenne est-elle plus basse que les primes du comparateur${T}?`,
          a: [`La moyenne de l’OFSP inclut les franchises élevées et les modèles alternatifs, et elle est pondérée par le nombre d’assurés. Le comparateur, lui, montre la prime de chaque offre pour le profil que vous saisissez, par exemple une franchise de 300 francs avec le libre choix du médecin.`],
        },
        {
          q: `Quand le baromètre ${A + 1} sera-t-il publié${T}?`,
          a: [`Le jour où l’OFSP annonce les primes ${A + 1}, en principe à la fin septembre ${A}. Les pages sont alors recalculées à partir des nouvelles primes approuvées, avec pour la première fois la variation par région de prime et par profil.`],
        },
      ]
    : [
        {
          q: "Why is the average premium lower than the premiums in the comparison tool?",
          a: ["The FOPH average includes high deductibles and alternative models, and it is weighted by the number of insured people. The comparison tool shows the premium of each offer for the profile you enter, for example a CHF 300 deductible with free choice of doctor."],
        },
        {
          q: `When will the ${A + 1} barometer be published?`,
          a: [`On the day the FOPH announces the ${A + 1} premiums, usually at the end of September ${A}. The pages are then recalculated from the newly approved premiums, with the change by premium region and by profile for the first time.`],
        },
      ];
}

export function BarometreHub({ l }: { l: Locale }) {
  const fr = l === "fr";
  const cs = cantonsParMoyenne();
  const n = DONNEES.national;
  const haut = cs[0], bas = cs[cs.length - 1];
  const hausse = [...cs].sort((a, b) => b.officiel.variation_pct - a.officiel.variation_pct);
  return (
    <>
      <p className="intro lead-barometre">
        {fr
          ? `En ${A}, la prime moyenne d’un adulte pour l’assurance de base va de ${chf(bas.officiel.adulte, l)} par mois ${infoCanton(bas.code).aFr} à ${chf(haut.officiel.adulte, l)} ${infoCanton(haut.code).aFr}, selon l’OFSP. Elle augmente de ${pct(hausse[hausse.length - 1].officiel.variation_pct, l, false)} à ${pct(hausse[0].officiel.variation_pct, l, false)} selon le canton romand, pour ${pct(n.variation_pct, l, false)} en moyenne suisse.`
          : `In ${A}, the average adult premium for basic health insurance ranges from ${chf(bas.officiel.adulte, l)} a month in ${infoCanton(bas.code).en_in} to ${chf(haut.officiel.adulte, l)} in ${infoCanton(haut.code).en_in}, according to the FOPH. It rises by ${pct(hausse[hausse.length - 1].officiel.variation_pct, l, false)} to ${pct(hausse[0].officiel.variation_pct, l, false)} depending on the French-speaking canton, against ${pct(n.variation_pct, l, false)} on average in Switzerland.`}
      </p>
      <section className="section-barometre">
        <h2>{fr ? `Combien coûte l’assurance de base dans chaque canton romand${T}?` : "How much does basic insurance cost in each French-speaking canton?"}</h2>
        <div className="defile">
          <table className="assureurs table-barometre table-cantons">
            <caption>
              {fr
                ? `Prime moyenne d’un adulte (OFSP, ${dateLongue(DATE_OFSP, l)}) et écart entre l’offre la plus basse et la plus haute pour un adulte, franchise 300, modèle standard, accident inclus, région principale (primes approuvées, ${dateLongue(DATE_RELEVE, l)}). CHF par mois.`
                : `Average adult premium (FOPH, ${dateLongue(DATE_OFSP, l)}) and gap between the lowest and highest offer for an adult, CHF 300 deductible, standard model, accident cover, main region (approved premiums, ${dateLongue(DATE_RELEVE, l)}). CHF per month.`}
            </caption>
            <thead>
              <tr>
                <th scope="col">Canton</th>
                <th scope="col">{fr ? `Moyenne ${A}` : `${A} average`}</th>
                <th scope="col" className="q">{fr ? `Moyenne ${P}` : `${P} average`}</th>
                <th scope="col">{fr ? "Variation" : "Change"}</th>
                <th scope="col">{fr ? "Écart entre offres" : "Gap between offers"}</th>
              </tr>
            </thead>
            <tbody>
              {cs.map((c) => (
                <tr key={c.code}>
                  <th scope="row"><a href={cheminBarometre(c.code, l)}>{nomCanton(c.code, l)}</a></th>
                  <td><b>{num(c.officiel.adulte, l)}</b></td>
                  <td className="q">{num(c.officiel.adulte_prec, l)}</td>
                  <td>{pct(c.officiel.variation_pct, l)}</td>
                  <td>{num(ecartMensuel(regionPrincipale(c).profils.find((p) => p.cle === "adulte_300")!.standard), l)}</td>
                </tr>
              ))}
              <tr className="ligne-suisse">
                <th scope="row">{fr ? "Suisse" : "Switzerland"}</th>
                <td><b>{num(n.adulte, l)}</b></td>
                <td className="q">{num(n.adulte_prec, l)}</td>
                <td>{pct(n.variation_pct, l)}</td>
                <td>{fr ? "non calculé" : "not calculated"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section className="section-barometre">
        <h2>{fr ? `Où trouver le détail par canton et par région${T}?` : "Where are the details by canton and region?"}</h2>
        <p>
          {fr
            ? "Chaque page cantonale reprend ces chiffres, puis donne pour chaque région de prime la distribution des offres pour quatre profils types : adulte avec la franchise de 300 ou de 2500 francs, jeune adulte, enfant."
            : "Each canton page repeats these figures, then gives the distribution of offers in every premium region for four standard profiles: an adult with the CHF 300 or CHF 2,500 deductible, a young adult and a child."}
        </p>
        <ul className="liste-cantons">
          {cs.map((c) => (
            <li key={c.code}>
              <a href={cheminBarometre(c.code, l)}>{fr ? `Baromètre ${infoCanton(c.code).deFr}` : `Barometer for ${infoCanton(c.code).en}`}</a>
              {fr ? ` : ${chf(c.officiel.adulte, l)} (${pct(c.officiel.variation_pct, l)})` : `: ${chf(c.officiel.adulte, l)} (${pct(c.officiel.variation_pct, l)})`}
            </li>
          ))}
        </ul>
      </section>
      <AppelsBas l={l} />
      <div className="faq faq-barometre">
        <FaqSections faq={faqHub(l)} />
        <p className="maj">
          {fr ? `Mis à jour le ${dateLongue(DATE_BAROMETRE, l)}. Données : OFSP (primes moyennes cantonales, primes approuvées ${A}).` : `Updated on ${dateLongue(DATE_BAROMETRE, l)}. Data: FOPH (cantonal average premiums, approved ${A} premiums).`}
        </p>
      </div>
    </>
  );
}

const num = (x: number, l: Locale) => chf(x, l).replace(/ ?CHF ?/, "");
