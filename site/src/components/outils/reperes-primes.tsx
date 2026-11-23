import resume from "@/data/primes-2027-resume.json";
import type { Locale } from "@/lib/i18n";
import { PAGES_DONNEES, PAGES_DONNEES_EN } from "@/lib/nav";

/* Tableau statique, lisible sans JavaScript : pour chaque canton, région de prime la plus peuplée, adulte de 26 ans et plus.
   Quatre profils (franchise 300 et 2500, avec et sans accident) : première prime de la liste et moyenne des offres ;
   puis les cinq premières offres du profil franchise 300 avec accident.
   Données : site/src/data/primes-2027-resume.json (data/scripts/build_comparateur_2027.py). */
type Offre = { assureur: string; produit: string; type: string; mensuel: number };
type ProfilResume = { franchise: number; accident: boolean; premiere: number; moyenne: number; nombre: number };
type CantonResume = { canton: string; region: number; commune: string; nombre: number; moyenne: number; offres: Offre[]; profils: ProfilResume[] };
const R = resume as { cantons: CantonResume[] };

const T = " ";
const NB = " ";
const NOM = {
  fr: { GE: "Genève", VD: "Vaud", VS: "Valais", FR: "Fribourg", NE: "Neuchâtel", JU: "Jura", BE: "Jura bernois" },
  en: { GE: "Geneva", VD: "Vaud", VS: "Valais", FR: "Fribourg", NE: "Neuchâtel", JU: "Jura", BE: "Bernese Jura" },
} as Record<Locale, Record<string, string>>;
const MULTI = ["VD", "VS", "FR"];

export function TableauReperes({ locale = "fr" }: { locale?: Locale }) {
  const en = locale === "en";
  const nf = (c: number) =>
    en
      ? new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(c / 100)
      : new Intl.NumberFormat("fr-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(c / 100).replace(/\s/g, T);
  const cantons = R.cantons;
  const bas = cantons.map((c) => c.offres[0].mensuel);
  const min = Math.min(...bas);
  const max = Math.max(...bas);
  const chf = (c: number) => (en ? `CHF${NB}${nf(c)}` : `${nf(c)}${NB}CHF`);
  return (
    <section className="reperes-statiques" aria-labelledby="reperes-titre">
      <h2 id="reperes-titre">{en ? "How much does basic insurance cost an adult in 2027?" : `Combien coûte l’assurance de base d’un adulte en 2027${T}?`}</h2>
      <p>
        {en
          ? `For an adult aged 26 or over, with a CHF 300 deductible and accident cover, the first premium in the list ranges from ${chf(min)} to ${chf(max)} a month depending on the canton (main premium region). For each canton, the tables below show four profiles (CHF 300 and CHF 2,500 deductible, with and without accident cover), followed by the first five offers for the CHF 300 deductible with accident cover. Source: FOPH (OFSP), 2027 premiums.`
          : `Pour un adulte de 26 ans et plus, avec une franchise de 300${NB}CHF et la couverture accident, la première prime de la liste va de ${chf(min)} à ${chf(max)} par mois selon le canton (région de prime principale). Pour chaque canton, les tableaux ci-dessous donnent quatre profils (franchise de 300 et de 2500${NB}CHF, avec et sans accident), puis les cinq premières offres pour la franchise de 300${NB}CHF avec accident. Source${T}: OFSP, primes 2027.`}
      </p>
      <div className="reperes-grille">
        {cantons.map((c) => (
          <div key={c.canton}>
            <h3>
              {NOM[locale][c.canton]}
              {MULTI.includes(c.canton) ? (en ? `, region ${c.region} (${c.commune})` : `, région ${c.region} (${c.commune})`) : c.canton === "BE" ? ` (${c.commune})` : ""}
            </h3>
            <table className="assureurs profils-reperes">
              <caption>
                {en
                  ? `Adult aged 26 or over, 2027, CHF per month: first premium in the list and average of the ${c.nombre} offers.`
                  : `Adulte de 26 ans et plus, 2027, CHF par mois${T}: première prime de la liste et moyenne des ${c.nombre} offres.`}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{en ? "Deductible, accident" : "Franchise, accident"}</th>
                  <th scope="col">{en ? "1st premium" : "1re prime"}</th>
                  <th scope="col">{en ? "Average" : "Moyenne"}</th>
                </tr>
              </thead>
              <tbody>
                {c.profils.map((p) => (
                  <tr key={`${p.franchise}${p.accident}`}>
                    <td>
                      {p.franchise}, {p.accident ? (en ? "with" : "avec") : en ? "without" : "sans"}
                    </td>
                    <td>{nf(p.premiere)}</td>
                    <td>{nf(p.moyenne)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="assureurs">
              <caption>
                {en
                  ? `First 5 of ${c.nombre} offers, adult, CHF 300 deductible, with accident cover, 2027. Average of all offers: ${chf(c.moyenne)} a month.`
                  : `5 premières offres sur ${c.nombre}, adulte, franchise 300${NB}CHF, avec accident, 2027. Moyenne de toutes les offres${T}: ${chf(c.moyenne)} par mois.`}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{en ? "Insurer and model" : "Assureur et modèle"}</th>
                  <th scope="col">{en ? "CHF / month" : "CHF / mois"}</th>
                </tr>
              </thead>
              <tbody>
                {c.offres.map((o) => (
                  <tr key={`${o.assureur}|${o.produit}`}>
                    <td>
                      {o.assureur}, {o.produit}
                    </td>
                    <td>{nf(o.mensuel)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <p className="source-outil">
        <a href={en ? PAGES_DONNEES_EN.regions : PAGES_DONNEES.regions}>{en ? "Premiums by premium region" : "Primes par région de prime"}</a>
        {en ? ": median, quartiles and extremes for five standard profiles in each region." : `${T}: médiane, quartiles et extrêmes pour cinq profils types dans chaque région.`}
      </p>
    </section>
  );
}
