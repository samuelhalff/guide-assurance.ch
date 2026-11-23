import { COMPTES_3A, RELEVE_LE, dateCh, tauxEn, tauxFr } from "@/lib/taux3a";
import { FRAIS_COMPTES, FRAIS_VERIFIE_LE, TITRES_3A, fourchette, partActions, resumeFraisCompte } from "@/lib/frais3a";
import { IconeTelephone, LienRappel } from "@/components/demande/lien-rappel";
import type { Locale } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/* Tableau des taux 3a, rendu côté serveur (lisible sans JavaScript). Mobile : une carte par compte ; ordinateur :
   tableau. Ordre : taux décroissant, puis banque. Aucune ligne payée, aucun « meilleur ». */
const TXT = {
  fr: {
    ordre: "Trié du taux le plus élevé au plus bas, puis par nom de banque.",
    caption: (d: string) => `Taux des comptes 3a, en % par an, relevés le ${d} sur les pages des banques`,
    thBanque: "Banque et compte",
    thTaux: "Taux",
    thConditions: "Conditions",
    thFrais: "Frais",
    thReleve: "Relevé",
    par: "par an",
    frais: "Frais",
    fraisSource: (d: string) => `grille tarifaire, lue le ${d}`,
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
    thFrais: "Fees",
    thReleve: "Read on",
    par: "per year",
    frais: "Fees",
    fraisSource: (d: string) => `price list, read on ${d}`,
    releve: (d: string) => `Rate read on ${d}`,
    depuis: (d: string) => `in force since ${d}`,
    source: "bank’s page",
    integrite:
      "No bank pays to be listed here or for its place in the list. Rates are variable: the bank can change them at any time, and its website is authoritative.",
    titres:
      "Pillar 3a securities solutions (investment funds) are not in this list because they pay no interest. Their fees and equity share are shown separately, further down.",
    rappelQ: "A question about your pillar 3a?",
    rappel: "Request a call-back",
  },
};

