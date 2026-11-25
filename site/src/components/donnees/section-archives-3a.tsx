import { ListeArchives } from "@/components/donnees/liste-archives";
import { N, Telechargement, nombre } from "@/components/donnees/commun";
import { HISTORIQUE_ARCHIVES, MIN_POINTS, datePoint, enMois, recommandation, type SerieBanque } from "@/lib/engines/historique-3a";
import { SNB_3A } from "@/lib/engines/taux-snb";
import type { Locale } from "@/lib/i18n";

/* Taux de chaque banque avant nos relevés, reconstitués à partir des copies archivées (Internet Archive) des pages
   officielles des banques (historique-3a.ts, HISTORIQUE_ARCHIVES). Un petit graphique par banque, même échelle pour
   toutes, avec la moyenne mensuelle de la BNS en filigrane ; un point par copie, un trait seulement là où le taux est
   attesté (deux copies successives au même taux, ou ancien taux jusqu'à la date d'entrée en vigueur du nouveau :
   traits() dans historique-3a.ts). Rien n'est interpolé. Chaque point se retrouve dans la liste dépliable de la
   banque (chargée à l'ouverture, liste-archives.tsx), avec un lien vers sa copie archivée. Banques en ordre alphabétique : aucune n'est mise en avant. */

export const CSV_ARCHIVES = "/data/taux-3a-archives.csv";
const H = HISTORIQUE_ARCHIVES;
const dc = (iso: string) => iso.split("-").reverse().join(".");
const tous = H.banques.flatMap((b) => b.points);
const X0 = Math.min(...tous.map((p) => enMois(datePoint(p))));
const X1 = Math.max(...tous.map((p) => enMois(datePoint(p))));
const YMAX = Math.max(1, Math.ceil(Math.max(...tous.map((p) => p.taux)) * 2) / 2);
export const ANNEE_DEBUT_ARCHIVES = Math.floor(X0 / 12);

/* Géométrie commune des petits graphiques (même échelle pour toutes les banques). */
const W = 320, Hh = 140, g = 30, d = 8, h = 8, bas = 22;
const X = (t: number) => g + ((t - X0) / (X1 - X0)) * (W - g - d);
const Y = (v: number) => h + (1 - v / YMAX) * (Hh - h - bas);
const f = (x: number) => Math.round(x); // unité du viewBox : assez fin pour 320 px, et HTML plus léger
/* Moyenne mensuelle de la BNS, dessinée une fois et reprise dans chaque graphique (<use>). */
function RefBns() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <defs>
        <polyline id="arch-bns" points={SNB_3A.points.map((p) => `${f(X(enMois(p.mois)))},${f(Y(p.moyenne))}`).join(" ")} />
      </defs>
    </svg>
  );
}

function Mini({ b, locale }: { b: SerieBanque; locale: Locale }) {
  const fr = locale === "fr";
  const chemin = b.traits.map((t) => `M${f(X(enMois(t.debut)))} ${f(Y(t.taux))}H${f(X(enMois(t.fin)))}`).join("");
  const graduations = Array.from({ length: Math.floor(YMAX) + 1 }, (_, i) => i);
  const annees = Array.from({ length: Math.floor(X1 / 12) - Math.ceil(X0 / 12) + 1 }, (_, i) => Math.ceil(X0 / 12) + i).filter((a) => a % 5 === 0);
  const t = (x: number) => (fr ? `${nombre(x, "fr", 2)}${N}%` : `${nombre(x, "en", 2)}%`);
  const min = Math.min(...b.points.map((p) => p.taux)), max = Math.max(...b.points.map((p) => p.taux));
  const desc = fr
    ? `${b.points.length} copies archivées du ${dc(b.points[0].date_archive)} au ${dc(b.points[b.points.length - 1].date_archive)} ; taux lus de ${t(min)} à ${t(max)}. Le détail est dans le tableau dépliable.`
    : `${b.points.length} archived copies from ${dc(b.points[0].date_archive)} to ${dc(b.points[b.points.length - 1].date_archive)}; rates read from ${t(min)} to ${t(max)}. Details in the expandable table.`;
  return (
    <svg viewBox={`0 0 ${W} ${Hh}`} role="img" aria-labelledby={`arch-${b.id}-t arch-${b.id}-d`}>
      <title id={`arch-${b.id}-t`}>{fr ? `Taux 3a de ${b.banque} selon les copies archivées` : `${b.banque} pillar 3a rate from archived copies`}</title>
      <desc id={`arch-${b.id}-d`}>{desc}</desc>
      {graduations.map((v) => (
        <g key={v}>
          <line className="grille" x1={g} x2={W - d} y1={Y(v)} y2={Y(v)} />
          <text className="axe" x={g - 5} y={Y(v) + 5} textAnchor="end">{v}</text>
        </g>
      ))}
      {annees.map((a) => (
        <text key={a} className="axe" x={X(a * 12)} y={Hh - 4} textAnchor="middle">{a}</text>
      ))}
      <use className="ligne-bns" href="#arch-bns" />
      {chemin ? <path className="palier" d={chemin} /> : null}
      {b.points.map((p) => (
        <circle key={`${p.date_archive}-${p.taux}`} className="point-archive" cx={f(X(enMois(datePoint(p))))} cy={f(Y(p.taux))} r={2.6} />
      ))}
    </svg>
  );
}

