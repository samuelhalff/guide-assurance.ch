import { N } from "@/components/donnees/commun";
import { GraphiqueSerie, type PointIsole } from "@/components/donnees/graphique-serie";
import { NOTES_BNS } from "@/lib/engines/historique-3a";
import { PUBLIE_LE_SNB, SOURCE_SNB, decimalesSnb, moisTexte, reperes, type SerieSnb } from "@/lib/engines/taux-snb";
import { dateLongue, type Locale } from "@/lib/i18n";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/* Section « série longue de la BNS » des pages de taux 3a (historique) et de libre passage : commentaire calculé sur
   la série (dernier mois, douze mois plus tôt, plus haut et plus bas), graphique de la moyenne avec la bande du
   premier au troisième quartile, repères des décisions de la BNS quand une note existe (historique-3a.ts), ligne de
   source et lien vers le portail de la BNS (la série brute n'est pas republiée ici). La série de la BNS n'est pas notre relevé : la section le dit, la page garde ses relevés du lundi. */

const tx = (x: number, l: Locale) => (l === "fr" ? `${decimalesSnb(x).replace(".", ",")}${N}%` : `${decimalesSnb(x)}%`);
const nb = (x: number, l: Locale) => (l === "fr" ? decimalesSnb(x).replace(".", ",") : decimalesSnb(x));
const points = (x: number, l: Locale) => {
  const v = l === "fr" ? decimalesSnb(Math.abs(x)).replace(".", ",") : decimalesSnb(Math.abs(x));
  return l === "fr" ? `${v} point${Math.abs(x) >= 2 ? "s" : ""}` : `${v} percentage point${Math.abs(x) === 1 ? "" : "s"}`;
};