export function Taux3a({ locale = "fr" }: { locale?: Locale }) {
  const t = TXT[locale];
  const taux = locale === "fr" ? tauxFr : tauxEn;
  const cond = (c: (typeof COMPTES_3A)[number]) => (locale === "fr" ? c.affiche_fr : c.affiche_en);
  const en = locale === "en";
  const frais = (id: string) => {
    const f = FRAIS_COMPTES[id];
    return f ? { resume: resumeFraisCompte(f, en), note: en ? f.note_en : f.note_fr, url: f.url, lu: dateCh(f.lu_le) } : null;
  };
  return (
    <section className="taux-3a" aria-label={t.caption(dateCh(RELEVE_LE))}>
      <p className="note-outil ordre">{t.ordre}</p>

      <ol className="cartes-taux">
        {COMPTES_3A.map((c, i) => (
          <li key={c.id}>
            <Card size="sm"><CardContent className="carte-taux">
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
            {frais(c.id) ? (
              <p className="frais">
                <b>{frais(c.id)!.resume}</b> {frais(c.id)!.note}{" "}
                <a href={frais(c.id)!.url} rel="nofollow noopener" target="_blank">{t.fraisSource(frais(c.id)!.lu)}</a>
              </p>
            ) : null}
            <p className="releve">
              {t.releve(dateCh(c.lu_le))}
              {c.taux_valable_des ? `, ${t.depuis(dateCh(c.taux_valable_des))}` : ""}.{" "}
              <a href={c.url} rel="nofollow noopener" target="_blank">{t.source}</a>
            </p>
            </CardContent></Card>
          </li>
        ))}
      </ol>

      <Table className="table-taux">
        <TableCaption>{t.caption(dateCh(RELEVE_LE))}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{t.thBanque}</TableHead>
            <TableHead scope="col" className="text-right">{t.thTaux}</TableHead>
            <TableHead scope="col">{t.thConditions}</TableHead>
            <TableHead scope="col">{t.thFrais}</TableHead>
            <TableHead scope="col">{t.thReleve}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {COMPTES_3A.map((c, i) => (
            <TableRow key={c.id}>
              <TableCell className="pl-9 align-top">
                <span className="rang">{i + 1}</span>
                <b>{c.banque}</b>
                <span className="produit">{c.produit}</span>
              </TableCell>
              <TableCell className="taux align-top">{taux(c.taux)}</TableCell>
              <TableCell className="cond align-top">{cond(c)}</TableCell>
              <TableCell className="frais align-top">
                {frais(c.id) ? (
                  <>
                    <b>{frais(c.id)!.resume}</b> {frais(c.id)!.note}
                    <a href={frais(c.id)!.url} rel="nofollow noopener" target="_blank">{t.fraisSource(frais(c.id)!.lu)}</a>
                  </>
                ) : null}
              </TableCell>
              <TableCell className="releve align-top">
                {dateCh(c.lu_le)}
                {c.taux_valable_des ? <small>{t.depuis(dateCh(c.taux_valable_des))}</small> : null}
                <a href={c.url} rel="nofollow noopener" target="_blank">{t.source}</a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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

/* Solutions 3a en titres : aucun intérêt, donc ni taux ni rendement. Coût annuel publié, ce qu'il couvre, part en actions,
   minimum. Tri (critère affiché) : coût publié le plus haut de la fourchette, du plus bas au plus haut ; offres dont une
   partie des coûts n'est pas publiée ensuite, par nom (lib/engines/frais3a.ts). */
const TXT_TITRES = {
  fr: {
    ordre: "Trié du coût annuel publié le plus bas au plus haut (haut de la fourchette, frais du fournisseur et des fonds compris). Les offres dont une partie des coûts n’est pas publiée suivent, par ordre alphabétique.",
    caption: (d: string) => `Solutions 3a en titres : coûts annuels publiés et part en actions, relevés le ${d} sur les pages des fournisseurs`,
    thOffre: "Fournisseur et produit",
    thCout: "Coût annuel publié",
    thCouvre: "Ce que couvre ce chiffre",
    thActions: "Part en actions",
    thAutres: "À savoir",
    nonChiffre: "non chiffré",
    incomplet: "coûts des fonds non publiés",
    actions: "Actions",
    nonPublie: "non publiée",
    minimum: (x: number) => (x === 0 ? "sans minimum" : `minimum ${x}\u00A0CHF`),
    liquidites: (x: number) => `liquidités rémunérées à ${x.toFixed(2).replace(".", ",")}\u202F%`,
    source: (d: string) => `grille tarifaire, lue le ${d}`,
    avertissement:
      "Ces solutions ne versent pas d’intérêt et n’offrent aucune garantie : la valeur suit les marchés et peut baisser, surtout avec une part en actions élevée. Cette liste ne montre aucun rendement passé. Les frais se lisent en pour cent de l’avoir investi, par an.",
  },
  en: {
    ordre: "Sorted from the lowest published annual cost to the highest (top of the range, provider and fund costs included). Offers where part of the costs is not published follow, in alphabetical order.",
    caption: (d: string) => `Pillar 3a securities solutions: published annual costs and equity share, read on the providers’ pages on ${d}`,
    thOffre: "Provider and product",
    thCout: "Published annual cost",
    thCouvre: "What this figure covers",
    thActions: "Equity share",
    thAutres: "Good to know",
    nonChiffre: "not stated",
    incomplet: "fund costs not published",
    actions: "Equities",
    nonPublie: "not published",
    minimum: (x: number) => (x === 0 ? "no minimum" : `minimum CHF ${x}`),
    liquidites: (x: number) => `cash earns ${x.toFixed(2)}%`,
    source: (d: string) => `price list, read on ${d}`,
    avertissement:
      "These solutions pay no interest and carry no guarantee: their value follows the markets and can fall, especially with a high equity share. This list shows no past returns. Fees are a percentage of the invested balance, per year.",
  },
};

export function Titres3a({ locale = "fr" }: { locale?: Locale }) {
  const t = TXT_TITRES[locale];
  const en = locale === "en";
  const details = (x: (typeof TITRES_3A)[number]) =>
    [x.minimum_chf !== null ? t.minimum(x.minimum_chf) : null, x.taux_liquidites_pct ? t.liquidites(x.taux_liquidites_pct) : null, en ? x.autres_en : x.autres_fr]
      .filter(Boolean)
      .join(" · ");
  const cout = (x: (typeof TITRES_3A)[number]) => fourchette(x, en) ?? t.nonChiffre;
  return (
    <section className="taux-3a titres-3a" aria-label={t.caption(dateCh(FRAIS_VERIFIE_LE))}>
      <p className="note-outil ordre">{t.ordre}</p>
      <ol className="cartes-taux">
        {TITRES_3A.map((x, i) => (
          <li key={x.id}>
            <Card size="sm"><CardContent className="carte-taux">
            <span className="rang">{i + 1}</span>
            <div className="qui">
              <b>{x.fournisseur}</b>
              <span className="produit">{x.produit}</span>
            </div>
            <div className="combien">
              <span className="montant">{cout(x)}</span>
              <span className="unite">{x.cout_complet ? t.thCout.toLowerCase() : t.incomplet}</span>
            </div>
            <p className="cond">{en ? x.cout_en : x.cout_fr}</p>
            <p className="cond">{t.actions}{en ? ": " : "\u202F: "}{partActions(x, en) ?? t.nonPublie}. {details(x)}</p>
            <p className="releve"><a href={x.url} rel="nofollow noopener" target="_blank">{t.source(dateCh(x.lu_le))}</a></p>
            </CardContent></Card>
          </li>
        ))}
      </ol>
      <Table className="table-taux">
        <TableCaption>{t.caption(dateCh(FRAIS_VERIFIE_LE))}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{t.thOffre}</TableHead>
            <TableHead scope="col" className="text-right">{t.thCout}</TableHead>
            <TableHead scope="col">{t.thCouvre}</TableHead>
            <TableHead scope="col">{t.thActions}</TableHead>
            <TableHead scope="col">{t.thAutres}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {TITRES_3A.map((x, i) => (
            <TableRow key={x.id}>
              <TableCell className="pl-9 align-top"><span className="rang">{i + 1}</span><b>{x.fournisseur}</b><span className="produit">{x.produit}</span></TableCell>
              <TableCell className="taux align-top">{cout(x)}{x.cout_complet ? null : <small>{t.incomplet}</small>}</TableCell>
              <TableCell className="cond align-top">{en ? x.cout_en : x.cout_fr}</TableCell>
              <TableCell className="actions align-top">{partActions(x, en) ?? t.nonPublie}</TableCell>
              <TableCell className="releve align-top">{details(x)}<a href={x.url} rel="nofollow noopener" target="_blank">{t.source(dateCh(x.lu_le))}</a></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="integrite"><p>{t.avertissement}</p></div>
    </section>
  );
}
