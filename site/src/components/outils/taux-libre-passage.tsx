"use client";

import { useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { suivre } from "@/lib/analytics";
import { chf } from "@/lib/nombres";
import { COMPTES_LP, RELEVE_LE, dateCh, interetAnnuel, lireSolde, tauxEn, tauxFr, trier, type CompteLp, type TriLp } from "@/lib/tauxlp";
import { IconeTelephone, LienRappel } from "@/components/demande/lien-rappel";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/* Liste des taux des comptes de libre passage. Le HTML statique contient déjà toute la liste, triée par taux puis par
   nom ; le visiteur peut trier par nom et saisir un avoir pour voir l'intérêt d'une année. Mobile : une carte par
   institution ; ordinateur : tableau. Ni rang, ni ligne mise en avant, ni badge. */
const TXT = {
  fr: {
    tri: "Tri de la liste",
    triTaux: "Par taux",
    triNom: "Par nom",
    ordreTaux: "Trié du taux le plus élevé au plus bas, puis par nom d’institution.",
    ordreNom: "Trié par nom d’institution, de A à Z.",
    soldeLabel: "Votre avoir de libre passage, en CHF (facultatif)",
    soldePlaceholder: "150 000",
    soldeAide: "Pour voir l’intérêt d’une année à chaque taux. Rien n’est envoyé ni enregistré.",
    caption: (d: string) => `Taux des comptes de libre passage, en % par an, relevés le ${d} sur les pages des institutions`,
    thInstitution: "Institution",
    thTaux: "Taux",
    thInteret: "Intérêt sur un an",
    thReleve: "Relevé",
    par: "par an",
    interet: (x: string) => `${x} d’intérêt sur un an`,
    illustration: (s: string) =>
      `Illustration pour un avoir de ${s} : intérêt simple sur une année entière, au taux affiché aujourd’hui. Les taux peuvent changer à tout moment, et l’intérêt réel dépend de la date de chaque mouvement.`,
    releve: (d: string) => `Taux relevé le ${d}`,
    depuis: (d: string) => `en vigueur depuis le ${d}`,
    sourcePage: "page de l’institution",
    sourcePdf: "fiche de taux (PDF)",
    rappelQ: "Une question sur votre libre passage ?",
    rappel: "Être rappelé",
    integrite:
      "Aucune institution ne paie pour figurer ici ni pour sa place dans la liste. Les taux sont variables : l’institution peut les changer à tout moment, et son site fait foi.",
    titres:
      "Les solutions de libre passage en titres (fonds de prévoyance) ne figurent pas dans cette liste, car elles ne versent pas d’intérêt : leur valeur dépend des marchés et des frais du fonds.",
  },
  en: {
    tri: "List order",
    triTaux: "By rate",
    triNom: "By name",
    ordreTaux: "Sorted from the highest rate to the lowest, then by institution name.",
    ordreNom: "Sorted by institution name, A to Z.",
    soldeLabel: "Your vested benefits balance, in CHF (optional)",
    soldePlaceholder: "150,000",
    soldeAide: "Shows one year of interest at each rate. Nothing is sent or saved.",
    caption: (d: string) => `Vested benefits account rates, % per year, read on the institutions’ own pages on ${d}`,
    thInstitution: "Institution",
    thTaux: "Rate",
    thInteret: "Interest over one year",
    thReleve: "Read on",
    par: "per year",
    interet: (x: string) => `${x} interest over one year`,
    illustration: (s: string) =>
      `Illustration for a balance of ${s}: simple interest over a full year at the rate shown today. Rates can change at any time, and actual interest depends on the date of each movement.`,
    releve: (d: string) => `Rate read on ${d}`,
    depuis: (d: string) => `in force since ${d}`,
    sourcePage: "institution’s page",
    sourcePdf: "rate sheet (PDF)",
    rappelQ: "A question about your vested benefits?",
    rappel: "Request a call-back",
    integrite:
      "No institution pays to be listed here or for its place in the list. Rates are variable: the institution can change them at any time, and its website is authoritative.",
    titres:
      "Securities-based vested benefits solutions (pension funds) are not in this list because they pay no interest: their value depends on the markets and on the fund’s costs.",
  },
};

export function TauxLibrePassage({ locale = "fr" }: { locale?: Locale }) {
  const t = TXT[locale];
  const en = locale === "en";
  const taux = en ? tauxEn : tauxFr;
  const [tri, setTri] = useState<TriLp>("taux");
  const [soldeTexte, setSoldeTexte] = useState("");
  const mesure = useRef(false);
  const utilise = () => {
    if (mesure.current) return;
    mesure.current = true;
    suivre("taux_libre_passage_utilise");
  };

  const liste = trier(COMPTES_LP, tri);
  const solde = lireSolde(soldeTexte);
  const avecSolde = Number.isFinite(solde) && solde > 0;
  const interet = (c: CompteLp) => chf(interetAnnuel(solde, c.taux), locale, 2);
  const note = (c: CompteLp) => (en ? c.note_en : c.note_fr);
  const source = (c: CompteLp) => (c.source_type === "pdf" ? t.sourcePdf : t.sourcePage);
  const idSolde = "lp-solde";

  return (
    <section className="taux-lp" aria-label={t.caption(dateCh(RELEVE_LE))}>
      <div className="lp-reglages">
        <div className="champ">
          <span id="lp-tri-l" className="font-semibold">{t.tri}</span>
          <ToggleGroup
            variant="outline"
            size="champ"
            spacing={0}
            aria-labelledby="lp-tri-l"
            value={[tri]}
            onValueChange={(v) => {
              if (v[0] && v[0] !== tri) {
                setTri(v[0] as TriLp);
                utilise();
              }
            }}
          >
            <ToggleGroupItem value="taux" className="flex-1">{t.triTaux}</ToggleGroupItem>
            <ToggleGroupItem value="nom" className="flex-1">{t.triNom}</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="champ champ-solde">
          <label htmlFor={idSolde}>{t.soldeLabel}</label>
          <Input
            id={idSolde}
            inputMode="numeric"
            autoComplete="off"
            placeholder={t.soldePlaceholder}
            value={soldeTexte}
            aria-describedby="lp-solde-aide"
            onChange={(e) => {
              setSoldeTexte(e.target.value);
              if (e.target.value.trim()) utilise();
            }}
          />
          <span id="lp-solde-aide" className="aide">{t.soldeAide}</span>
        </div>
      </div>

      <p className="note-outil ordre" aria-live="polite">{tri === "nom" ? t.ordreNom : t.ordreTaux}</p>
      {avecSolde ? <p className="note-outil ordre">{t.illustration(chf(solde, locale, 0))}</p> : null}

      <ul className="cartes-taux lp-cartes">
        {liste.map((c) => (
          <li key={c.id}>
            <Card size="sm"><CardContent className="lp-carte">
              <div className="qui">
                <b>{c.banque}</b>
                {c.fondation ? <span className="produit">{c.fondation}</span> : null}
              </div>
              <div className="combien">
                <span className="montant">{taux(c.taux)}</span>
                <span className="unite">{t.par}</span>
              </div>
              {avecSolde ? <p className="interet">{t.interet(interet(c))}</p> : null}
              {note(c) ? <p className="cond">{note(c)}</p> : null}
              <p className="releve">
                {t.releve(dateCh(c.lu_le))}
                {c.taux_valable_des ? `, ${t.depuis(dateCh(c.taux_valable_des))}` : ""}.{" "}
                <a href={c.url} rel="nofollow noopener" target="_blank">{source(c)}</a>
              </p>
            </CardContent></Card>
          </li>
        ))}
      </ul>

      <Table className="table-taux lp-table">
        <TableCaption>{t.caption(dateCh(RELEVE_LE))}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{t.thInstitution}</TableHead>
            <TableHead scope="col" className="text-right">{t.thTaux}</TableHead>
            {avecSolde ? <TableHead scope="col" className="text-right interet">{t.thInteret}</TableHead> : null}
            <TableHead scope="col">{t.thReleve}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {liste.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="align-top">
                <b>{c.banque}</b>
                {c.fondation ? <span className="produit">{c.fondation}</span> : null}
                {note(c) ? <span className="produit">{note(c)}</span> : null}
              </TableCell>
              <TableCell className="taux align-top">{taux(c.taux)}</TableCell>
              {avecSolde ? <TableCell className="taux interet align-top">{interet(c)}</TableCell> : null}
              <TableCell className="releve align-top">
                {dateCh(c.lu_le)}
                {c.taux_valable_des ? <small>{t.depuis(dateCh(c.taux_valable_des))}</small> : null}
                <a href={c.url} rel="nofollow noopener" target="_blank">{source(c)}</a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="rappel-liste">
        {t.rappelQ}{" "}
        <LienRappel locale={locale} emplacement="libre_passage" sujet="prevoyance">
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
