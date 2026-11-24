import { CompteARebours } from "@/components/widget/compte-a-rebours";
import { ANNEE_BAROMETRE as A, ANNEE_PREC as P, DATE_OFSP, DONNEES, chf, infoCanton, pct, type CantonB, type RegionB } from "@/lib/barometre";
import { COMPTES_3A, RELEVE_LE, tauxEn, tauxFr } from "@/lib/taux3a";
import { dateLongue, type Locale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { OUTILS, OUTILS_EN } from "@/lib/nav";
import { MAJ_IDEES } from "@/lib/pages-idees";
import { ESPACE_FINE as T } from "@/lib/nombres";

/* Widgets intégrables (iframes) : aucun traceur, aucun cookie, aucun stockage, aucun appel réseau.
   Chaque lien s'ouvre dans un nouvel onglet ; les liens vers le site portent utm_source=widget (sans identifiant). */
const utm = (path: string, w: string) => `${SITE_URL}${path}?utm_source=widget&utm_medium=iframe&utm_campaign=${w}`;
const ext = { target: "_blank", rel: "noopener" } as const;

function Pied({ l, w, date }: { l: Locale; w: string; date: string }) {
  return (
    <p className="w-pied">
      <span className="w-source">
        {l === "fr" ? `Source${T}: ` : "Source: "}
        <a href={utm(l === "fr" ? "/" : "/en/", w)} {...ext}>Guide Assurance</a>
      </span>
      <span>{l === "fr" ? `Données du ${dateLongue(date, l)}` : `Data as of ${dateLongue(date, l)}`}</span>
    </p>
  );
}

/* ---- Délai de résiliation ---- */
export function WidgetDelai({ l, aujourdhuiIso }: { l: Locale; aujourdhuiIso: string }) {
  return (
    <div className="w">
      <CompteARebours l={l} aujourdhuiIso={aujourdhuiIso} lien={utm(l === "fr" ? OUTILS.lettre : OUTILS_EN.lettre, "delai")} />
      <Pied l={l} w="delai" date={MAJ_IDEES} />
    </div>
  );
}

/* ---- Prime médiane d'une région, ou moyennes cantonales ---- */
export const cleRegion = (c: string, r: number) => `${c.toLowerCase()}-${r}`;
export const regionsWidget = () => DONNEES.cantons.flatMap((c) => c.regions.map((r) => ({ cle: cleRegion(c.code, r.region), c, r })));
export const regionParCle = (cle: string) => regionsWidget().find((x) => x.cle === cle);
export const nomRegion = (c: CantonB, r: RegionB, l: Locale) => {
  const nom = l === "fr" ? infoCanton(c.code).fr : infoCanton(c.code).en;
  return c.regions.length > 1 ? (l === "fr" ? `${nom}, région ${r.region} (${r.commune})` : `${nom}, region ${r.region} (${r.commune})`) : nom;
};

export function WidgetPrime({ l, cle }: { l: Locale; cle?: string }) {
  const fr = l === "fr";
  const x = cle ? regionParCle(cle) : undefined;
  const lien = utm(fr ? OUTILS.comparateur : OUTILS_EN.comparateur, "prime");
  if (!x) {
    const cs = [...DONNEES.cantons].sort((a, b) => b.officiel.adulte - a.officiel.adulte);
    return (
      <div className="w">
        <p className="w-titre">{fr ? `Prime moyenne ${A} d’un adulte, assurance de base` : `${A} average adult premium, basic health insurance`}</p>
        <ul className="w-liste">
          {cs.map((c) => (
            <li key={c.code}>
              <span>{fr ? infoCanton(c.code).fr : infoCanton(c.code).en}</span>
              <span><b>{chf(c.officiel.adulte, l)}</b> <span className="w-source">{pct(c.officiel.variation_pct, l)}</span></span>
            </li>
          ))}
        </ul>
        <p className="w-texte">
          {fr ? `Par mois, toutes franchises et tous modèles, variation par rapport à ${P}. OFSP.` : `Per month, all deductibles and models, change since ${P}. FOPH.`}{" "}
          <a className="w-action" href={lien} {...ext}>{fr ? "Comparer les primes" : "Compare premiums"}</a>
        </p>
        <Pied l={l} w="prime" date={DATE_OFSP} />
      </div>
    );
  }
  const p = x.r.profils.find((q) => q.cle === "adulte_300")!;
  return (
    <div className="w">
      <p className="w-titre">{fr ? `Prime médiane ${A}, ${nomRegion(x.c, x.r, l)}` : `${A} median premium, ${nomRegion(x.c, x.r, l)}`}</p>
      <p className="w-chiffre">
        {chf(p.standard.med, l)}
        <small>{fr ? "par mois" : "a month"}</small>
      </p>
      <p className="w-texte">
        {fr
          ? `Adulte de 26 ans et plus, franchise de 300 francs, accident inclus, modèle standard. La moitié des ${p.standard.n} offres se situent entre ${chf(p.standard.q1, l)} et ${chf(p.standard.q3, l)} ; moyenne cantonale de l’OFSP, tous modèles confondus${T}: ${chf(x.c.officiel.adulte, l)} (${pct(x.c.officiel.variation_pct, l)}).`
          : `Adult aged 26 or over, CHF 300 deductible, accident cover, standard model. Half of the ${p.standard.n} offers lie between ${chf(p.standard.q1, l)} and ${chf(p.standard.q3, l)}; FOPH cantonal average, all models: ${chf(x.c.officiel.adulte, l)} (${pct(x.c.officiel.variation_pct, l)}).`}
      </p>
      <p className="w-texte">
        <a className="w-action" href={lien} {...ext}>{fr ? "Voir les primes de ma commune" : "See the premiums for my municipality"}</a>
      </p>
      <Pied l={l} w="prime" date={DONNEES.date_donnees} />
    </div>
  );
}

/* ---- Taux 3a ---- */
export function WidgetTaux3a({ l }: { l: Locale }) {
  const fr = l === "fr";
  const t = COMPTES_3A.map((c) => c.taux).sort((a, b) => a - b);
  const med = t.length % 2 ? t[(t.length - 1) / 2] : (t[t.length / 2 - 1] + t[t.length / 2]) / 2;
  const f = fr ? tauxFr : tauxEn;
  const fx = (v: number) => f(v).replace(" %", `${" "}%`);
  return (
    <div className="w">
      <p className="w-titre">{fr ? "Taux d’intérêt des comptes 3a" : "Pillar 3a account interest rates"}</p>
      <p className="w-chiffre">
        {fx(t[t.length - 1])}
        <small>{fr ? "le plus élevé" : "highest"}</small>
      </p>
      <ul className="w-liste">
        <li><span>{fr ? "Taux médian" : "Median rate"}</span><b>{fx(med)}</b></li>
        <li><span>{fr ? "Taux le plus bas" : "Lowest rate"}</span><b>{fx(t[0])}</b></li>
        <li><span>{fr ? "Comptes relevés" : "Accounts checked"}</span><b>{t.length}</b></li>
      </ul>
      <p className="w-texte">
        {fr ? "Taux de base par an, relevés sur les pages des banques ; ils peuvent changer à tout moment. " : "Base rates per year, read on the banks’ own pages; they can change at any time. "}
        <a className="w-action" href={utm(fr ? OUTILS.taux3a : OUTILS_EN.taux3a, "taux3a")} {...ext}>{fr ? "Voir tous les taux" : "See every rate"}</a>
      </p>
      <Pied l={l} w="taux3a" date={RELEVE_LE} />
    </div>
  );
}
