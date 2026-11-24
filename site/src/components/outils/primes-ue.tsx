"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { suivre } from "@/lib/analytics";
import { ecrirePreremplissage, lienDemande } from "@/lib/demande";
import { DONNEES_UE, PAYS_UE, listePays } from "@/lib/primes-ue";
import { ecartMin, offres, stats, trier, type Classe, type OffreUe, type Tri } from "@/lib/engines/primes-ue";
import { chf, nombre } from "@/lib/nombres";
import { BarreOffres, CtaOffres } from "@/components/outils/cta-offres";
import { Choix } from "@/components/outils/choix";
import { Case } from "@/components/controles";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/* Primes LAMal 2027 des assurés qui résident dans l'UE, l'AELE ou au Royaume-Uni : pays, classe d'âge, accident, mois ou an.
   Le calcul se fait dans le navigateur ; rien de ce qui est choisi n'est envoyé ni mis dans l'adresse.
   Cadre : des faits triés selon le critère du visiteur, aucun classement, aucune mise en avant. */

const TXT = {
  fr: {
    pays: "Pays de résidence",
    classe: "Classe d’âge",
    classes: { adulte: "Adulte, 26 ans et plus", jeune: "Jeune adulte, 19 à 25 ans", enfant: "Enfant, 18 ans et moins" } as Record<Classe, string>,
    classesCourt: { adulte: "adulte de 26 ans et plus", jeune: "jeune adulte de 19 à 25 ans", enfant: "enfant" } as Record<Classe, string>,
    boutons: { adulte: "Adulte", jeune: "Jeune adulte", enfant: "Enfant" } as Record<Classe, string>,
    aideClasse: "Un adulte a 26 ans ou plus, un jeune adulte entre 19 et 25 ans, un enfant 18 ans ou moins.",
    accident: "Avec la couverture accident",
    accidentAide: "Si vous exercez une activité en Suisse, votre employeur vous assure déjà contre les accidents : vous pouvez alors enlever la couverture accident de la caisse-maladie. Sans activité en Suisse (retraité, membre de la famille), gardez-la cochée.",
    affichage: "Afficher les primes par mois ou par an",
    mois: "Mois",
    an: "An",
    trier: "Trier",
    tris: { prix: "Prime, de la plus basse à la plus haute", nom: "Nom de l’assureur, de A à Z" } as Record<Tri, string>,
    ordre: { prix: "Les assureurs sont triés de la prime la plus basse à la plus haute.", nom: "Les assureurs sont triés par ordre alphabétique." } as Record<Tri, string>,
    resumeDe: (n: number, pays: string, classe: string, acc: boolean, min: string, max: string, u: string) =>
      `${n} assureur${n > 1 ? "s" : ""} proposent l’assurance de base aux personnes qui résident ${pays} (${classe}, ${acc ? "avec" : "sans"} couverture accident). Les primes vont de ${min} à ${max} ${u}.`,
    thAssureur: "Assureur",
    thPrime: (p: boolean) => `Prime ${p ? "par an" : "par mois"}`,
    thEcart: "Écart avec la prime la plus basse",
    parMois: "par mois",
    parAn: "par an",
    ecartLigne: (x: string, u: string) => `${x} ${u} de plus que la prime la plus basse de la liste`,
    memePrime: "C’est la prime la plus basse de la liste.",
    caption: (pays: string) => `Primes 2027 de l’assurance de base pour les assurés résidant ${pays}, en francs`,
    troisieme: (x: string) => `Dès le troisième enfant : ${x} par mois`,
    franchise: "Franchise de 300 francs pour les adultes et les jeunes adultes, sans franchise pour les enfants : c’est la seule possible pour les assurés qui résident dans l’UE, l’AELE ou au Royaume-Uni. Le modèle est l’assurance de base standard, sans médecin de famille ni modèle alternatif.",
    source: "Source : OFSP, primes 2027 des assurés résidant dans l’UE, en Islande, en Norvège ou au Royaume-Uni (fichier Prämien_EU), publiées sur priminfo.admin.ch, lues le 24 novembre 2026. Les assureurs ne proposant pas l’assurance dans ce pays n’apparaissent pas.",
    integrite: "Aucun assureur ne paie pour figurer dans cette liste ni pour sa place. Les prestations de base sont les mêmes chez tous les assureurs.",
    simulateur: "Vous vivez en France et travaillez en Suisse ?",
    simulateurLien: "Le simulateur frontalier",
    simulateurSuite: "compare ces primes à la cotisation de l’assurance maladie française.",
    pasDe: "Aucun assureur de la liste",
  },
  en: {
    pays: "Country of residence",
    classe: "Age group",
    classes: { adulte: "Adult, 26 and over", jeune: "Young adult, 19 to 25", enfant: "Child, 18 and under" } as Record<Classe, string>,
    classesCourt: { adulte: "adult aged 26 and over", jeune: "young adult aged 19 to 25", enfant: "child" } as Record<Classe, string>,
    boutons: { adulte: "Adult", jeune: "Young adult", enfant: "Child" } as Record<Classe, string>,
    aideClasse: "An adult is 26 or older, a young adult is 19 to 25, and a child is 18 or younger.",
    accident: "With accident cover",
    accidentAide: "If you work in Switzerland, your employer already insures you against accidents, so you can remove accident cover from the health insurer’s policy. With no job in Switzerland (pensioner, family member), leave it ticked.",
    affichage: "Show premiums per month or per year",
    mois: "Month",
    an: "Year",
    trier: "Sort",
    tris: { prix: "Premium, lowest to highest", nom: "Insurer name, A to Z" } as Record<Tri, string>,
    ordre: { prix: "Insurers are sorted from the lowest premium to the highest.", nom: "Insurers are sorted alphabetically." } as Record<Tri, string>,
    resumeDe: (n: number, pays: string, classe: string, acc: boolean, min: string, max: string, u: string) =>
      `${n} insurer${n > 1 ? "s" : ""} offer basic insurance to people living in ${pays} (${classe}, ${acc ? "with" : "without"} accident cover). Premiums range from ${min} to ${max} ${u}.`,
    thAssureur: "Insurer",
    thPrime: (p: boolean) => `Premium ${p ? "per year" : "per month"}`,
    thEcart: "Difference from the lowest premium",
    parMois: "per month",
    parAn: "per year",
    ecartLigne: (x: string, u: string) => `${x} ${u} more than the lowest premium in the list`,
    memePrime: "This is the lowest premium in the list.",
    caption: (pays: string) => `2027 basic insurance premiums for people living in ${pays}, in Swiss francs`,
    troisieme: (x: string) => `From the third child: ${x} per month`,
    franchise: "A CHF 300 deductible for adults and young adults and none for children: it is the only one available to people living in the EU, EFTA or the UK. The model is standard basic insurance, with no family-doctor or other alternative model.",
    source: "Source: FOPH, 2027 premiums for people living in the EU, Iceland, Norway or the United Kingdom (Prämien_EU file), published on priminfo.admin.ch, read on 24 November 2026. Insurers that do not offer cover in this country are not listed.",
    integrite: "No insurer pays to be listed or for its place in the list. Basic benefits are the same at every insurer.",
    simulateur: "Do you live in France and work in Switzerland?",
    simulateurLien: "The cross-border calculator",
    simulateurSuite: "sets these premiums against the French health insurance contribution.",
    pasDe: "No insurer in the list",
  },
};

