import resume from "@/data/primes-2027-resume.json";
import { Depliable } from "@/components/controles";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Locale } from "@/lib/i18n";
import { itemListLd } from "@/lib/jsonld";
import { PAGES_DONNEES, PAGES_DONNEES_EN } from "@/lib/nav";
import { chf as chfBase, nombre as formaterNombre, ESPACE_FINE as T, INSECABLE as NB } from "@/lib/nombres";

/* Tableau statique, lisible sans JavaScript : pour chaque canton, région de prime la plus peuplée, adulte de 26 ans et plus.
   Quatre profils (franchise 300 et 2500, avec et sans accident) : première prime de la liste et moyenne des offres ;
   puis les cinq premières offres du profil franchise 300 avec accident.
   Données : site/src/data/primes-2027-resume.json (data/scripts/build_comparateur_2027.py). */
type Offre = { assureur: string; produit: string; type: string; mensuel: number };
type ProfilResume = { franchise: number; accident: boolean; premiere: number; moyenne: number; nombre: number };
type CantonResume = { canton: string; region: number; commune: string; nombre: number; moyenne: number; offres: Offre[]; profils: ProfilResume[] };
const R = resume as { cantons: CantonResume[] };

const NOM = {
  fr: { GE: "Genève", VD: "Vaud", VS: "Valais", FR: "Fribourg", NE: "Neuchâtel", JU: "Jura", BE: "Jura bernois" },
  en: { GE: "Geneva", VD: "Vaud", VS: "Valais", FR: "Fribourg", NE: "Neuchâtel", JU: "Jura", BE: "Bernese Jura" },
} as Record<Locale, Record<string, string>>;
const MULTI = ["VD", "VS", "FR"];

const titreCanton = (c: CantonResume, locale: Locale) =>
  `${NOM[locale][c.canton]}${MULTI.includes(c.canton) ? (locale === "en" ? `, region ${c.region} (${c.commune})` : `, région ${c.region} (${c.commune})`) : c.canton === "BE" ? ` (${c.commune})` : ""}`;

/* Offre(s) à la prime la plus basse du profil de référence (franchise 300, avec accident), égalités comprises. */
const plusBasses = (c: CantonResume) => c.offres.filter((o) => o.mensuel === c.offres[0].mensuel);
const modele = (os: Offre[], locale: Locale) =>
  os.map((o) => (locale === "en" ? `${o.assureur}, ${o.produit} model` : `${o.assureur}, modèle ${o.produit}`)).join(locale === "en" ? " and " : " et ");

/* Liste JSON-LD : la prime la plus basse de chaque canton, dans l'ordre des blocs affichés (sans ordre de classement entre cantons). */
export function reperesListeLd(locale: Locale, id: string) {
  const en = locale === "en";
  return itemListLd({
    id,
    name: en ? "Lowest 2027 premium in each canton, adult, CHF 300 deductible, with accident cover" : "Prime 2027 la plus basse de chaque canton, adulte, franchise 300 CHF, avec accident",
    order: "Unordered",
    items: R.cantons.map((c) => {
      const m = formaterNombre(c.offres[0].mensuel / 100, 2, locale);
      return {
        name: `${titreCanton(c, locale)}, ${modele(plusBasses(c), locale)}`,
        description: en ? `Lowest monthly premium in 2027 for this profile: CHF ${m}.` : `Prime mensuelle 2027 la plus basse pour ce profil : ${m} CHF.`,
      };
    }),
  });
}

