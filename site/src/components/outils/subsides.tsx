"use client";
import { useEffect, useRef, useState } from "react";
import * as S from "@/lib/engines/subsides";
import { DEMARCHE, LIMITES_OUTIL, NOMS, REVENU, TRANSPARENCE_VD, primesOfsp } from "@/lib/subsides";
import { suivre } from "@/lib/analytics";
import { lienDemande } from "@/lib/demande";
import { OUTILS, OUTILS_EN } from "@/lib/nav";
import type { Locale } from "@/lib/i18n";
import { BarreOffres, CtaOffres } from "@/components/outils/cta-offres";
import { Choix } from "@/components/outils/choix";
import { Depliable, Interrupteur } from "@/components/controles";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "cn";
import { nombre, ESPACE_FINE as N } from "@/lib/nombres";

/* Estimation du subside d'assurance maladie 2027. Tout se calcule dans le navigateur ; rien de ce qui est saisi (revenu,
   ménage, primes) n'est envoyé : ni à la mesure, ni au formulaire de demande. */
const TXT = {
  fr: {
    canton: "Canton de domicile",
    situation: "Vous vivez",
    seul: "Seul ou seule",
    couple: "En couple",
    enfants: "Enfants de 0 à 18 ans",
    jeunes: "Jeunes adultes de 19 à 25 ans à charge, en formation",
    region: (c: S.Canton) => (c === "VD" ? "Région de primes" : "Région de votre district"),
    activite: "Au moins un parent exerce une activité professionnelle",
    revenuNote: "Montant annuel en francs.",
    primes: "Indiquer ma prime actuelle",
    primesTexte: "Sans votre prime, l’outil prend la prime moyenne cantonale 2027 de l’OFSP (tous modèles et franchises, accident compris). Indiquez ce que votre assureur vous facture par mois pour chaque personne.",
    primeAdulte: "Prime d’un adulte",
    primeJeune: "Prime d’un jeune adulte",
    primeEnfant: "Prime d’un enfant",
    resultat: "Votre estimation",
    lieu: { GE: "à Genève", VD: "dans le canton de Vaud", FR: "à Fribourg", VS: "en Valais", NE: "à Neuchâtel", JU: "dans le Jura" } as Record<S.Canton, string>,
    ligneSubside: (s: string) => `Votre subside estimé est de ${s} CHF par mois.`,
    detail: "Voir le détail",
    attente: "Saisissez le revenu déterminant pour voir le subside.",
    mois: "par mois",
    subside: "Subside estimé pour le ménage",
    apres: (p: string) => `Après subside, la prime du ménage est de ${p} CHF par mois.`,
    aucun: "Avec ce revenu, le barème 2027 ne prévoit pas de subside pour ce ménage.",
    limite: (l: number) => `Le droit s’arrête à un revenu déterminant d’environ ${nombre(l, 0, "fr")} francs pour ce ménage.`,
    cat: "Personnes",
    nb: "Nombre",
    sub: "Subside",
    prime: "Prime",
    net: "Après subside",
    adulte: (n: number) => (n > 1 ? `${n} adultes` : `${n} adulte`),
    jeune: (n: number) => (n > 1 ? `${n} jeunes adultes` : `${n} jeune adulte`),
    enfant: (n: number) => (n > 1 ? `${n} enfants` : `${n} enfant`),
    groupe: (g: string) => `Le barème 2027 range ce ménage dans ${g.startsWith("S") ? "la classification" : "le groupe"} ${g}.`,
    vd: (o: string, s: string) => `Dont ${o} francs de subside ordinaire et ${s} francs de subside spécifique, calculé parce que les primes dépassent 10${N}% du revenu.`,
    base: (n: string) => `Le calcul retient ${n}.`,
    baseOfsp: "la prime moyenne cantonale 2027 de l’OFSP",
    baseSaisie: "les primes que vous avez indiquées",
    alerte: "Estimation indicative : seule la décision de l’office cantonal fait foi. Rien de ce que vous saisissez n’est envoyé.",
    comment: "Comment l’obtenir",
    office: "Office cantonal",
    horsPerimetre: {
      charges: "Ce ménage compte plus de personnes à charge que le barème publié n’en prévoit : demandez le calcul à l’office cantonal.",
      "jeunes-adultes": "Pour ce canton, les jeunes adultes suivent des règles que cet outil ne reprend pas : demandez le calcul à l’office cantonal.",
      enfants: "Pour plus de trois enfants, l’arrêté renvoie à des règles que cet outil ne reprend pas : demandez le calcul à l’office cantonal.",
      region: "Choisissez la région.",
    } as Record<string, string>,
    infoVS: "Le Valais n’a pas encore publié son barème 2027 (au 24 novembre 2026) : aucun montant n’est calculé. Voir la fiche du canton plus bas.",
    comparer: "Comparer les primes 2027 selon votre NPA",
    comparerTexte: "Le subside se déduit de la prime : une prime plus basse réduit d’autant ce que vous payez.",
    liens: "Pour aller plus loin",
    lettre: "Lettre de résiliation de l’assurance maladie",
    chiffres: "Chiffres clés 2027",
    regions: {
      VD: [["1", "Région 1 : Lausanne, Ouest lausannois, Nyon, La Côte, Lavaux, Riviera"], ["2", "Région 2 : Chablais, Pays-d’Enhaut, Oron, Cossonay, Broye, Vully, Gros-de-Vaud, Jura, Nord vaudois"]],
      FR: [["1", "District de la Sarine (région 1)"], ["2", "Broye, Glâne, Gruyère, Lac, Singine ou Veveyse (région 2)"]],
    } as Record<string, [string, string][]>,
    ctaCanton: "Recevoir des offres",
    pasEnvoye: "Aucune de ces valeurs n’est transmise.",
  },
  en: {
    canton: "Canton of residence",
    situation: "You live",
    seul: "Alone",
    couple: "As a couple",
    enfants: "Children aged 0 to 18",
    jeunes: "Dependent young adults aged 19 to 25, in training",
    region: (c: S.Canton) => (c === "VD" ? "Premium region" : "Region of your district"),
    activite: "At least one parent is in paid work",
    revenuNote: "Yearly amount in francs.",
    primes: "Enter my current premium",
    primesTexte: "Without your premium, the tool uses the 2027 average cantonal premium from the FOPH (all models and deductibles, accident cover included). Enter what your insurer bills you per month for each person.",
    primeAdulte: "Premium of one adult",
    primeJeune: "Premium of one young adult",
    primeEnfant: "Premium of one child",
    resultat: "Your estimate",
    lieu: { GE: "for Geneva", VD: "for Vaud", FR: "for Fribourg", VS: "for Valais", NE: "for Neuchâtel", JU: "for Jura" } as Record<S.Canton, string>,
    ligneSubside: (s: string) => `Your estimated subsidy is CHF ${s} per month.`,
    detail: "See the details",
    attente: "Enter the determining income to see the subsidy.",
    mois: "per month",
    subside: "Estimated subsidy for the household",
    apres: (p: string) => `After the subsidy, the household premium is CHF ${p} per month.`,
    aucun: "With this income, the 2027 scale does not provide a subsidy for this household.",
    limite: (l: number) => `Entitlement stops at a determining income of about CHF ${nombre(l, 0, "en")} for this household.`,
    cat: "People",
    nb: "Number",
    sub: "Subsidy",
    prime: "Premium",
    net: "After subsidy",
    adulte: (n: number) => (n > 1 ? `${n} adults` : `${n} adult`),
    jeune: (n: number) => (n > 1 ? `${n} young adults` : `${n} young adult`),
    enfant: (n: number) => (n > 1 ? `${n} children` : `${n} child`),
    groupe: (g: string) => `The 2027 scale places this household in ${g.startsWith("S") ? "classification" : "group"} ${g}.`,
    vd: (o: string, s: string) => `Of which CHF ${o} ordinary subsidy and CHF ${s} specific subsidy, which applies because premiums exceed 10% of income.`,
    base: (n: string) => `The calculation uses ${n}.`,
    baseOfsp: "the 2027 average cantonal premium from the FOPH",
    baseSaisie: "the premiums you entered",
    alerte: "Indicative estimate: only the cantonal office’s decision is binding. Nothing you enter is sent anywhere.",
    comment: "How to get it",
    office: "Cantonal office",
    horsPerimetre: {
      charges: "This household has more dependants than the published scale covers: ask the cantonal office to work it out.",
      "jeunes-adultes": "In this canton young adults follow rules this tool does not cover: ask the cantonal office to work it out.",
      enfants: "For more than three children the order refers to rules this tool does not cover: ask the cantonal office to work it out.",
      region: "Choose the region.",
    } as Record<string, string>,
    infoVS: "Valais had not published its 2027 scale on 24 November 2026: no amount is calculated. See the canton’s card below.",
    comparer: "Compare 2027 premiums for your postcode",
    comparerTexte: "The subsidy comes off the premium: a lower premium lowers what you pay by the same amount.",
    liens: "Going further",
    lettre: "Health insurance cancellation letter",
    chiffres: "Key figures 2027",
    regions: {
      VD: [["1", "Region 1: Lausanne, Ouest lausannois, Nyon, La Côte, Lavaux, Riviera"], ["2", "Region 2: Chablais, Pays-d’Enhaut, Oron, Cossonay, Broye, Vully, Gros-de-Vaud, Jura, Nord vaudois"]],
      FR: [["1", "Sarine district (region 1)"], ["2", "Broye, Glâne, Gruyère, Lac, Singine or Veveyse (region 2)"]],
    } as Record<string, [string, string][]>,
    ctaCanton: "Get quotes",
    pasEnvoye: "None of these values is sent.",
  },
} as const;

