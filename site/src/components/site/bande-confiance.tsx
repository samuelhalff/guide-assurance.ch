/* Bande de confiance (accueil, sous l'en-tête ; pages d'outils, près de l'appel). Uniquement des faits vérifiables,
   comptés dans les données au build (src/lib/confiance.ts). Aucune note ni étoile sous 10 avis réels :
   l'emplacement « avis » reste vide tant que NEXT_PUBLIC_TRUSTPILOT_URL et la note de src/data/avis.json manquent.
   Composant serveur : ne pas l'importer depuis un composant client. */
import type { ReactNode } from "react";
import { JsonLd } from "@/components/site/json-ld";
import { AVIS_VALIDES, CONFIANCE } from "@/lib/confiance";
import { avisJsonLd } from "@/lib/confiance-core";
import { ORG_ID } from "@/lib/jsonld";
import type { Locale } from "@/lib/i18n";

export type Signal = "ofsp" | "offres" | "pj" | "gratuit" | "navigateur";
const TOUS: Signal[] = ["ofsp", "offres", "pj", "gratuit", "navigateur"];

const N = " ";
const nombre = (x: number, l: Locale) =>
  l === "fr" ? String(x).replace(/\B(?=(\d{3})+(?!\d))/g, N) : String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const dateCh = (iso: string) => iso.split("-").reverse().join(".");
const noteTxt = (x: number, l: Locale) => (l === "fr" ? x.toFixed(1).replace(".", ",") : x.toFixed(1));

const ICONE: Record<Signal, ReactNode> = {
  ofsp: (
    <>
      <circle cx="10" cy="8" r="5.5" />
      <path d="M7.6 8.1l1.7 1.7 3.2-3.3M7 12.8 6 18l4-2.1 4 2.1-1-5.2" />
    </>
  ),
  offres: <path d="M3 5h2M8 5h9M3 10h2M8 10h9M3 15h2M8 15h6" />,
  pj: <path d="M10 3v14M6 17h8M4 6.5h12M4 6.5 2 11.5a2.2 2.2 0 0 0 4 0Zm12 0-2 5a2.2 2.2 0 0 0 4 0Z" />,
  gratuit: (
    <>
      <path d="M10.6 2.8H17v6.4l-7.8 7.9-6.4-6.4Z" />
      <circle cx="13.6" cy="6.2" r="1.2" />
    </>
  ),
  navigateur: (
    <>
      <rect x="2.5" y="3.5" width="15" height="13" rx="1.5" />
      <path d="M2.5 7.5h15M8.5 12.2l1.4 1.4 2.8-2.9" />
    </>
  ),
};

function texte(s: Signal, l: Locale): ReactNode {
  const { annee, offres, regions, contratsPj } = CONFIANCE;
  const fr = l === "fr";
  switch (s) {
    case "ofsp":
      return fr ? <>Primes officielles <b>OFSP {annee}</b></> : <>Official <b>FOPH {annee}</b> premiums</>;
    case "offres":
      return fr ? (
        <><b>{nombre(offres, l)} offres</b> LAMal {annee} comparées<span className="sr"> dans les {regions} régions de primes romandes</span></>
      ) : (
        <><b>{nombre(offres, l)} offers</b> compared for {annee}<span className="sr"> across the {regions} premium regions of French-speaking Switzerland</span></>
      );
    case "pj":
      return fr ? <><b>{contratsPj} contrats</b> de protection juridique comparés</> : <><b>{contratsPj} legal protection</b> policies compared</>;
    case "gratuit":
      return fr ? <><b>Gratuit</b> et sans engagement</> : <><b>Free</b>, with no commitment</>;
    case "navigateur":
      return fr ? <>Calcul <b>dans votre navigateur</b></> : <>Worked out <b>in your browser</b></>;
  }
}

function Icone({ k }: { k: Signal }) {
  return (
    <svg className="confiance-icone" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {ICONE[k]}
    </svg>
  );
}

/* Cinq étoiles remplies au prorata de la note réelle (lecture d'écran : la note en texte, juste après). */
function Etoiles({ note }: { note: number }) {
  const pct = Math.max(0, Math.min(100, (note / 5) * 100));
  const etoile = "M10 1.8l2.4 5 5.4.6-4 3.7 1.1 5.4L10 13.8l-4.8 2.7 1.1-5.4-4-3.7 5.4-.6Z";
  const rangee = (cls: string) => (
    <svg className={cls} viewBox="0 0 100 20" width="80" height="16" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={etoile} transform={`translate(${i * 20} 0)`} />
      ))}
    </svg>
  );
  return (
    <span className="confiance-etoiles" style={{ "--remplissage": `${pct}%` } as React.CSSProperties}>
      {rangee("etoiles-fond")}
      {rangee("etoiles-plein")}
    </span>
  );
}

/* Note réelle relevée chez la source, avec le nombre d'avis et la date du relevé ; rien sans configuration complète
   ni sous NOMBRE_MIN_AVIS avis (src/lib/confiance-core.ts). */
function AvisSource({ locale }: { locale: Locale }) {
  const v = AVIS_VALIDES;
  if (!v) return null;
  const fr = locale === "fr";
  return (
    <li className="confiance-avis">
      <Etoiles note={v.note} />
      <a href={v.url} rel="noopener">
        <b>{noteTxt(v.note, locale)}{fr ? `${N}/${N}5` : "/5"}</b> {fr ? `sur ${v.source}, ${nombre(v.nombre, locale)} avis` : `on ${v.source}, ${nombre(v.nombre, locale)} reviews`}
        <span className="confiance-date">{fr ? ` (relevé le ${dateCh(v.date)})` : ` (as of ${dateCh(v.date)})`}</span>
      </a>
    </li>
  );
}

export function BandeConfiance({ locale = "fr", signaux = TOUS, compacte = false }: { locale?: Locale; signaux?: Signal[]; compacte?: boolean }) {
  const ld = avisJsonLd(AVIS_VALIDES, ORG_ID);
  const liste = (
    <ul className="confiance-liste" aria-label={locale === "fr" ? "Repères" : "Key facts"}>
      <AvisSource locale={locale} />
      {signaux.map((s) => (
        <li key={s}>
          <Icone k={s} />
          <span>{texte(s, locale)}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <>
      {ld && !compacte ? <JsonLd data={ld} /> : null}
      {compacte ? (
        <div className="confiance confiance-compacte">{liste}</div>
      ) : (
        <section className="confiance confiance-bande">
          <div className="wrap">{liste}</div>
        </section>
      )}
    </>
  );
}