/* « en France », « en Allemagne » : la préposition suit le genre et la voyelle initiale du pays. */
const EN_PAYS_FR: Record<string, string> = {
  AT: "en Autriche", BE: "en Belgique", BG: "en Bulgarie", CY: "à Chypre", CZ: "en Tchéquie", DE: "en Allemagne", DK: "au Danemark",
  EE: "en Estonie", ES: "en Espagne", FI: "en Finlande", FR: "en France", GR: "en Grèce", HR: "en Croatie", HU: "en Hongrie",
  IE: "en Irlande", IS: "en Islande", IT: "en Italie", LT: "en Lituanie", LU: "au Luxembourg", LV: "en Lettonie", MT: "à Malte",
  NL: "aux Pays-Bas", NO: "en Norvège", PL: "en Pologne", PT: "au Portugal", RO: "en Roumanie", SE: "en Suède", SI: "en Slovénie",
  SK: "en Slovaquie", UK: "au Royaume-Uni",
};

const CLASSES: Classe[] = ["adulte", "jeune", "enfant"];

export function PrimesUe({ locale = "fr" }: { locale?: Locale }) {
  const t = TXT[locale];
  const fr = locale === "fr";
  const [pays, setPays] = useState("FR");
  const [classe, setClasse] = useState<Classe>("adulte");
  const [accident, setAccident] = useState(true);
  const [parAn, setParAn] = useState(false);
  const [tri, setTri] = useState<Tri>("prix");
  const [ctaVisible, setCtaVisible] = useState(true);
  const ctaRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => listePays(locale).map((p) => ({ value: p.code, label: p.nom })), [locale]);
  const liste = useMemo(() => offres(DONNEES_UE, pays, classe, accident), [pays, classe, accident]);
  const triees = useMemo(() => trier(liste, tri), [liste, tri]);
  const s = stats(liste);

  /* Mesure : un seul événement, au premier changement de choix. Aucune valeur n'est envoyée. */
  const monte = useRef(false);
  const suivi = useRef(false);
  useEffect(() => {
    if (!monte.current) { monte.current = true; return; }
    if (!suivi.current) { suivi.current = true; suivre("primes_ue_utilise"); }
  }, [pays, classe, accident]);

  /* Barre collante (mobile) : dès que le bouton du haut est hors de l'écran. */
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([x]) => setCtaVisible(x.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const href = lienDemande(locale, "frontaliers");
  const prerempli = () => ecrirePreremplissage({ porte: "frontaliers", besoin: ["changement"] });

  const prix = (m: number) => (parAn ? Math.round(m * 12 * 100) / 100 : m);
  const nf = (x: number) => nombre(x, 2, locale);
  const mc = (x: number) => chf(x, locale, 2, "\u00A0", "\u00A0");
  const unite = parAn ? t.parAn : t.parMois;
  const nomPays = PAYS_UE[pays][locale];
  const lieu = fr ? EN_PAYS_FR[pays] : nomPays;
  const classeTxt = t.classesCourt[classe];
  const ligneEcart = (o: OffreUe) => {
    const e = prix(ecartMin(liste, o));
    return e === 0 ? t.memePrime : t.ecartLigne(`+${mc(e)}`, unite);
  };

  const carte = (o: OffreUe) => (
    <li key={o.no}>
      <Card size="sm">
        <CardContent className="grid gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <b className="text-base">{o.nom}</b>
            <span className="text-right text-lg font-semibold tabular-nums">
              {mc(prix(o.mensuel))}
            </span>
          </div>
          <p className="m-0 text-base text-muted-foreground">{unite}</p>
          <p className="m-0 text-base text-muted-foreground">{ligneEcart(o)}</p>
          {o.troisiemeEnfant !== null ? <p className="m-0 text-base text-muted-foreground">{t.troisieme(mc(o.troisiemeEnfant))}</p> : null}
        </CardContent>
      </Card>
    </li>
  );

  return (
    <div className="contents" onClickCapture={(e) => { if ((e.target as HTMLElement).closest("a[href^='/demande'], a[href^='/en/request']")) prerempli(); }}>
      <div ref={ctaRef}>
        <CtaOffres locale={locale} href={href} className="cta-haut-outil" />
      </div>
      {/* Le clic sur un bouton « Recevoir des offres » préremplit la porte « frontaliers » (sessionStorage, jamais l'adresse, aucune valeur choisie). */}
      <div className="ph-sensitive outil outil-primes-ue mt-6" data-ph-mask>
        <form className="form" onSubmit={(e) => e.preventDefault()} noValidate>
          <Card><CardContent className="grid gap-4">
            <div className="champ">
              <label htmlFor="pu-pays">{t.pays}</label>
              <Choix id="pu-pays" value={pays} onChange={setPays} options={options} />
            </div>
            <div className="champ">
              <span id="pu-classe-l" className="font-semibold">{t.classe}</span>
              <ToggleGroup
                variant="outline"
                size="champ"
                spacing={0}
                className="w-full"
                aria-labelledby="pu-classe-l"
                value={[classe]}
                onValueChange={(v) => { if (v[0]) setClasse(v[0] as Classe); }}
              >
                {CLASSES.map((c) => (
                  <ToggleGroupItem key={c} value={c} className="flex-1" aria-label={t.classes[c]}>{t.boutons[c]}</ToggleGroupItem>
                ))}
              </ToggleGroup>
              <small className="text-base text-muted-foreground">{t.aideClasse}</small>
            </div>
            <Case checked={accident} onChange={setAccident} className="case">
              {t.accident}<small className="mt-1 block text-base text-muted-foreground">{t.accidentAide}</small>
            </Case>
            <div className="grid gap-4 min-[720px]:grid-cols-2">
              <div className="champ">
                <label htmlFor="pu-tri">{t.trier}</label>
                <Choix id="pu-tri" value={tri} onChange={setTri} options={(["prix", "nom"] as Tri[]).map((x) => ({ value: x, label: t.tris[x] }))} />
              </div>
              <div className="champ">
                <span id="pu-periode-l" className="font-semibold">{t.affichage}</span>
                <ToggleGroup
                  variant="outline"
                  size="champ"
                  spacing={0}
                  className="w-full"
                  aria-labelledby="pu-periode-l"
                  value={[parAn ? "an" : "mois"]}
                  onValueChange={(v) => { if (v[0]) setParAn(v[0] === "an"); }}
                >
                  <ToggleGroupItem value="mois" className="flex-1">{t.mois}</ToggleGroupItem>
                  <ToggleGroupItem value="an" className="flex-1">{t.an}</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </CardContent></Card>
        </form>

        <section aria-live="polite" className="mt-6">
          {s ? (
            <>
              <p className="resume-liste">
                {t.resumeDe(s.n, lieu, classeTxt, accident, mc(prix(s.min)), mc(prix(s.max)), unite)}{" "}
                <b>{t.ordre[tri]}</b>
              </p>
              <ol className="m-0 grid list-none gap-3 p-0 min-[720px]:hidden">{triees.map(carte)}</ol>
              <div className="hidden min-[720px]:block">
                <Table variant="chiffres">
                  <TableCaption className="visually-hidden">{t.caption(lieu)}</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">{t.thAssureur}</TableHead>
                      <TableHead scope="col" className="text-right">{t.thPrime(parAn)}</TableHead>
                      <TableHead scope="col" className="text-right">{t.thEcart}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {triees.map((o) => {
                      const e = prix(ecartMin(liste, o));
                      return (
                        <TableRow key={o.no}>
                          <TableCell>
                            {o.nom}
                            {o.troisiemeEnfant !== null ? <small className="block text-muted-foreground">{t.troisieme(mc(o.troisiemeEnfant))}</small> : null}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{nf(prix(o.mensuel))}</TableCell>
                          <TableCell className="text-right tabular-nums">{e === 0 ? "0" : `+${nf(e)}`}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <p>{t.pasDe}</p>
          )}
        </section>

        <div className="integrite">
          <p>{t.franchise}</p>
          <p>{t.source}</p>
          <p><b>{t.integrite}</b></p>
        </div>
        <p className="rappel-liste">{t.simulateur} <a href={fr ? "/simulateur-frontalier/" : "/en/cross-border-calculator/"}>{t.simulateurLien}</a> {t.simulateurSuite}</p>
      </div>

      <BarreOffres locale={locale} href={href} visible={!ctaVisible} />
    </div>
  );
}
