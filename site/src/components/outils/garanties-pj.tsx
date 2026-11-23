"use client";
import { useRef, useState } from "react";
import { suivre } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n";
import { CONTRATS, DOMAINES, NOM_COUVERTURE, NOM_DOMAINE, NOM_STATUT, type Domaine, type Statut } from "@/lib/garanties-pj";

/* Tableau des garanties de protection juridique. Ordre alphabétique fixe ; le filtre par domaine met en évidence la
   ligne du domaine et l'indique sur chaque contrat, sans masquer ni réordonner (aucun classement). Mobile : une
   carte par contrat ; ordinateur : domaines d'abord (le filtre y agit), puis conditions et exclusions. */
const TXT = {
  fr: {
    filtre: "Mettre en évidence un domaine",
    tous: "Aucun",
    filtreAide: "L’ordre reste alphabétique. Rien n’est masqué ni classé.",
    conditions: "Plafonds, délais et choix de l’avocat",
    conditionsCap: "Conditions relevées dans les CGA de chaque contrat, ordre alphabétique",
    domainesTitre: "Domaines couverts",
    domainesCap: "Domaines du droit couverts par chaque contrat, d’après ses CGA",
    contrat: "Contrat",
    domaine: "Domaine",
    plafondCh: "Plafond par cas, Suisse",
    plafondEu: "Europe",
    plafondMonde: "Monde",
    carence: "Délai de carence",
    franchise: "Franchise",
    valeurMin: "Valeur litigieuse minimale",
    libreChoix: "Libre choix de l’avocat",
    exclusions: "Exclusions notables",
    document: "Document lu",
    voirDomaines: "Domaines couverts",
    voirExclusions: "Exclusions notables",
    variante: "Variante relevée",
    porteur: "Assureur :",
  },
  en: {
    filtre: "Highlight an area of law",
    tous: "None",
    filtreAide: "The order stays alphabetical. Nothing is hidden or ranked.",
    conditions: "Limits, waiting periods and choice of lawyer",
    conditionsCap: "Conditions read in each policy’s general terms, alphabetical order",
    domainesTitre: "Areas of law covered",
    domainesCap: "Areas of law covered by each policy, according to its general terms",
    contrat: "Policy",
    domaine: "Area",
    plafondCh: "Limit per case, Switzerland",
    plafondEu: "Europe",
    plafondMonde: "Worldwide",
    carence: "Waiting period",
    franchise: "Excess",
    valeurMin: "Minimum amount in dispute",
    libreChoix: "Free choice of lawyer",
    exclusions: "Notable exclusions",
    document: "Document read",
    voirDomaines: "Areas covered",
    voirExclusions: "Notable exclusions",
    variante: "Variant read",
    porteur: "Insurer:",
  },
};

function Icone({ s }: { s: Statut }) {
  const p = { viewBox: "0 0 16 16", width: 16, height: 16, "aria-hidden": true as const, className: `ic-statut ic-${s}` };
  if (s === "oui") return <svg {...p}><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (s === "option") return <svg {...p}><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
  if (s === "conseil") return <svg {...p}><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M8 7.2V11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="8" cy="5" r="1" fill="currentColor" /></svg>;
  if (s === "non") return <svg {...p}><path d="M4 8h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  return <svg {...p}><circle cx="8" cy="8" r="1.4" fill="currentColor" /></svg>;
}

function Statut({ s, locale, note }: { s: Statut; locale: Locale; note?: string }) {
  return (
    <span className={`statut statut-${s}`}>
      <Icone s={s} />
      <span>{NOM_STATUT[locale][s]}</span>
      {note ? <small>{note}</small> : null}
    </span>
  );
}

