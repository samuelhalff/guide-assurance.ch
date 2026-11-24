"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { suivre } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n";
import { ecrirePreremplissage } from "@/lib/demande";
import { DEMANDE_PORTE } from "@/lib/demande-porte";
import { BarreOffres, CtaOffres } from "@/components/outils/cta-offres";
import { Choix } from "@/components/outils/choix";
import { Depliable } from "@/components/controles";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ASSUREURS, META, NOM_CANTON, assuresDans, dateCourte, lignes, nomAffiche, ordreCantons, partDans, type Assureur, type Tri, type Zone } from "@/lib/caisses-lamal";
import { chf, nombre, ESPACE_FINE as N } from "@/lib/nombres";

/* « Caisses maladie en chiffres » : un tableau, une carte par caisse sur mobile. Le rendu initial (Suisse entière, ordre
   alphabétique) est dans le HTML statique, lisible sans JavaScript. Aucune valeur choisie n'est envoyée à la mesure. */
const TXT = {
  fr: {
    canton: "Canton",
    suisse: "Toute la Suisse",
    tri: "Trier par",
    sens: "Sens du tri",
    croissant: "Croissant",
    decroissant: "Décroissant",
    tris: { nom: "Nom de la caisse", assures: "Nombre d’assurés dans la zone choisie", frais: "Frais administratifs par assuré", solvabilite: "Taux de solvabilité" } as Record<Tri, string>,
    phrase: (n: number, zone: string, critere: string, sens: string) => `${n} caisses ont des assurés ${zone}. Elles sont triées par ${critere}, ${sens}.`,
    zoneCh: "en Suisse",
    zoneCanton: (c: string) => `dans le canton de ${c}`,
    critere: { nom: "nom", assures: "nombre d’assurés", frais: "frais administratifs par assuré", solvabilite: "taux de solvabilité" } as Record<Tri, string>,
    sensTexte: (t: Tri, desc: boolean) =>
      t === "nom" ? (desc ? "de Z à A" : "de A à Z") : desc ? "du plus élevé au plus bas" : "du plus bas au plus élevé",
    finSolvabilite: " Les caisses sans taux de solvabilité publié passent en fin de liste.",
    caption: (zone: string) => `Caisses maladie avec des assurés ${zone} : assurés au 31.12.2024, frais administratifs 2024, réserves, résultat et solvabilité au 1.1.2025`,
    thCaisse: "Caisse",
    thAssures: (d: string) => `Assurés au ${d}`,
    thPart: "Part de marché",
    thFrais: "Frais admin. par assuré",
    thFraisPct: "Frais admin. en % des dépenses",
    thReserves: "Réserves par assuré",
    thResultat: "Résultat par assuré",
    thSolv: (d: string) => `Solvabilité au ${d}`,
    assures: "Assurés",
    part: "Part de marché",
    fraisCourt: "Frais admin. par assuré",
    solv: "Solvabilité",
    details: "Détails",
    fraisPct: "Frais administratifs en % des dépenses",
    reserves: "Réserves par assuré",
    resultat: "Résultat global par assuré",
    effectif: "Effectif moyen 2024",
    nonIndique: "non indiqué",
    nomOfficiel: "Nom officiel",
    moinsDe: "moins de 0,1 %",
    parAn: "par an",
    noteTaux: "Taux transmis par l’assureur à l’OFSP.",
    aucun: "Aucune caisse n’a d’assurés dans cette zone.",
    notes: (d1: string, d2: string) =>
      `Assurés au ${d1} (tableau 5.07). Part de marché sur l’effectif moyen 2024 (tableau 5.10). Frais administratifs, réserves et résultat : 2024, en francs par assuré (tableau 5.01). Solvabilité : test de l’OFSP au ${d2} (tableau 5.03).`,
  },
  en: {
    canton: "Canton",
    suisse: "All of Switzerland",
    tri: "Sort by",
    sens: "Sort direction",
    croissant: "Ascending",
    decroissant: "Descending",
    tris: { nom: "Insurer name", assures: "Number of insured in the chosen area", frais: "Administrative costs per insured", solvabilite: "Solvency ratio" } as Record<Tri, string>,
    phrase: (n: number, zone: string, critere: string, sens: string) => `${n} insurers have insured people ${zone}. They are sorted by ${critere}, ${sens}.`,
    zoneCh: "in Switzerland",
    zoneCanton: (c: string) => `in the canton of ${c}`,
    critere: { nom: "name", assures: "number of insured", frais: "administrative costs per insured", solvabilite: "solvency ratio" } as Record<Tri, string>,
    sensTexte: (t: Tri, desc: boolean) => (t === "nom" ? (desc ? "from Z to A" : "from A to Z") : desc ? "from highest to lowest" : "from lowest to highest"),
    finSolvabilite: " Insurers with no published solvency ratio come last.",
    caption: (zone: string) => `Health insurers with insured people ${zone}: insured at 31.12.2024, 2024 administrative costs, reserves, result and solvency at 1.1.2025`,
    thCaisse: "Insurer",
    thAssures: (d: string) => `Insured at ${d}`,
    thPart: "Market share",
    thFrais: "Admin. costs per insured",
    thFraisPct: "Admin. costs as % of expenses",
    thReserves: "Reserves per insured",
    thResultat: "Result per insured",
    thSolv: (d: string) => `Solvency at ${d}`,
    assures: "Insured",
    part: "Market share",
    fraisCourt: "Admin. costs per insured",
    solv: "Solvency",
    details: "Details",
    fraisPct: "Administrative costs as % of expenses",
    reserves: "Reserves per insured",
    resultat: "Overall result per insured",
    effectif: "Average insured 2024",
    nonIndique: "not shown",
    nomOfficiel: "Official name",
    moinsDe: "under 0.1%",
    parAn: "per year",
    noteTaux: "Ratio supplied by the insurer to the FOPH.",
    aucun: "No insurer has insured people in this area.",
    notes: (d1: string, d2: string) =>
      `Insured at ${d1} (table 5.07). Market share on the 2024 average number of insured (table 5.10). Administrative costs, reserves and result: 2024, in francs per insured (table 5.01). Solvency: FOPH test at ${d2} (table 5.03).`,
  },
};