export function SectionArchives3a({ locale, titre, intro }: { locale: Locale; titre: string; intro: string[] }) {
  const fr = locale === "fr";
  const insuff = H.insuffisants.map((b) => b.banque);
  /* Copies qui donnent un taux recommandé (Raiffeisen Suisse) : la note couvre toutes celles des données. */
  const recos = H.banques.flatMap((b) => b.points.filter(recommandation));
  const derniereReco = recos.map((p) => p.date_archive).reduce((a, b) => (b > a ? b : a), "");
  return (
    <section className="reperes-statiques" id="archives">
      <h2>{titre}</h2>
      {intro.map((p) => (
        <p key={p.slice(0, 32)}>{p}</p>
      ))}
      {recos.length ? (
        <p>
          {fr
            ? `Raiffeisen${N}: jusqu’à la copie du ${dc(derniereReco)}, la page archivée donne le taux recommandé par Raiffeisen Suisse aux banques Raiffeisen locales, qui pouvaient s’en écarter${N}; ces ${recos.length} copies sont marquées «${N}taux recommandé${N}» dans la liste et dans le fichier CSV.`
            : `Raiffeisen: up to the copy of ${dc(derniereReco)}, the archived page gives the rate recommended by Raiffeisen Switzerland to the local Raiffeisen banks, which could depart from it; these ${recos.length} copies are marked “recommended rate” in the list and in the CSV file.`}
        </p>
      ) : null}
      <RefBns />
      <div className="archives-grille">
        {H.banques.map((b) => (
          <figure key={b.id} className="graphique-3a mini-banque" id={`archives-${b.id}`}>
            <figcaption className="mini-titre">
              <b>{b.banque}</b>{" "}
              <span>
                {fr
                  ? `${b.points.length} copies, ${b.points[0].date_archive.slice(0, 4)} à ${b.points[b.points.length - 1].date_archive.slice(0, 4)}`
                  : `${b.points.length} copies, ${b.points[0].date_archive.slice(0, 4)} to ${b.points[b.points.length - 1].date_archive.slice(0, 4)}`}
              </span>
            </figcaption>
            <Mini b={b} locale={locale} />
            <ListeArchives
              id={b.id}
              locale={locale}
              csv={CSV_ARCHIVES}
              titre={fr ? `Les ${b.points.length} copies archivées de ${b.banque}` : `The ${b.points.length} archived copies for ${b.banque}`}
            />
          </figure>
        ))}
      </div>
      <p className="graphique-3a legende-archives">
        <span className="cle point-archive">{fr ? "Taux lu dans une copie archivée" : "Rate read in an archived copy"}</span>{" "}
        <span className="cle palier">{fr ? "Même taux attesté entre deux copies" : "Same rate attested between two copies"}</span>{" "}
        <span className="cle ligne-bns">{fr ? "Moyenne mensuelle de la BNS" : "SNB monthly average"}</span>
      </p>
      {insuff.length ? (
        <p>
          {fr
            ? `Historique insuffisant (moins de ${MIN_POINTS} copies lisibles)${N}: ${insuff.join(", ")}.`
            : `Insufficient history (fewer than ${MIN_POINTS} readable copies): ${insuff.join(", ")}.`}
        </p>
      ) : null}
      <Telechargement
        href={CSV_ARCHIVES}
        libelle={fr ? "Télécharger les copies archivées (CSV)" : "Download the archived readings (CSV)"}
        detail={
          fr
            ? `Une ligne par copie retenue (points ambigus exclus)${N}: date de la copie, banque, taux, date d’entrée en vigueur si la page l’indique, adresse de la copie archivée et de la page d’origine. Licence CC${N}BY${N}4.0, en citant «${N}Guide Assurance, d’après les copies archivées (Internet Archive) des pages des banques${N}».`
            : "One row per copy kept (ambiguous points excluded): copy date, bank, rate, date in force if the page states it, address of the archived copy and of the original page. Licence CC BY 4.0, citing “Guide Assurance, from archived copies (Internet Archive) of the banks’ pages”."
        }
      />
    </section>
  );
}