export function GarantiesPj({ locale }: { locale: Locale }) {
  const t = TXT[locale];
  const [dom, setDom] = useState<Domaine | null>(null);
  const mesure = useRef(false);
  const choisir = (d: Domaine | null) => {
    setDom(d);
    if (d && !mesure.current) {
      mesure.current = true;
      suivre("garanties_pj_filtre");
    }
  };
  const court = (c: (typeof CONTRATS)[number]) => `${c.assureur}, ${c.produit}`;

  return (
    <div className="garanties-pj" data-domaine={dom ?? undefined}>
      <fieldset className="filtre-domaine">
        <legend>{t.filtre}</legend>
        <div className="puces-domaine">
          <label className="pastille">
            <input type="radio" name="pj-domaine" checked={dom === null} onChange={() => choisir(null)} />
            <span>{t.tous}</span>
          </label>
          {DOMAINES.map((d) => (
            <label className="pastille" key={d}>
              <input type="radio" name="pj-domaine" checked={dom === d} onChange={() => choisir(d)} />
              <span>{NOM_DOMAINE[locale][d]}</span>
            </label>
          ))}
        </div>
        <p className="note-outil">{t.filtreAide}</p>
      </fieldset>

      {/* Mobile : cartes */}
      <ul className="cartes-pj">
        {CONTRATS.map((c) => (
          <li key={c.id} className="carte-pj">
            <h3>
              {c.assureur}
              <span>{c.produit}</span>
            </h3>
            <p className="couverture">
              {NOM_COUVERTURE[locale][c.couverture]}
              {c.variante ? ` · ${t.variante}${locale === "fr" ? "\u202f" : ""}: ${c.variante[locale]}` : ""}
              <br />
              {t.porteur} {c.porteur}
            </p>
            {dom ? (
              <p className="en-evidence">
                <b>{NOM_DOMAINE[locale][dom]}</b>
                <Statut s={c.domaines[dom].s} locale={locale} note={c.domaines[dom].note?.[locale]} />
              </p>
            ) : null}
            <dl>
              <dt>{t.plafondCh}</dt>
              <dd>{c.plafond.suisse[locale]}</dd>
              <dt>{t.plafondEu}</dt>
              <dd>{c.plafond.europe[locale]}</dd>
              <dt>{t.plafondMonde}</dt>
              <dd>{c.plafond.monde[locale]}</dd>
              <dt>{t.carence}</dt>
              <dd>{c.carence[locale]}</dd>
              <dt>{t.franchise}</dt>
              <dd>{c.franchise[locale]}</dd>
              <dt>{t.valeurMin}</dt>
              <dd>{c.valeurMin[locale]}</dd>
              <dt>{t.libreChoix}</dt>
              <dd>{c.libreChoix[locale]}</dd>
            </dl>
            <details>
              <summary>{t.voirDomaines}</summary>
              <ul className="liste-domaines">
                {DOMAINES.map((d) => (
                  <li key={d} className={dom === d ? "actif" : undefined}>
                    <span>{NOM_DOMAINE[locale][d]}</span>
                    <Statut s={c.domaines[d].s} locale={locale} note={c.domaines[d].note?.[locale]} />
                  </li>
                ))}
              </ul>
            </details>
            <details>
              <summary>{t.voirExclusions}</summary>
              <ul className="exclusions">
                {c.exclusions[locale].map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </details>
            <p className="doc">
              {t.document}{locale === "fr" ? "\u202f" : ""}: <a href={c.doc.url}>{c.doc.titre}</a>, {c.doc.version}
            </p>
          </li>
        ))}
      </ul>

      {/* Ordinateur : tableaux */}
      <div className="tables-pj">
        <h3>{t.domainesTitre}</h3>
        <div className="defile defile-domaines" tabIndex={0} role="region" aria-label={t.domainesCap}>
          <table className="assureurs table-domaines">
            <caption className="visually-hidden">{t.domainesCap}</caption>
            <thead>
              <tr>
                <th scope="col">{t.domaine}</th>
                {CONTRATS.map((c) => (
                  <th scope="col" key={c.id} title={court(c)}>
                    <b>{c.assureur}</b>
                    <span>{c.produit}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DOMAINES.map((d) => (
                <tr key={d} className={dom === d ? "actif" : undefined}>
                  <th scope="row">{NOM_DOMAINE[locale][d]}</th>
                  {CONTRATS.map((c) => (
                    <td key={c.id}>
                      <Statut s={c.domaines[d].s} locale={locale} note={c.domaines[d].note?.[locale]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>{t.conditions}</h3>
        <div className="defile">
          <table className="assureurs table-pj">
            <caption className="visually-hidden">{t.conditionsCap}</caption>
            <thead>
              <tr>
                <th scope="col">{t.contrat}</th>
                <th scope="col">{t.plafondCh}</th>
                <th scope="col">{t.plafondEu}</th>
                <th scope="col">{t.plafondMonde}</th>
                <th scope="col">{t.carence}</th>
                <th scope="col">{t.franchise}</th>
                <th scope="col">{t.libreChoix}</th>
              </tr>
            </thead>
            <tbody>
              {CONTRATS.map((c) => (
                <tr key={c.id}>
                  <th scope="row">
                    <b>{c.assureur}</b>
                    <span className="produit">{c.produit}</span>
                    <span className="type">{NOM_COUVERTURE[locale][c.couverture]}{c.variante ? `, ${c.variante[locale]}` : ""}</span>
                    <span className="type">{t.porteur} {c.porteur}</span>
                    <a className="doc" href={c.doc.url}>{c.doc.version}</a>
                  </th>
                  <td>{c.plafond.suisse[locale]}</td>
                  <td>{c.plafond.europe[locale]}</td>
                  <td>{c.plafond.monde[locale]}</td>
                  <td>{c.carence[locale]}</td>
                  <td>{c.franchise[locale]}</td>
                  <td>{c.libreChoix[locale]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>{t.exclusions}</h3>
        <dl className="exclusions-pj">
          {CONTRATS.map((c) => (
            <div key={c.id}>
              <dt>{court(c)}</dt>
              <dd>
                <ul>
                  {c.exclusions[locale].map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                {c.valeurMin[locale] ? <p className="note-outil">{t.valeurMin} : {c.valeurMin[locale]}</p> : null}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