const D_ASSURES = dateCourte(META.dateAssures);
const D_SOLV = dateCourte(META.dateSolvabilite);

function useFormats(locale: Locale) {
  const t = TXT[locale];
  const fr = locale === "fr";
  return {
    t,
    entier: (x: number) => nombre(x, 0, locale),
    francs: (x: number) => chf(x, locale),
    pct: (x: number) => (fr ? `${nombre(x, 1, locale)}${N}%` : `${nombre(x, 1, locale)}%`),
    part: (x: number) => (x < 0.05 ? t.moinsDe : fr ? `${nombre(x, 1, locale)}${N}%` : `${nombre(x, 1, locale)}%`),
    solv: (a: Assureur) => (a.solvabilitePct === undefined ? t.nonIndique : fr ? `${nombre(a.solvabilitePct, 0, locale)}${N}%` : `${nombre(a.solvabilitePct, 0, locale)}%`),
  };
}

/* Le formulaire de demande accepte le sujet (assurance maladie), pas le canton : seul le sujet est transmis, par sessionStorage. */
const versDemande = () => ecrirePreremplissage({ porte: "sante", besoin: ["lamal"] });

export function CtaCaisses({ locale, id, libelle, note, className }: { locale: Locale; id: string; libelle?: string; note?: string; className?: string }) {
  return (
    <div id={id} className={className ?? "mt-5"}>
      <CtaOffres locale={locale} href={DEMANDE_PORTE[locale]("sante")} libelle={libelle} note={note} onClick={versDemande} />
    </div>
  );
}

function NomCaisse({ a }: { a: Assureur }) {
  return (
    <>
      <b className="font-semibold">{nomAffiche(a)}</b>
      {a.court ? <span className="block text-base text-muted-foreground">{a.nom}</span> : null}
    </>
  );
}

