import { COMPTES_3A, RELEVE_LE, dateCh, tauxEn, tauxFr } from "@/lib/taux3a";
import { IconeTelephone, LienRappel } from "@/components/demande/lien-rappel";
import type { Locale } from "@/lib/i18n";

/* Tableau des taux 3a, rendu côté serveur (lisible sans JavaScript). Mobile : une carte par compte ; ordinateur :
   tableau. Ordre : taux décroissant, puis banque. Aucune ligne payée, aucun « meilleur ». */
const TXT = {
  fr: {
    ordre: "Trié du taux le plus élevé au plus bas, puis par nom de banque.",
    caption: (d: string) => `Taux des comptes 3a, en % par an, relevés le ${d} sur les pages des banques`,
    thBanque: "Banque et compte",
    thTaux: "Taux",
    thConditions: "Conditions",
    thReleve: "Relevé",
    par: "par an",
    releve: (d: string) => `Taux relevé le ${d}`,
    depuis: (d: string) => `en vigueur depuis le ${d}`,
    source: "page de la banque",
    integrite:
      "Aucune banque ne paie pour figurer ici ni pour sa place dans la liste. Les taux sont variables : la banque peut les changer à tout moment, et son site fait foi.",
    titres:
      "Les solutions 3a en titres (fonds de placement) ne figurent pas dans cette liste, car elles ne versent pas d’intérêt : leur rendement dépend des marchés et des frais du fonds.",
    rappelQ: "Une question sur votre 3e pilier ?",
    rappel: "Être rappelé",
  },
  en: {
    ordre: "Sorted from the highest rate to the lowest, then by bank name.",
    caption: (d: string) => `Pillar 3a account rates, % per year, read on the banks’ own pages on ${d}`,
    thBanque: "Bank and account",
    thTaux: "Rate",
    thConditions: "Conditions",
    thReleve: "Read on",
    par: "per year",
    releve: (d: string) => `Rate read on ${d}`,
    depuis: (d: string) => `in force since ${d}`,
    source: "bank’s page",
    integrite:
      "No bank pays to be listed here or for its place in the list. Rates are variable: the bank can change them at any time, and its website is authoritative.",
    titres:
      "Pillar 3a securities solutions (investment funds) are not in this list because they pay no interest: their return depends on the markets and the fund’s fees.",
    rappelQ: "A question about your pillar 3a?",
    rappel: "Request a call-back",
  },
};

export function Taux3a({ locale = "fr" }: { locale?: Locale }) {
  const t = TXT[locale];
  const taux = locale === "fr" ? tauxFr : tauxEn;
  const cond = (c: (typeof COMPTES_3A)[number]) => (locale === "fr" ? c.affiche_fr : c.affiche_en);
  return (
    <section className="taux-3a" aria-label={t.caption(dateCh(RELEVE_LE))}>
      <p className="note-outil ordre">{t.ordre}</p>

      <ol className="cartes-taux">
        {COMPTES_3A.map((c, i) => (
          <li key={c.id} className="carte-taux">
            <span className="rang">{i + 1}</span>
            <div className="qui">
              <b>{c.banque}</b>
              <span className="produit">{c.produit}</span>
            </div>
            <div className="combien">
              <span className="montant">{taux(c.taux)}</span>
              <span className="unite">{t.par}</span>
            </div>
            <p className="cond">{cond(c)}</p>
            <p className="releve">
              {t.releve(dateCh(c.lu_le))}
              {c.taux_valable_des ? `, ${t.depuis(dateCh(c.taux_valable_des))}` : ""}.{" "}
              <a href={c.url} rel="nofollow noopener" target="_blank">{t.source}</a>
            </p>
          </li>
        ))}
      </ol>

      <table className="assureurs table-taux">
        <caption>{t.caption(dateCh(RELEVE_LE))}</caption>
        <thead>
          <tr>
            <th scope="col">{t.thBanque}</th>
            <th scope="col">{t.thTaux}</th>
            <th scope="col">{t.thConditions}</th>
            <th scope="col">{t.thReleve}</th>
          </tr>
        </thead>
        <tbody>
          {COMPTES_3A.map((c, i) => (
            <tr key={c.id}>
              <td>
                <span className="rang">{i + 1}</span>
                <b>{c.banque}</b>
                <span className="produit">{c.produit}</span>
              </td>
              <td className="taux">{taux(c.taux)}</td>
              <td className="cond">{cond(c)}</td>
              <td className="releve">
                {dateCh(c.lu_le)}
                {c.taux_valable_des ? <small>{t.depuis(dateCh(c.taux_valable_des))}</small> : null}
                <a href={c.url} rel="nofollow noopener" target="_blank">{t.source}</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="rappel-liste">
        {t.rappelQ}{" "}
        <LienRappel locale={locale} emplacement="outil3a" sujet="prevoyance">
          <IconeTelephone size={16} />
          {t.rappel}
        </LienRappel>
      </p>

      <div className="integrite">
        <p>{t.titres}</p>
        <p><b>{t.integrite}</b></p>
      </div>
    </section>
  );
}