export function TableauReperes({ locale = "fr", replie = false }: { locale?: Locale; replie?: boolean }) {
  const en = locale === "en";
  const nf = (c: number) => formaterNombre(c / 100, 2, locale);
  const cantons = R.cantons;
  const bas = cantons.map((c) => c.offres[0].mensuel);
  const min = Math.min(...bas);
  const max = Math.max(...bas);
  const chf = (c: number) => chfBase(c / 100, locale, 2, NB, NB);
  const grille = (
      <div className="reperes-grille">
        {cantons.map((c) => (
          <div key={c.canton}>
            <h3>
              {NOM[locale][c.canton]}
              {MULTI.includes(c.canton) ? (en ? `, region ${c.region} (${c.commune})` : `, région ${c.region} (${c.commune})`) : c.canton === "BE" ? ` (${c.commune})` : ""}
            </h3>
            <p>
              {en
                ? `For ${titreCanton(c, locale)}, the lowest monthly premium in 2027 for an adult aged 26 or over, with a CHF 300 deductible and accident cover, is offered by ${modele(plusBasses(c), locale)}, at ${chf(c.offres[0].mensuel)}.`
                : `Pour ${titreCanton(c, locale)}, la prime mensuelle 2027 la plus basse d’un adulte de 26 ans et plus, avec une franchise de 300${NB}CHF et la couverture accident, est proposée par ${modele(plusBasses(c), locale)}, à ${chf(c.offres[0].mensuel)}.`}
            </p>
            <Table variant="chiffres" className="profils-reperes">
              <TableCaption>
                {en
                  ? `Adult aged 26 or over, 2027, CHF per month: first premium in the list and average of the ${c.nombre} offers.`
                  : `Adulte de 26 ans et plus, 2027, CHF par mois${T}: première prime de la liste et moyenne des ${c.nombre} offres.`}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{en ? "Deductible, accident" : "Franchise, accident"}</TableHead>
                  <TableHead scope="col">{en ? "1st premium" : "1re prime"}</TableHead>
                  <TableHead scope="col">{en ? "Average" : "Moyenne"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.profils.map((p) => (
                  <TableRow key={`${p.franchise}${p.accident}`}>
                    <TableCell>
                      {p.franchise}, {p.accident ? (en ? "with" : "avec") : en ? "without" : "sans"}
                    </TableCell>
                    <TableCell>{nf(p.premiere)}</TableCell>
                    <TableCell>{nf(p.moyenne)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Table variant="chiffres">
              <TableCaption>
                {en
                  ? `First 5 of ${c.nombre} offers, adult, CHF 300 deductible, with accident cover, 2027. Average of all offers: ${chf(c.moyenne)} a month.`
                  : `5 premières offres sur ${c.nombre}, adulte, franchise 300${NB}CHF, avec accident, 2027. Moyenne de toutes les offres${T}: ${chf(c.moyenne)} par mois.`}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{en ? "Rank" : "Rang"}</TableHead>
                  <TableHead scope="col">{en ? "Insurer and model" : "Assureur et modèle"}</TableHead>
                  <TableHead scope="col">{en ? "CHF / month" : "CHF / mois"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.offres.map((o, i) => (
                  <TableRow key={`${o.assureur}|${o.produit}`}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      {o.assureur}, {o.produit}
                    </TableCell>
                    <TableCell>{nf(o.mensuel)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>
  );
  return (
    <section className="reperes-statiques" aria-labelledby="reperes-titre">
      <h2 id="reperes-titre">{en ? "How much does basic insurance cost an adult in 2027?" : `Combien coûte l’assurance de base d’un adulte en 2027${T}?`}</h2>
      <p>
        {en
          ? `For an adult aged 26 or over, with a CHF 300 deductible and accident cover, the first premium in the list ranges from ${chf(min)} to ${chf(max)} a month depending on the canton (main premium region). For each canton, the tables below show four profiles (CHF 300 and CHF 2,500 deductible, with and without accident cover), followed by the first five offers for the CHF 300 deductible with accident cover. Source: FOPH (OFSP), 2027 premiums.`
          : `Pour un adulte de 26 ans et plus, avec une franchise de 300${NB}CHF et la couverture accident, la première prime de la liste va de ${chf(min)} à ${chf(max)} par mois selon le canton (région de prime principale). Pour chaque canton, les tableaux ci-dessous donnent quatre profils (franchise de 300 et de 2500${NB}CHF, avec et sans accident), puis les cinq premières offres pour la franchise de 300${NB}CHF avec accident. Source${T}: OFSP, primes 2027.`}
      </p>
      {replie ? (
        <Depliable className="reperes-details" titre={en ? "Show the reference premiums for all 26 cantons" : "Voir les primes repères des 26 cantons"}>
          {grille}
        </Depliable>
      ) : grille}
      <p className="source-outil">
        <a href={en ? PAGES_DONNEES_EN.regions : PAGES_DONNEES.regions}>{en ? "Premiums by premium region" : "Primes par région de prime"}</a>
        {en ? ": median, quartiles and extremes for five standard profiles in each region." : `${T}: médiane, quartiles et extrêmes pour cinq profils types dans chaque région.`}
      </p>
    </section>
  );
}