export function CaissesChiffres({ locale }: { locale: Locale }) {
  const F = useFormats(locale);
  const { t } = F;
  const [zone, setZone] = useState<Zone>("CH");
  const [tri, setTri] = useState<Tri>("nom");
  const [desc, setDesc] = useState(false);
  const mesure = useRef(false);
  const touche = () => {
    if (mesure.current) return;
    mesure.current = true;
    suivre("caisses_chiffres_utilise");
  };

  const liste = useMemo(() => lignes(zone, tri, desc, locale), [zone, tri, desc, locale]);
  const nomZone = zone === "CH" ? t.zoneCh : t.zoneCanton(NOM_CANTON[locale][zone]);
  const optionsCanton = useMemo(
    () => [{ value: "CH" as Zone, label: t.suisse }, ...ordreCantons(locale).map((c) => ({ value: c as Zone, label: `${NOM_CANTON[locale][c]} (${c})` }))],
    [locale, t.suisse],
  );
  const optionsTri = (Object.keys(t.tris) as Tri[]).map((k) => ({ value: k, label: t.tris[k] }));

  /* Bouton « Recevoir des offres » collant (mobile) : visible entre l'appel du haut et celui du bas. */
  const [haut, setHaut] = useState(true);
  const [bas, setBas] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const suivi = (id: string, set: (v: boolean) => void) => {
      const el = document.getElementById(id);
      if (!el) return () => {};
      const io = new IntersectionObserver(([e]) => set(e.isIntersecting));
      io.observe(el);
      return () => io.disconnect();
    };
    const a = suivi("cta-caisses-haut", setHaut);
    const b = suivi("cta-caisses-bas", setBas);
    return () => {
      a();
      b();
    };
  }, []);

  const phrase = t.phrase(liste.length, nomZone, t.critere[tri], t.sensTexte(tri, desc)) + (tri === "solvabilite" ? t.finSolvabilite : "");
  const thAssures = zone === "CH" ? t.thAssures(D_ASSURES) : `${t.thAssures(D_ASSURES)} (${zone})`;

  return (
    <div className="caisses-chiffres">
      <div className="grid gap-4 min-[720px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] min-[720px]:items-end">
        <div className="champ">
          <label htmlFor="cc-canton">{t.canton}</label>
          <Choix id="cc-canton" value={zone} onChange={(v) => { setZone(v); touche(); }} options={optionsCanton} />
        </div>
        <div className="champ">
          <label htmlFor="cc-tri">{t.tri}</label>
          <Choix id="cc-tri" value={tri} onChange={(v) => { setTri(v); touche(); }} options={optionsTri} />
        </div>
        <ToggleGroup
          variant="outline"
          size="champ"
          spacing={0}
          aria-label={t.sens}
          value={[desc ? "desc" : "asc"]}
          onValueChange={(v) => {
            if (v[0]) {
              setDesc(v[0] === "desc");
              touche();
            }
          }}
        >
          <ToggleGroupItem value="asc">{t.croissant}</ToggleGroupItem>
          <ToggleGroupItem value="desc">{t.decroissant}</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <p className="note-outil mt-4" role="status" aria-live="polite">
        {liste.length ? phrase : t.aucun}
      </p>

      <ul className="mt-4 grid gap-3 min-[720px]:hidden" aria-label={t.caption(nomZone)}>
        {liste.map((a) => (
          <li key={a.no}>
            <Card size="sm">
              <CardContent>
                <h3 className="text-lg leading-tight">
                  <NomCaisse a={a} />
                </h3>
                <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-1 text-base">
                  <div>
                    <dt className="text-base text-muted-foreground">{t.assures}</dt>
                    <dd className="font-semibold tabular-nums">{F.entier(assuresDans(a, zone))}</dd>
                    <dd className="text-base tabular-nums text-muted-foreground">{F.part(partDans(a, zone))}</dd>
                  </div>
                  <div>
                    <dt className="text-base text-muted-foreground">{t.fraisCourt}</dt>
                    <dd className="font-semibold tabular-nums">{F.francs(a.fraisAdminParAssure)}</dd>
                  </div>
                  <div>
                    <dt className="text-base text-muted-foreground">{t.solv}</dt>
                    <dd className="font-semibold tabular-nums">{F.solv(a)}</dd>
                  </div>
                </dl>
                <Depliable titre={t.details} className="mt-2 border-t pt-1">
                  <dl className="grid gap-1 pb-1 text-base">
                    <div className="flex justify-between gap-4">
                      <dt>{t.fraisPct}</dt>
                      <dd className="tabular-nums">{F.pct(a.fraisAdminPctDepenses)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>{t.reserves}</dt>
                      <dd className="tabular-nums">{F.francs(a.reservesParAssure)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>{t.resultat}</dt>
                      <dd className="tabular-nums">{F.francs(a.resultatParAssure)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>{t.effectif}</dt>
                      <dd className="tabular-nums">{F.entier(a.effectifMoyen)}</dd>
                    </div>
                    {a.solvabiliteNote ? <p className="note-outil">{t.noteTaux}</p> : null}
                  </dl>
                </Depliable>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <div className="mt-4 max-[719px]:hidden">
        <Table variant="chiffres" className="text-[15px]">
          <TableCaption className="visually-hidden">{t.caption(nomZone)}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{t.thCaisse}</TableHead>
              <TableHead scope="col">{thAssures}</TableHead>
              <TableHead scope="col">{t.thPart}</TableHead>
              <TableHead scope="col">{t.thFrais}</TableHead>
              <TableHead scope="col">{t.thFraisPct}</TableHead>
              <TableHead scope="col">{t.thReserves}</TableHead>
              <TableHead scope="col">{t.thResultat}</TableHead>
              <TableHead scope="col">{t.thSolv(D_SOLV)}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liste.map((a) => (
              <TableRow key={a.no}>
                <TableHead scope="row" className="max-w-[16rem]">
                  <NomCaisse a={a} />
                </TableHead>
                <TableCell className="whitespace-nowrap">{F.entier(assuresDans(a, zone))}</TableCell>
                <TableCell className="whitespace-nowrap">{F.part(partDans(a, zone))}</TableCell>
                <TableCell className="whitespace-nowrap">{F.francs(a.fraisAdminParAssure)}</TableCell>
                <TableCell className="whitespace-nowrap">{F.pct(a.fraisAdminPctDepenses)}</TableCell>
                <TableCell className="whitespace-nowrap">{F.francs(a.reservesParAssure)}</TableCell>
                <TableCell className="whitespace-nowrap">{F.francs(a.resultatParAssure)}</TableCell>
                <TableCell>
                  {F.solv(a)}
                  {a.solvabiliteNote ? <span className="block text-base text-muted-foreground">{t.noteTaux}</span> : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="note-outil mt-4">{t.notes(D_ASSURES, D_SOLV)}</p>

      <BarreOffres locale={locale} href={DEMANDE_PORTE[locale]("sante")} visible={!haut && !bas} onClick={versDemande} />
    </div>
  );
}

export const NB_ASSUREURS = ASSUREURS.length;