export function SectionTauxBns({
  serie,
  locale,
  id,
  titre,
  produit,
  nosReleves,
  tableau = true,
  isoles = [],
  legendeIsoles,
  classe = "reperes-statiques",
  classeTitre,
}: {
  serie: SerieSnb;
  locale: Locale;
  id: string;
  titre: string;
  /* « des comptes 3a » / "of pillar 3a accounts" */
  produit: { fr: string; en: string };
  /* Phrase qui distingue la série de la BNS des relevés de la page. */
  nosReleves: string;
  tableau?: boolean;
  /* Points isolés superposés à la série (relevés d'archives par banque, voir pointsArchives dans historique-3a.ts). */
  isoles?: PointIsole[];
  legendeIsoles?: string;
  /* Classes de la section et du titre (pages de données par défaut ; page de libre passage : prose-lp). */
  classe?: string;
  classeTitre?: string;
}) {
  const fr = locale === "fr";
  const r = reperes(serie.points);
  const d = r.dernier;
  const prod = fr ? produit.fr : produit.en;
  const libelle = fr ? serie.libelle_fr : serie.libelle_en;
  const p1 = fr
    ? `Selon la Banque nationale suisse (BNS), le taux moyen ${prod} était de ${tx(d.moyenne, "fr")} en ${moisTexte(d.mois, "fr")}, avec une médiane de ${tx(d.mediane, "fr")} ; la moitié centrale des taux publiés allait de ${tx(d.q25, "fr")} à ${tx(d.q75, "fr")}.`
    : `According to the Swiss National Bank (SNB), the mean interest rate ${prod} was ${tx(d.moyenne, "en")} in ${moisTexte(d.mois, "en")}, with a median of ${tx(d.mediane, "en")}; the middle half of published rates ran from ${tx(d.q25, "en")} to ${tx(d.q75, "en")}.`;
  const a = r.ilYa12Mois, e = r.ecart12Mois;
  const p2 =
    a === null || e === null
      ? ""
      : fr
        ? `Douze mois plus tôt, en ${moisTexte(a.mois, "fr")}, il était de ${tx(a.moyenne, "fr")}${e === 0 ? " : il n’a pas bougé." : ` : ${e < 0 ? "un recul" : "une hausse"} de ${points(e, "fr")} en un an.`}`
        : `Twelve months earlier, in ${moisTexte(a.mois, "en")}, it was ${tx(a.moyenne, "en")}${e === 0 ? ": unchanged." : `: ${e < 0 ? "down" : "up"} ${points(e, "en")} in a year.`}`;
  const p3 = fr
    ? `Depuis le début de la série, en ${moisTexte(r.premier.mois, "fr")}, la moyenne la plus haute est de ${tx(r.plusHaut.moyenne, "fr")} (${moisTexte(r.plusHaut.mois, "fr")}) et la plus basse de ${tx(r.plusBas.moyenne, "fr")} (${moisTexte(r.plusBas.mois, "fr")}).`
    : `Since the series began in ${moisTexte(r.premier.mois, "en")}, the highest mean is ${tx(r.plusHaut.moyenne, "en")} (${moisTexte(r.plusHaut.mois, "en")}) and the lowest ${tx(r.plusBas.moyenne, "en")} (${moisTexte(r.plusBas.mois, "en")}).`;
  const desc = `${p1} ${p3}`;
  const titreFig = fr ? `Taux moyen ${prod} selon la BNS, chaque mois depuis ${moisTexte(r.premier.mois, "fr")}` : `Mean interest rate ${prod} according to the SNB, monthly since ${moisTexte(r.premier.mois, "en")}`;
  const lienBns = fr ? SOURCE_SNB.page_fr : SOURCE_SNB.page_en;
  return (
    <section className={classe} id={id}>
      <h2 className={classeTitre}>{titre}</h2>
      <p>{p1}</p>
      {p2 ? <p>{p2}</p> : null}
      <p>{p3}</p>
      <GraphiqueSerie
        id={`g-${id}`}
        locale={locale}
        titre={titreFig}
        desc={desc}
        points={serie.points.map((p) => ({ date: p.mois, valeur: p.moyenne, bas: p.q25, haut: p.q75 }))}
        bande
        isoles={isoles}
        reperes={NOTES_BNS.map((n) => ({ date: n.date, libelle: fr ? n.decision_fr : n.decision_en }))}
        legende={{
          ligne: fr ? "Taux moyen (BNS)" : "Mean rate (SNB)",
          bande: fr ? "Du premier au troisième quartile" : "First to third quartile",
          isoles: legendeIsoles,
          reperes: fr ? "Décision de politique monétaire de la BNS" : "SNB monetary policy decision",
        }}
      />
      <p>{nosReleves}</p>
      {tableau ? (
        <Table variant="chiffres" className="table-donnees">
          <TableCaption>{fr ? `Taux ${prod} selon la BNS, dernier mois publié de chaque année, en % par an` : `Interest rate ${prod} according to the SNB, latest month published in each year, in % a year`}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{fr ? "Mois" : "Month"}</TableHead>
              <TableHead scope="col">{fr ? "Moyenne" : "Mean"}</TableHead>
              <TableHead scope="col">{fr ? "Médiane" : "Median"}</TableHead>
              <TableHead scope="col">{fr ? "1er au 3e quartile" : "1st to 3rd quartile"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...r.finsAnnee].reverse().map((p) => (
              <TableRow key={p.mois}>
                <TableHead scope="row"><time dateTime={p.mois}>{moisTexte(p.mois, locale)}</time></TableHead>
                <TableCell><b>{nb(p.moyenne, locale)}</b></TableCell>
                <TableCell>{nb(p.mediane, locale)}</TableCell>
                <TableCell>{fr ? `${nb(p.q25, "fr")} à ${nb(p.q75, "fr")}` : `${nb(p.q25, "en")} to ${nb(p.q75, "en")}`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      <p className="source-bns">
        {fr ? "Source : " : "Source: "}
        <a href={lienBns}>
          {fr ? SOURCE_SNB.organisme_fr : SOURCE_SNB.organisme_en}, {fr ? `portail de données, « ${SOURCE_SNB.titre_fr} »` : `data portal, “${SOURCE_SNB.titre_en}”`}
        </a>{" "}
        (cube {SOURCE_SNB.cube}), {fr ? `série « ${libelle} » : moyenne non pondérée, quartiles et médiane, en pour-cent, fin de mois` : `series “${libelle}”: unweighted average, quartiles and median, in percent, end of month`}.{" "}
        {fr ? `Publication de la BNS du ${dateLongue(PUBLIE_LE_SNB, "fr")}.` : `SNB release of ${dateLongue(PUBLIE_LE_SNB, "en")}.`}
      </p>
      <p className="telechargement">
        <a href={lienBns} rel="noopener">
          {fr ? "Télécharger la série sur le portail de la BNS" : "Download the series from the SNB data portal"}
        </a>{" "}
        <span>
          {fr
            ? `Valeurs mensuelles complètes (moyenne, quartiles, médiane) sur data.snb.ch, selon les conditions d’utilisation de la BNS. À citer${N}: «${N}Banque nationale suisse (BNS), data.snb.ch${N}».`
            : "Full monthly values (mean, quartiles, median) on data.snb.ch, under the SNB’s terms of use. Cite as: “Swiss National Bank (SNB), data.snb.ch”."}
        </span>
      </p>
    </section>
  );
}
