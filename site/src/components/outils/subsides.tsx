"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

/* Vaud : saisie à partir de la décision de taxation (RDU reconstitué, voir rduVD dans le moteur). */
const TXT_VD = {
  fr: {
    mode: "Votre revenu déterminant",
    taxation: "Avec ma décision de taxation",
    rdu: "Je connais mon RDU",
    net: "Revenu net (code 650)",
    netAide: "Dans le tableau « Détail de la taxation cantonale » de votre décision de taxation, à la ligne du code 650. Pour un couple, indiquez le total des deux conjoints.",
    primes: "Primes d’assurance-maladie déduites (code 300)",
    primesAide: "Dans la décision de taxation, ligne du code 300 : c’est la déduction fiscale pour vos primes d’assurance-maladie. Sans ligne 300, saisissez 0.",
    rare: "J’ai racheté des années de 2e pilier ou versé au 3e pilier",
    lpp: "Rachats d’années du 2e pilier (code 320)",
    lppAide: "Seule la part au-delà de 20 000 francs entre dans le calcul.",
    p3a: "Versements au 3e pilier A (code 310)",
    p3aAide: "Le montant est retenu en entier.",
    mob: "Fortune mobilière (codes 410 à 465 de la décision de taxation), sans déduire vos dettes",
    mobAide: (c: boolean) => `Comptes, titres et autres avoirs. Seule la part au-delà de ${nombre(c ? 120000 : 60000, 0, "fr")} francs compte, à 6,7${N}%. Les avoirs d’une entreprise se saisissent dans la fortune commerciale, pas ici. Laissez vide si vous n’avez pas de fortune.`,
    immoTitre: "Je possède un bien immobilier ou une entreprise",
    logement: "Logement dont vous êtes propriétaire (code 500)",
    logementAide: (n: string) => `Valeur fiscale de votre logement permanent, sans déduire l’hypothèque. Les premiers ${n} francs ne comptent pas.`,
    autreImmo: "Autres biens immobiliers (code 500)",
    autreImmoAide: "Valeur fiscale, sans déduire l’hypothèque. Aucune franchise ne s’applique.",
    commerciale: "Fortune commerciale (codes 450, 465 et 510)",
    commercialeAide: (n: string) => `Sans déduire les dettes commerciales. Les premiers ${n} francs ne comptent pas. Saisissez ces avoirs ici et pas une seconde fois dans la fortune mobilière.`,
    frais: "Frais d’entretien d’immeuble au-delà du forfait (code 540)",
    fraisAide: "Indiquez la part de vos frais d’entretien effectifs qui dépasse la déduction forfaitaire. Laissez vide si vous avez déduit le forfait.",
    rduLigne: (v: string) => `Votre RDU estimé est de ${v} francs.`,
    manque: "Saisissez le revenu net et les primes déduites pour voir le subside.",
    detailRdu: "Voir le calcul du RDU",
    ligne: "Ligne de la décision",
    montant: "Francs",
    l650: "Revenu net (code 650)",
    l320: "Rachats du 2e pilier au-delà de 20 000 francs (code 320)",
    l310: "Versements au 3e pilier A (code 310)",
    l300: "Primes d’assurance-maladie déduites (code 300)",
    lForfait: (a: number, e: number) => `Moins la déduction forfaitaire pour les primes (${a > 1 ? "2 adultes" : "1 adulte"}${e ? `, ${e} enfant${e > 1 ? "s" : ""}` : ""})`,
    lRdu: "RDU, avant déduction pour enfants",
    lMaj: "Majoration de 6,7 % sur la fortune retenue (voir le détail de la fortune)",
    l540: "Frais d’entretien d’immeuble au-delà du forfait (code 540)",
    fortuneTitre: "Fortune",
    fMob: "Fortune mobilière (codes 410 à 465)",
    fLog: (n: string) => `Logement propre (code 500), après franchise de ${n} francs`,
    fAutre: "Autres biens immobiliers (code 500)",
    fCom: (n: string) => `Fortune commerciale (codes 450, 465, 510), après franchise de ${n} francs`,
    fTotal: "Total des montants retenus",
    fFranchise: "Moins la franchise générale",
    fRetenue: "Fortune retenue",
    hyp: "L’OVAM retient la décision de taxation définitive la plus récente.",
  },
  en: {
    mode: "Your determining income",
    taxation: "With my tax assessment",
    rdu: "I know my RDU",
    net: "Net income (code 650)",
    netAide: "In the “Détail de la taxation cantonale” table of your tax assessment, on the line with code 650. For a couple, enter the total of both spouses.",
    primes: "Health insurance premiums deducted (code 300)",
    primesAide: "In the tax assessment, line with code 300: it is the tax deduction for your health insurance premiums. If there is no line 300, enter 0.",
    rare: "I bought back second-pillar years or paid into pillar 3",
    lpp: "Second-pillar buy-ins (code 320)",
    lppAide: "Only the part above CHF 20,000 counts.",
    p3a: "Pillar 3a payments (code 310)",
    p3aAide: "The full amount counts.",
    mob: "Movable wealth (codes 410 to 465 of the tax assessment), before deducting your debts",
    mobAide: (c: boolean) => `Accounts, securities and other assets. Only the part above CHF ${nombre(c ? 120000 : 60000, 0, "en")} counts, at 6.7%. Business assets go in business wealth, not here. Leave empty if you have no wealth.`,
    immoTitre: "I own property or a business",
    logement: "Home you own (code 500)",
    logementAide: (n: string) => `Tax value of your permanent home, without deducting the mortgage. The first CHF ${n} do not count.`,
    autreImmo: "Other property (code 500)",
    autreImmoAide: "Tax value, without deducting the mortgage. No allowance applies.",
    commerciale: "Business wealth (codes 450, 465 and 510)",
    commercialeAide: (n: string) => `Without deducting business debts. The first CHF ${n} do not count. Enter these assets here and not a second time in movable wealth.`,
    frais: "Property maintenance costs above the flat deduction (code 540)",
    fraisAide: "Enter the part of your actual maintenance costs that exceeds the flat-rate deduction. Leave empty if you deducted the flat rate.",
    rduLigne: (v: string) => `Your estimated RDU is CHF ${v}.`,
    manque: "Enter net income and deducted premiums to see the subsidy.",
    detailRdu: "See how the RDU is worked out",
    ligne: "Line of the assessment",
    montant: "CHF",
    l650: "Net income (code 650)",
    l320: "Second-pillar buy-ins above CHF 20,000 (code 320)",
    l310: "Pillar 3a payments (code 310)",
    l300: "Health insurance premiums deducted (code 300)",
    lForfait: (a: number, e: number) => `Less the flat deduction for premiums (${a > 1 ? "2 adults" : "1 adult"}${e ? `, ${e} child${e > 1 ? "ren" : ""}` : ""})`,
    lRdu: "RDU, before the child deduction",
    lMaj: "6.7% surcharge on the wealth retained (see the wealth details)",
    l540: "Property maintenance costs above the flat deduction (code 540)",
    fortuneTitre: "Wealth",
    fMob: "Movable wealth (codes 410 to 465)",
    fLog: (n: string) => `Home you own (code 500), after the CHF ${n} allowance`,
    fAutre: "Other property (code 500)",
    fCom: (n: string) => `Business wealth (codes 450, 465, 510), after the CHF ${n} allowance`,
    fTotal: "Total of the amounts retained",
    fFranchise: "Less the general allowance",
    fRetenue: "Wealth retained",
    hyp: "The OVAM uses the most recent final tax assessment.",
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

function Nombre({ id, label, aide, placeholder, value, locale, onChange }: { id: string; label: string; aide: string; placeholder: string; value: string; locale: Locale; onChange: (v: string) => void }) {
  const champ = useRef<HTMLInputElement>(null);
  const avantCurseur = useRef<number | null>(null);
  const affiche = value ? nombre(Number(value), 0, locale) : "";
  /* Après chaque mise en forme, le curseur revient après le même nombre de chiffres que dans la saisie. */
  useLayoutEffect(() => {
    const el = champ.current;
    const n = avantCurseur.current;
    if (!el || n === null || document.activeElement !== el) return;
    avantCurseur.current = null;
    let vus = 0;
    let pos = 0;
    while (pos < el.value.length && vus < n) {
      if (/\d/.test(el.value[pos])) vus++;
      pos++;
    }
    el.setSelectionRange(pos, pos);
  }, [affiche]);
  return (
    <div className="champ">
      <label htmlFor={id} className="font-semibold">{label}</label>
      <Input
        id={id}
        ref={champ}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={affiche}
        aria-describedby={`${id}-aide`}
        onChange={(ev) => {
          const brut = ev.target.value;
          const apres = brut.slice(0, ev.target.selectionStart ?? brut.length).replace(/\D/g, "").length;
          const c = brut.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9);
          avantCurseur.current = Math.min(apres, c.length);
          onChange(c);
        }}
      />
      <p className="note-outil" id={`${id}-aide`}>{aide}</p>
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
  const [vdMode, setVdMode] = useState<"taxation" | "rdu">("taxation");
  const [vNet, setVNet] = useState("");
  const [vPrimes, setVPrimes] = useState("");
  const [vLpp, setVLpp] = useState("");
  const [v3a, setV3a] = useState("");
  const [vMob, setVMob] = useState("");
  const [vLog, setVLog] = useState("");
  const [vAutre, setVAutre] = useState("");
  const [vCom, setVCom] = useState("");
  const [vFrais, setVFrais] = useState("");
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
  const vdTaxation = canton === "VD" && vdMode === "taxation";
  const tv = TXT_VD[locale];
  const vNetN = S.lireRevenu(vNet);
  const vPrimesN = S.lireRevenu(vPrimes);
  const detailRdu =
    vdTaxation && vNetN != null && vPrimesN != null
      ? S.rduVD({ revenuNet: vNetN, primesDeduites: vPrimesN, rachatsLpp: S.lireRevenu(vLpp) ?? 0, versements3a: S.lireRevenu(v3a) ?? 0, fortuneMobiliere: S.lireRevenu(vMob) ?? 0, logementPropre: S.lireRevenu(vLog) ?? 0, autreImmobilier: S.lireRevenu(vAutre) ?? 0, fortuneCommerciale: S.lireRevenu(vCom) ?? 0, fraisEntretien: S.lireRevenu(vFrais) ?? 0, adultes: menage.adultes, enfants: nEnfants })
      : null;
  const rdu = vdTaxation ? (detailRdu ? detailRdu.rdu : null) : S.lireRevenu(revenu);
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

  const ligne = r ? (
    <div className="s-ligne">
      <p>{!r.calcule ? t.horsPerimetre[r.raison] : r.droit ? t.ligneSubside(f(r.subsideMensuel)) : t.aucun}</p>
      <a data-slot="button" className={cn(buttonVariants({ variant: "outline" }), "justify-center")} href="#s-resultat">{t.detail}</a>
    </div>
  ) : null;

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
                  {vd ? (
                    <fieldset>
                      <legend>{tv.mode}</legend>
                      <ToggleGroup
                        variant="outline"
                        size="champ"
                        spacing={0}
                        className="w-full"
                        aria-label={tv.mode}
                        value={[vdMode]}
                        onValueChange={(v) => { if (v[0]) { setVdMode(v[0] as "taxation" | "rdu"); toucher(); } }}
                      >
                        <ToggleGroupItem value="taxation" className="h-auto min-h-12 flex-1 self-stretch whitespace-normal px-2 py-2 text-center">{tv.taxation}</ToggleGroupItem>
                        <ToggleGroupItem value="rdu" className="h-auto min-h-12 flex-1 self-stretch whitespace-normal px-2 py-2 text-center">{tv.rdu}</ToggleGroupItem>
                      </ToggleGroup>
                    </fieldset>
                  ) : null}
                  {vdTaxation ? (
                    <fieldset className="dernier s-taxation">
                      <Nombre id="s-v-net" label={tv.net} aide={tv.netAide} placeholder="60 000" value={vNet} locale={locale} onChange={(x) => { setVNet(x); toucher(); }} />
                      <Nombre id="s-v-primes" label={tv.primes} aide={tv.primesAide} placeholder="3 000" value={vPrimes} locale={locale} onChange={(x) => { setVPrimes(x); toucher(); }} />
                      <Nombre id="s-v-mob" label={tv.mob} aide={tv.mobAide(couple === "couple")} placeholder="0" value={vMob} locale={locale} onChange={(x) => { setVMob(x); toucher(); }} />
                      <Depliable className="affiner" titre={tv.rare}>
                        <Nombre id="s-v-lpp" label={tv.lpp} aide={tv.lppAide} placeholder="0" value={vLpp} locale={locale} onChange={(x) => { setVLpp(x); toucher(); }} />
                        <Nombre id="s-v-3a" label={tv.p3a} aide={tv.p3aAide} placeholder="0" value={v3a} locale={locale} onChange={(x) => { setV3a(x); toucher(); }} />
                      </Depliable>
                      <Depliable className="affiner" titre={tv.immoTitre}>
                        <Nombre id="s-v-log" label={tv.logement} aide={tv.logementAide(f(S.RDU_VD.franchiseLogement))} placeholder="0" value={vLog} locale={locale} onChange={(x) => { setVLog(x); toucher(); }} />
                        <Nombre id="s-v-autre" label={tv.autreImmo} aide={tv.autreImmoAide} placeholder="0" value={vAutre} locale={locale} onChange={(x) => { setVAutre(x); toucher(); }} />
                        <Nombre id="s-v-com" label={tv.commerciale} aide={tv.commercialeAide(f(S.RDU_VD.franchiseCommerciale))} placeholder="0" value={vCom} locale={locale} onChange={(x) => { setVCom(x); toucher(); }} />
                        <Nombre id="s-v-frais" label={tv.frais} aide={tv.fraisAide} placeholder="0" value={vFrais} locale={locale} onChange={(x) => { setVFrais(x); toucher(); }} />
                      </Depliable>
                      {detailRdu ? <p className="s-rdu" aria-live="polite">{tv.rduLigne(f(detailRdu.rdu))}</p> : null}
                      {ligne}
                    </fieldset>
                  ) : (
                  <fieldset className="dernier">
                    <legend><label htmlFor="s-revenu">{REVENU[canton].nom[locale]}</label></legend>
                    <Input id="s-revenu" inputMode="numeric" autoComplete="off" placeholder="45 000" value={revenu} onChange={(ev) => { setRevenu(ev.target.value); toucher(); }} aria-describedby="s-revenu-aide" />
                    <p className="note-outil" id="s-revenu-aide">{t.revenuNote} {REVENU[canton].aide[locale]}</p>
                    {ligne}
                  </fieldset>
                  )}
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
                  <p className="base">{vdTaxation ? tv.manque : t.attente}</p>
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
                  {detailRdu ? (
                    <Depliable className="affiner" titre={tv.detailRdu}>
                      <Table variant="chiffres">
                        <TableCaption className="visually-hidden">{tv.detailRdu}</TableCaption>
                        <TableHeader>
                          <TableRow>
                            <TableHead scope="col">{tv.ligne}</TableHead>
                            <TableHead scope="col" className="text-right">{tv.montant}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow><TableHead scope="row">{tv.l650}</TableHead><TableCell className="text-right">{f(detailRdu.revenuNet)}</TableCell></TableRow>
                          <TableRow><TableHead scope="row">{tv.l320}</TableHead><TableCell className="text-right">{f(detailRdu.rachatsRetenus)}</TableCell></TableRow>
                          <TableRow><TableHead scope="row">{tv.l310}</TableHead><TableCell className="text-right">{f(detailRdu.versements3a)}</TableCell></TableRow>
                          <TableRow><TableHead scope="row">{tv.l300}</TableHead><TableCell className="text-right">{f(detailRdu.primesDeduites)}</TableCell></TableRow>
                          {detailRdu.fraisEntretien > 0 ? <TableRow><TableHead scope="row">{tv.l540}</TableHead><TableCell className="text-right">{f(detailRdu.fraisEntretien)}</TableCell></TableRow> : null}
                          {detailRdu.majorationFortune > 0 ? <TableRow><TableHead scope="row">{tv.lMaj}</TableHead><TableCell className="text-right">{f(detailRdu.majorationFortune)}</TableCell></TableRow> : null}
                          <TableRow><TableHead scope="row">{tv.lForfait(menage.adultes, nEnfants)}</TableHead><TableCell className="text-right">{f(-detailRdu.deductionForfaitaire)}</TableCell></TableRow>
                          <TableRow><TableHead scope="row">{tv.lRdu}</TableHead><TableCell className="text-right">{f(detailRdu.rdu)}</TableCell></TableRow>
                        </TableBody>
                      </Table>
                      {detailRdu.fortuneAvantFranchise > 0 ? (
                        <Table variant="chiffres">
                          <TableCaption className="visually-hidden">{tv.fortuneTitre}</TableCaption>
                          <TableHeader>
                            <TableRow>
                              <TableHead scope="col">{tv.fortuneTitre}</TableHead>
                              <TableHead scope="col" className="text-right">{tv.montant}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detailRdu.fortuneMobiliere > 0 ? <TableRow><TableHead scope="row">{tv.fMob}</TableHead><TableCell className="text-right">{f(detailRdu.fortuneMobiliere)}</TableCell></TableRow> : null}
                            {detailRdu.logementPropre > 0 ? <TableRow><TableHead scope="row">{tv.fLog(f(S.RDU_VD.franchiseLogement))}</TableHead><TableCell className="text-right">{f(detailRdu.logementRetenu)}</TableCell></TableRow> : null}
                            {detailRdu.autreImmobilier > 0 ? <TableRow><TableHead scope="row">{tv.fAutre}</TableHead><TableCell className="text-right">{f(detailRdu.autreImmobilier)}</TableCell></TableRow> : null}
                            {detailRdu.fortuneCommerciale > 0 ? <TableRow><TableHead scope="row">{tv.fCom(f(S.RDU_VD.franchiseCommerciale))}</TableHead><TableCell className="text-right">{f(detailRdu.commercialeRetenue)}</TableCell></TableRow> : null}
                            <TableRow><TableHead scope="row">{tv.fTotal}</TableHead><TableCell className="text-right">{f(detailRdu.fortuneAvantFranchise)}</TableCell></TableRow>
                            <TableRow><TableHead scope="row">{tv.fFranchise}</TableHead><TableCell className="text-right">{f(-Math.min(detailRdu.franchiseFortune, detailRdu.fortuneAvantFranchise))}</TableCell></TableRow>
                            <TableRow><TableHead scope="row">{tv.fRetenue}</TableHead><TableCell className="text-right">{f(detailRdu.fortuneRetenue)}</TableCell></TableRow>
                          </TableBody>
                        </Table>
                      ) : null}
                      <p className="base">{tv.hyp}</p>
                    </Depliable>
                  ) : null}
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