const MAX_ENFANTS: Record<S.Canton, number> = { GE: 4, VD: 6, FR: 6, VS: 0, NE: 3, JU: 6 };
const JEUNES: Record<S.Canton, boolean> = { GE: true, VD: false, FR: true, VS: false, NE: false, JU: true };

function Compteur({ id, label, valeur, max, onChange }: { id: string; label: string; valeur: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="champ">
      <span id={`${id}-l`} className="font-semibold">{label}</span>
      <div className="mt-1 flex items-center gap-3" role="group" aria-labelledby={`${id}-l`}>
        <Button type="button" variant="outline" size="icon-xl" aria-label="−" disabled={valeur <= 0} onClick={() => onChange(valeur - 1)}>−</Button>
        <output id={id} className="min-w-8 text-center text-xl font-bold tabular-nums" aria-live="polite">{valeur}</output>
        <Button type="button" variant="outline" size="icon-xl" aria-label="+" disabled={valeur >= max} onClick={() => onChange(valeur + 1)}>+</Button>
      </div>
    </div>
  );
}

export function Subsides({ locale }: { locale: Locale }) {
  const t = TXT[locale];
  const [canton, setCanton] = useState<S.Canton>("GE");
  const [couple, setCouple] = useState<"seul" | "couple">("seul");
  const [enfants, setEnfants] = useState(0);
  const [jeunes, setJeunes] = useState(0);
  const [region, setRegion] = useState<S.Region>("1");
  const [activite, setActivite] = useState(false);
  const [revenu, setRevenu] = useState("");
  const [pAdulte, setPAdulte] = useState("");
  const [pJeune, setPJeune] = useState("");
  const [pEnfant, setPEnfant] = useState("");
  const [ctaVisible, setCtaVisible] = useState(true);
  const utilise = useRef(false);
  const f = (x: number, d = 0) => nombre(x, d, locale);

  const toucher = () => {
    if (!utilise.current) {
      utilise.current = true;
      suivre("subsides_utilise");
    }
  };

  const calculable = S.calcule(canton);
  const nJeunes = JEUNES[canton] ? jeunes : 0;
  const nEnfants = Math.min(enfants, MAX_ENFANTS[canton]);
  const menage: S.Menage = { adultes: couple === "couple" ? 2 : 1, enfants: nEnfants, jeunesAdultes: nJeunes };
  const ofsp = primesOfsp(canton);
  const lu = (s: string, d: number) => {
    const v = S.lireRevenu(s);
    return v != null && v > 0 ? v : d;
  };
  const primes: S.Primes = { adulte: lu(pAdulte, ofsp.adulte), jeuneAdulte: lu(pJeune, ofsp.jeuneAdulte), enfant: lu(pEnfant, ofsp.enfant) };
  const saisie = [pAdulte, pJeune, pEnfant].some((x) => S.lireRevenu(x));
  const rdu = S.lireRevenu(revenu);
  const avecRegion = canton === "VD" || canton === "FR";
  const r = calculable && rdu != null ? S.calculer({ canton, menage, rdu, region: avecRegion ? region : undefined, activite, primes }) : null;
  const limite = calculable ? S.limiteMaximale(canton, menage) : null;
  const href = lienDemande(locale, "sante");
  const comparateur = locale === "fr" ? OUTILS.comparateur : OUTILS_EN.comparateur;
  const info = S.DONNEES.cantons[canton];
  const cats = { adulte: t.adulte, jeuneAdulte: t.jeune, enfant: t.enfant };
  const vd = canton === "VD";

  const ctaPresent = calculable && r != null;
  /* Barre collante (mobile) : visible quand aucun bouton « Recevoir des offres » de la page n'est à l'écran. */
  useEffect(() => {
    const els = Array.from(document.querySelectorAll("[data-cta-subsides]"));
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const vus = new Set<Element>();
    const io = new IntersectionObserver((es) => {
      for (const e of es) {
        if (e.isIntersecting) vus.add(e.target);
        else vus.delete(e.target);
      }
      setCtaVisible(vus.size > 0);
    });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [ctaPresent]);

  const cantons = S.CANTONS.map((c) => ({ value: c, label: NOMS[c][locale] }));
  const regions = (t.regions[canton] ?? []).map(([value, label]) => ({ value: value as S.Region, label }));

  return (
    <>
      <div className="ph-sensitive outil outil-subsides" id="outil" data-ph-mask>
        <form className="form" onSubmit={(ev) => ev.preventDefault()}>
          <Card>
            <CardContent>
              <fieldset>
                <legend>{t.canton}</legend>
                <Choix id="s-canton" name="canton" value={canton} options={cantons} onChange={(v) => { setCanton(v); toucher(); }} />
              </fieldset>
              {calculable ? (
                <>
                  <fieldset>
                    <legend>{t.situation}</legend>
                    <ToggleGroup
                      variant="outline"
                      size="champ"
                      spacing={0}
                      className="w-full"
                      aria-label={t.situation}
                      value={[couple]}
                      onValueChange={(v) => { if (v[0]) { setCouple(v[0] as "seul" | "couple"); toucher(); } }}
                    >
                      <ToggleGroupItem value="seul" className="flex-1">{t.seul}</ToggleGroupItem>
                      <ToggleGroupItem value="couple" className="flex-1">{t.couple}</ToggleGroupItem>
                    </ToggleGroup>
                  </fieldset>
                  <fieldset className="s-compteurs">
                    <Compteur id="s-enfants" label={t.enfants} valeur={nEnfants} max={MAX_ENFANTS[canton]} onChange={(n) => { setEnfants(n); toucher(); }} />
                    {JEUNES[canton] ? <Compteur id="s-jeunes" label={t.jeunes} valeur={nJeunes} max={Math.max(0, MAX_ENFANTS[canton] - nEnfants)} onChange={(n) => { setJeunes(n); toucher(); }} /> : null}
                  </fieldset>
                  {avecRegion ? (
                    <fieldset>
                      <legend>{t.region(canton)}</legend>
                      <Choix id="s-region" name="region" value={region} options={regions} onChange={(v) => { setRegion(v); toucher(); }} />
                    </fieldset>
                  ) : null}
                  {canton === "JU" && nEnfants + nJeunes > 0 ? (
                    <fieldset>
                      <legend id="s-activite-l">{t.activite}</legend>
                      <Interrupteur checked={activite} onChange={(v) => { setActivite(v); toucher(); }} labelledBy="s-activite-l" />
                    </fieldset>
                  ) : null}
                  <fieldset className="dernier">
                    <legend><label htmlFor="s-revenu">{REVENU[canton].nom[locale]}</label></legend>
                    <Input id="s-revenu" inputMode="numeric" autoComplete="off" placeholder="45 000" value={revenu} onChange={(ev) => { setRevenu(ev.target.value); toucher(); }} aria-describedby="s-revenu-aide" />
                    <p className="note-outil" id="s-revenu-aide">{t.revenuNote} {REVENU[canton].aide[locale]}</p>
                    {r ? (
                      <div className="s-ligne">
                        <p>{!r.calcule ? t.horsPerimetre[r.raison] : r.droit ? t.ligneSubside(f(r.subsideMensuel)) : t.aucun}</p>
                        <a data-slot="button" className={cn(buttonVariants({ variant: "outline" }), "justify-center")} href="#s-resultat">{t.detail}</a>
                      </div>
                    ) : null}
                  </fieldset>
                  <Depliable className="affiner" titre={t.primes}>
                    <p className="note-outil">{t.primesTexte}</p>
                    <div className="categories">
                      <div className="champ">
                        <label htmlFor="s-p-adulte">{t.primeAdulte}</label>
                        <Input id="s-p-adulte" inputMode="numeric" placeholder={f(ofsp.adulte)} value={pAdulte} onChange={(ev) => { setPAdulte(ev.target.value); toucher(); }} />
                      </div>
                      {nJeunes > 0 ? (
                        <div className="champ">
                          <label htmlFor="s-p-jeune">{t.primeJeune}</label>
                          <Input id="s-p-jeune" inputMode="numeric" placeholder={f(ofsp.jeuneAdulte)} value={pJeune} onChange={(ev) => { setPJeune(ev.target.value); toucher(); }} />
                        </div>
                      ) : null}
                      {nEnfants > 0 ? (
                        <div className="champ">
                          <label htmlFor="s-p-enfant">{t.primeEnfant}</label>
                          <Input id="s-p-enfant" inputMode="numeric" placeholder={f(ofsp.enfant)} value={pEnfant} onChange={(ev) => { setPEnfant(ev.target.value); toucher(); }} />
                        </div>
                      ) : null}
                    </div>
                  </Depliable>
                </>
              ) : (
                <p className="note-outil">{t.infoVS}</p>
              )}
            </CardContent>
          </Card>
        </form>

        <div className="apercu resultat-subsides">
          {calculable ? (
          <Card className="subsides-resultat" id="s-resultat">
            <CardContent>
              <h2>{t.resultat} {t.lieu[canton]}</h2>
              <div aria-live="polite">
                {!r ? (
                  <p className="base">{t.attente}</p>
                ) : !r.calcule ? (
                  <p className="base">{t.horsPerimetre[r.raison]}</p>
                ) : r.droit ? (
                  <>
                    <p className="base">{t.subside}</p>
                    <p className="montant">{f(r.subsideMensuel)} <small>CHF {t.mois}</small></p>
                    <p className="base">{t.apres(f(r.primeNetteMensuelle, 2))}</p>
                  </>
                ) : (
                  <p className="base">{t.aucun}{limite ? ` ${t.limite(limite)}` : ""}</p>
                )}
              </div>
              {r && r.calcule ? (
                <>
                  {r.droit ? (
                    <Table variant="chiffres" className="tableau-empile">
                      <TableCaption className="visually-hidden">{t.resultat}</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead scope="col">{t.cat}</TableHead>
                          <TableHead scope="col">{t.sub}</TableHead>
                          <TableHead scope="col">{t.prime}</TableHead>
                          <TableHead scope="col">{t.net}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {r.lignes.map((l) => (
                          <TableRow key={l.categorie}>
                            <TableHead scope="row">{cats[l.categorie](l.nombre)}</TableHead>
                            <TableCell data-label={t.sub}>{f(l.subside, l.subside % 1 ? 2 : 0)}</TableCell>
                            <TableCell data-label={t.prime}>{f(l.prime, 2)}</TableCell>
                            <TableCell data-label={t.net}>{f(l.primeNette, 2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : null}
                  {r.droit && r.groupe ? <p className="base">{t.groupe(r.groupe)}</p> : null}
                  {r.droit && r.vd && r.vd.specifique > 0 ? <p className="base">{t.vd(f(r.vd.ordinaire), f(r.vd.specifique))}</p> : null}
                  <p className="base">{t.base(saisie ? t.baseSaisie : t.baseOfsp)}</p>
                  {vd ? <p className="base">{TRANSPARENCE_VD[locale]}</p> : null}
                </>
              ) : null}
              {r ? (
                <div data-cta-subsides>
                  <CtaOffres locale={locale} href={href} pleine />
                </div>
              ) : null}
            </CardContent>
          </Card>
          ) : null}

          {calculable && r && r.calcule ? <Alert>{t.alerte}</Alert> : null}

          <Card size="sm">
            <CardContent>
              <h3 className="font-bold">{t.comment}</h3>
              <p className="note-outil">{DEMARCHE[canton][locale]}</p>
              <p className="note-outil"><a className="lien-tap" href={info.autorite.url} rel="noopener">{info.autorite.nom}</a></p>
              {calculable ? <p className="note-outil">{LIMITES_OUTIL[canton][locale]}</p> : null}
            </CardContent>
          </Card>

          <div className="integrite">
            <p><a href={comparateur}>{t.comparer}</a>. {t.comparerTexte}</p>
            <p>{t.pasEnvoye}</p>
          </div>
        </div>
      </div>
      <BarreOffres locale={locale} href={href} visible={!ctaVisible} />
    </>
  );
}
