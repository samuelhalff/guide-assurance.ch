"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as P from "@/lib/engines/primes";
import type { Locale } from "@/lib/i18n";
import { suivre, versGA } from "@/lib/analytics";
import { outils } from "@/lib/nav";
import { RAPPEL, ecrirePreremplissage, lienDemande } from "@/lib/demande";
import { IconeTelephone, useRappelVu } from "@/components/demande/lien-rappel";
import { dateCh } from "@/lib/taux3a";
import dynamic from "next/dynamic";
import type { OffreComparateurHandle } from "@/components/outils/offre-comparateur";
import { chargerApresAffichage } from "@/lib/charge-differee";
import { Choix } from "@/components/outils/choix";
import { Case } from "@/components/controle-case";
import { ChoixBoutons } from "@/components/controle-boutons";
import { Depliable } from "@/components/controle-depliable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { chf as chfBase, nombre as formaterNombre, ESPACE_FINE as T, INSECABLE as NB } from "@/lib/nombres";

/* Comparateur de primes LAMal 2027. Les données du canton sont chargées à la demande (public/data/primes-2027) ;
   le calcul se fait dans le navigateur, rien de ce qui est saisi n'est envoyé ni mis dans l'adresse.
   Cadre (docs/decisions.md §0 bis) : des faits triés selon les critères du visiteur, aucune recommandation.
   Parcours repris de priminfo (research/05-benchmark-comparateurs.md) : lieu, année, franchise, accident ; le modèle,
   l'affichage mois/an et la caisse actuelle viennent après, sur la liste. */

const nfFr = (x: number, d = 0) => formaterNombre(x, d, "fr"); // sans Intl : l'ICU du build et celle du navigateur diffèrent (src/lib/nombres.ts)
const nfEn = (x: number, d = 0) => formaterNombre(x, d, "en");

const PAR_PAGE = 20;
/* Offres montrées avant le bloc « Recevoir des offres pour ce profil » (liste mobile). */
const OFFRES_AVANT_BLOC = 3;
type Tri = "prix" | "prixDesc" | "assureur";

const CANTON_FR: Record<P.Canton, string> = { GE: "Genève", VD: "Vaud", VS: "Valais", FR: "Fribourg", NE: "Neuchâtel", JU: "Jura", BE: "Jura bernois" };
const CANTON_EN: Record<P.Canton, string> = { GE: "Geneva", VD: "Vaud", VS: "Valais", FR: "Fribourg", NE: "Neuchâtel", JU: "Jura", BE: "Bernese Jura" };
/* Cantons à plusieurs régions de prime couvertes (OFSP, régions 2027). */
const MULTI: P.Canton[] = ["VD", "VS", "FR"];
/* Bornes de l'année de naissance acceptée, tirées de P.anneeValide (pour le message d'erreur du champ). */
const ANNEE_MIN = (() => { let a = P.ANNEE; while (P.anneeValide(a - 1)) a--; return a; })();
const ANNEE_MAX = (() => { let a = P.ANNEE; while (P.anneeValide(a + 1)) a++; return a; })();

const TXT = {
  fr: {
    lieu: "NPA ou localité",
    lieuAide: "Votre domicile. La prime dépend de la région de prime de votre commune.",
    lieuPh: "ex. 1201 ou Lausanne",
    inconnu: "Ce lieu ne fait pas partie des régions couvertes (Genève, Vaud, Valais, Fribourg, Neuchâtel, Jura et Jura bernois). Pour le reste de la Suisse, les primes figurent sur priminfo.admin.ch.",
    plusieurs: `Ce NPA couvre plusieurs régions de prime. Votre commune${T}:`,
    region: (ct: P.Canton, r: number) => (MULTI.includes(ct) ? `${CANTON_FR[ct]}, région ${r}` : CANTON_FR[ct]),
    naissance: "Année de naissance",
    classe: { enfant: "Tarif enfant (18 ans ou moins en 2027).", jeune: "Tarif jeune adulte (19 à 25 ans en 2027).", adulte: "Tarif adulte (26 ans et plus en 2027)." } as Record<P.Classe, string>,
    classeCourt: { enfant: "un enfant", jeune: "un jeune adulte", adulte: "un adulte" } as Record<P.Classe, string>,
    anneeHors: (a: number, b: number) => `Indiquez une année de naissance entre ${a} et ${b}.`,
    lieuVide: "Indiquez votre NPA ou votre localité.",
    lieuIntrouvable: "Indiquez un NPA à 4 chiffres ou choisissez votre localité dans la liste.",
    personne: (n: number) => `Personne ${n}`,
    ajouter: "Ajouter une personne",
    retirer: "Retirer",
    accidentCase: "Assurance accidents",
    accidentInfo: `Cochée d'office pour les enfants et dès 65${NB}ans. Inutile si vous travaillez au moins 8${NB}heures par semaine chez le même employeur, car son assurance accidents (LAA) vous couvre déjà.`,
    voir: "Voir les primes",
    voirN: (n: number) => (n > 1 ? `Voir les ${n} offres` : "Voir l’offre"),
    enDirect: "Les primes se mettent à jour à chaque changement.",
    caisseTitre: (a: string, p: string) => `Vous êtes chez ${a}, avec le modèle ${p}`,
    caisseRang: (m: string, an: string, rang: number, n: number) => {
      const k = rang - 1;
      return `Votre offre actuelle est au rang ${rang} sur ${n} par la prime. Vous payez ${m} par mois, soit ${an} par an${k === 0 ? ", et aucune offre de la liste n’a une prime plus basse." : k === 1 ? ", et une offre de la liste a une prime plus basse." : `, et ${k} offres de la liste ont une prime plus basse.`}`;
    },
    caisseHors: (m: string, an: string) => `Vous payez ${m} par mois, soit ${an} par an. Ce modèle n’est pas dans la liste filtrée.`,
    caisseGain: (x: string) => ` La prime la plus basse de la liste représente ${x} de moins par an.`,
    ecartCaisse: "Afficher l’écart avec ma caisse actuelle",
    resumeFoyer: (n: number, lieu: string, nb: number) => `${n} offre${n > 1 ? "s" : ""} pour ${nb} personnes à ${lieu}, total du foyer.`,
    foyerNote: "Le total du foyer suppose que chaque personne est assurée chez le même assureur, dans le même modèle.",
    detail: "Détail par personne",
    pers: (k: number, cl: string, f: number) => `Personne ${k}, ${cl}, franchise ${nfFr(f)}`,
    franchise: "Franchise, en CHF par an",
    franchiseCourt: "Franchise (CHF)",
    franchiseAide: "Ce que vous payez vous-même chaque année avant que l’assurance rembourse.",
    accident: "Couverture accident",
    avec: "Avec accident",
    sans: "Sans accident",
    sansAide: "La couverture accident est inutile si vous travaillez au moins 8 heures par semaine chez le même employeur, car son assurance accidents (LAA) vous couvre.",
    modele: "Modèle",
    filtres: {
      tous: "Tous les modèles",
      BASE: "Standard : libre choix du médecin",
      PRAXIS: "Cabinet désigné : médecin de famille ou HMO",
      TEL_DIG: "D’abord un appel ou une application",
      PHARM: "D’abord une pharmacie",
      FLEX: "Au choix : cabinet, appel ou pharmacie",
    } as Record<P.Filtre, string>,
    types: { BASE: "Standard : libre choix du médecin", PRAXIS: "Premier contact : votre cabinet désigné (médecin de famille ou HMO)", TEL_DIG: "Premier contact : appel ou application", PHARM: "Premier contact : pharmacie partenaire", FLEX: "Premier contact : au choix (cabinet, appel ou pharmacie)" } as Record<P.TypeModele, string>,
    typesCourts: { BASE: "Standard, libre choix", PRAXIS: "Médecin de famille ou HMO", TEL_DIG: "Appel ou application d’abord", PHARM: "Pharmacie d’abord", FLEX: "Premier contact au choix" } as Record<P.TypeModele, string>,
    titre: (lieu: string) => `Assurance maladie à ${lieu}`,
    lienProfil: "Copier le lien de ce profil",
    lienCopie: "Lien copié. Votre lieu, vos années de naissance et vos franchises figurent après le signe #, une partie de l’adresse que le navigateur ne transmet pas à notre serveur.",
    trier: "Trier",
    tris: { prix: "Prime croissante", prixDesc: "Prime décroissante", assureur: "Assureur, A à Z" } as Record<Tri, string>,
    triCourt: { prix: "Triées de la prime la plus basse à la plus haute.", prixDesc: "Triées de la prime la plus haute à la plus basse.", assureur: "Triées par assureur, de A à Z." } as Record<Tri, string>,
    details: "Détails",
    plus: (n: number, total: number) => `Afficher plus (${n} sur ${total})`,
    modifier: "Modifier le profil",
    trierFiltrer: "Trier / filtrer",
    profilCourt: "Profil",
    trierCourt: "Trier",
    offresCourt: "Recevoir des offres",
    franchiseDe: (f: number) => `franchise ${nfFr(f)}${NB}CHF`,
    accOui: "avec accident",
    accNon: "sans accident",
    affichage: "Afficher les primes par mois ou par an",
    periodeCourt: { mois: "Mois", an: "An" },
    mois: "par mois",
    an: "par an",
    caisseAide: "L’écart entre chaque offre et la prime 2027 de votre caisse actuelle s’affiche dans la liste. Ce choix n’est envoyé nulle part.",
    assureur: "Assureur",
    produit: "Votre modèle actuel",
    choisir: "Choisir",
    attente: "La liste des primes 2027 s’affiche ici dès que votre lieu et votre année de naissance sont indiqués.",
    chargement: "Chargement des primes…",
    erreur: "Les primes n’ont pas pu être chargées. Vérifiez votre connexion et réessayez.",
    aucune: "Aucun assureur ne propose ce modèle pour ce profil. Les autres modèles restent disponibles dans le filtre.",
    resultat: "Résultat",
    resume: (n: number, lieu: string, cl: string, fr: number, acc: boolean) =>
      `${n} offre${n > 1 ? "s" : ""} pour ${cl} à ${lieu}, franchise ${nfFr(fr)}${NB}CHF, ${acc ? "avec" : "sans"} accident.`,
    tri: "Triées de la prime la plus basse à la plus haute.",
    fourchette: (a: string, b: string, m: string, u: string, x: string) =>
      `Les primes vont de ${a} à ${b} ${u}, pour une moyenne de ${m}. La redistribution des taxes environnementales retire encore ${x} par mois et par personne, quel que soit l’assureur.`,
    memes: "Les prestations de l’assurance de base sont fixées par la loi et identiques partout ; seuls changent la prime, les règles du modèle et le service.",
    caption: (caisse: boolean) => `Primes 2027 de chaque offre, avec l’écart annuel ${caisse ? "face à votre caisse actuelle" : "face à la 1re offre de la liste"} et face à la moyenne de la liste.`,
    captionSuite: (a: number, b: number) => `Suite de la liste, offres ${a} à ${b}`,
    thOffre: "Assureur et modèle",
    thPrime: "Prime",
    thTotal: "Total",
    thEcart: "Écart par an",
    thCaisse: "Votre caisse",
    ecartAnCourt: "écart par an",
    vsPremiere: "par rapport à la 1re offre",
    vsMoyenne: "par rapport à la moyenne",
    vsActuelle: "par rapport à votre caisse",
    votreCaisse: "Votre caisse actuelle",
    plusBasse: "Prime la plus basse",
    faceCaisse: "face à votre caisse",
    facePremiere: "face à la 1re offre",
    faceMoyenne: "face à la moyenne",
    apresRedis: "après redistribution",
    avantRedis: "avant redistribution",
    parAn: "CHF par an",
    toutes: (n: number) => `Afficher les ${n} offres`,
    moins: "Réduire la liste",
    rappelQ: `Une question sur ces résultats${T}?`,
    rappel: "Être rappelé",
    rappelSuite: " par un conseiller d’un courtier partenaire, gratuitement.",
    rappelBas: `Une question${T}? Être rappelé`,
    redistribution: (x: string) =>
      `La prime est le montant approuvé par l’OFSP. La redistribution est la part des taxes environnementales que l’assureur déduit de chaque facture (${x} par mois et par personne en 2027). Le total correspond à ce que vous payez.`,
    reseau: "Certains modèles à réseau ne sont proposés que dans une partie de la région. L’assureur vous dira si votre commune en fait partie.",
    source: (d: string) => `Primes 2027 approuvées par l’OFSP (Priminfo), données du ${d}. La prime de votre police fait foi.`,
    integrite: (d: string) => `Mis à jour le ${d}. Aucun assureur ne paie pour figurer ici ni pour l’ordre des résultats.`,
    franchisesTitre: "Le même profil avec les autres franchises",
    franchisesTexte: (qp: string) =>
      `Une franchise plus haute fait baisser la prime, et une plus grande part des frais reste à votre charge. La dernière colonne additionne la prime annuelle de la 1re offre, la franchise entière et la quote-part maximale (10${NB}% des frais, au plus ${qp} par an).`,
    thFranchise: "Franchise",
    thPremiere: "1re offre, prime par an",
    thMax: "Au plus à votre charge",
    delai: "Pour changer de caisse au 1er janvier 2027, votre résiliation doit lui parvenir au plus tard le 30 novembre 2026.",
    lettre: "Préparer ma lettre de résiliation",
    accompagne: "Être rappelé pour changer d’assureur",
    accompagneSuite: ", par un conseiller d’un courtier partenaire. Votre nom et votre numéro suffisent.",
    complet: "Le formulaire complet",
    completSuite: " reprend le profil saisi ici, si vous préférez tout décrire.",
  },
  en: {
    lieu: "Postcode or town",
    lieuAide: "Your home. The premium depends on the premium region of your municipality.",
    lieuPh: "e.g. 1201 or Lausanne",
    inconnu: "Place not found in the regions covered: Geneva, Vaud, Valais, Fribourg, Neuchâtel, Jura and the Bernese Jura. Elsewhere, see priminfo.admin.ch.",
    plusieurs: "This postcode covers several premium regions. Your municipality:",
    region: (ct: P.Canton, r: number) => (MULTI.includes(ct) ? `${CANTON_EN[ct]}, region ${r}` : CANTON_EN[ct]),
    naissance: "Year of birth",
    classe: { enfant: "Child rate (18 or under in 2027).", jeune: "Young adult rate (19 to 25 in 2027).", adulte: "Adult rate (26 and over in 2027)." } as Record<P.Classe, string>,
    classeCourt: { enfant: "a child", jeune: "a young adult", adulte: "an adult" } as Record<P.Classe, string>,
    anneeHors: (a: number, b: number) => `Enter a year of birth between ${a} and ${b}.`,
    lieuVide: "Enter your postcode or town.",
    lieuIntrouvable: "Enter a 4-digit postcode or pick your town from the list.",
    personne: (n: number) => `Person ${n}`,
    ajouter: "Add a person",
    retirer: "Remove",
    accidentCase: "Accident insurance",
    accidentInfo: "Ticked by default for children and from age 65. Not needed if you work at least 8 hours a week for the same employer, because their accident insurance (LAA) already covers you.",
    voir: "See the premiums",
    voirN: (n: number) => (n > 1 ? `See the ${n} offers` : "See the offer"),
    enDirect: "Premiums update as soon as you change an answer.",
    caisseTitre: (a: string, p: string) => `You are with ${a}, on the ${p} model`,
    caisseRang: (m: string, an: string, rang: number, n: number) => {
      const k = rang - 1;
      return `Your current offer ranks ${rang} out of ${n} by premium. You pay ${m} a month, or ${an} a year${k === 0 ? ", and no offer in the list has a lower premium." : k === 1 ? ", and one offer in the list has a lower premium." : `, and ${k} offers in the list have a lower premium.`}`;
    },
    caisseHors: (m: string, an: string) => `You pay ${m} a month, or ${an} a year. This model is not in the filtered list.`,
    caisseGain: (x: string) => ` The lowest premium in the list is ${x} less a year.`,
    ecartCaisse: "Show the difference with my current insurer",
    resumeFoyer: (n: number, lieu: string, nb: number) => `${n} offer${n > 1 ? "s" : ""} for ${nb} people in ${lieu}, household total.`,
    foyerNote: "The household total assumes that each person is insured with the same insurer, in the same model.",
    detail: "Per person",
    pers: (k: number, cl: string, f: number) => `Person ${k}, ${cl}, deductible ${nfEn(f)}`,
    franchise: "Deductible (franchise), CHF per year",
    franchiseCourt: "Deductible (CHF)",
    franchiseAide: "What you pay yourself each year before the insurer starts to reimburse.",
    accident: "Accident cover",
    avec: "With accident",
    sans: "No accident",
    sansAide: "Accident cover is not needed if you work at least 8 hours a week for the same employer, because their accident insurance (LAA) covers you.",
    modele: "Model",
    filtres: {
      tous: "All models",
      BASE: "Standard: free choice of doctor",
      PRAXIS: "Designated practice: family doctor or HMO",
      TEL_DIG: "First a call or an app",
      PHARM: "First a pharmacy",
      FLEX: "Your choice: practice, call or pharmacy",
    } as Record<P.Filtre, string>,
    types: { BASE: "Standard: free choice of doctor", PRAXIS: "First contact: your designated practice (family doctor or HMO)", TEL_DIG: "First contact: a call or an app", PHARM: "First contact: a partner pharmacy", FLEX: "First contact: your choice (practice, call or pharmacy)" } as Record<P.TypeModele, string>,
    typesCourts: { BASE: "Standard, free choice", PRAXIS: "Family doctor or HMO", TEL_DIG: "Call or app first", PHARM: "Pharmacy first", FLEX: "First contact of your choice" } as Record<P.TypeModele, string>,
    titre: (lieu: string) => `Health insurance in ${lieu}`,
    lienProfil: "Copy the link to this profile",
    lienCopie: "Link copied. Your place, years of birth and deductibles sit after the # sign, a part of the address that the browser does not send to our server.",
    trier: "Sort",
    tris: { prix: "Lowest first", prixDesc: "Highest first", assureur: "Insurer A to Z" } as Record<Tri, string>,
    triCourt: { prix: "Sorted from the lowest to the highest premium.", prixDesc: "Sorted from the highest to the lowest premium.", assureur: "Sorted by insurer, A to Z." } as Record<Tri, string>,
    details: "Details",
    plus: (n: number, total: number) => `Show more (${n} of ${total})`,
    modifier: "Edit profile",
    trierFiltrer: "Sort / filter",
    profilCourt: "Profile",
    trierCourt: "Sort",
    offresCourt: "Get offers",
    franchiseDe: (f: number) => `deductible CHF${NB}${nfEn(f)}`,
    accOui: "with accident cover",
    accNon: "without accident cover",
    affichage: "Show premiums per month or per year",
    periodeCourt: { mois: "Month", an: "Year" },
    mois: "per month",
    an: "per year",
    caisseAide: "The list then shows the difference between each offer and your current insurer’s 2027 premium. This choice is not sent anywhere.",
    assureur: "Insurer",
    produit: "Your current model",
    choisir: "Choose",
    attente: "The list of 2027 premiums appears here once your place and year of birth are entered.",
    chargement: "Loading premiums…",
    erreur: "The premiums could not be loaded. Check your connection and try again.",
    aucune: "No insurer offers this model for this profile. The other models are still available in the filter.",
    resultat: "Result",
    resume: (n: number, lieu: string, cl: string, fr: number, acc: boolean) =>
      `${n} offer${n > 1 ? "s" : ""} for ${cl} in ${lieu}, deductible CHF${NB}${nfEn(fr)}, ${acc ? "with" : "without"} accident cover.`,
    tri: "Sorted from the lowest to the highest premium.",
    fourchette: (a: string, b: string, m: string, u: string, x: string) =>
      `Premiums range from ${a} to ${b} ${u}, with an average of ${m}. The environmental levy redistribution then takes off ${x} a month per person, whichever insurer you choose.`,
    memes: "Basic insurance benefits are set by law and identical everywhere; only the premium, the model’s rules and the service differ.",
    caption: (caisse: boolean) => `2027 premiums of each offer, with the yearly difference ${caisse ? "against your current insurer" : "against the 1st offer in the list"} and against the list average.`,
    captionSuite: (a: number, b: number) => `List continued, offers ${a} to ${b}`,
    thOffre: "Insurer and model",
    thPrime: "Premium",
    thTotal: "Total",
    thEcart: "Difference per year",
    thCaisse: "Your insurer",
    ecartAnCourt: "difference per year",
    vsPremiere: "compared with the 1st offer",
    vsMoyenne: "compared with the average",
    vsActuelle: "compared with your insurer",
    votreCaisse: "Your current insurer",
    plusBasse: "Lowest premium",
    faceCaisse: "against your insurer",
    facePremiere: "against the 1st offer",
    faceMoyenne: "against the average",
    apresRedis: "after redistribution",
    avantRedis: "before redistribution",
    parAn: "CHF per year",
    toutes: (n: number) => `Show all ${n} offers`,
    moins: "Shorten the list",
    rappelQ: "A question about these results?",
    rappel: "Ask for a call back",
    rappelSuite: " from an adviser of a partner broker, free of charge.",
    rappelBas: "A question? Call me back",
    redistribution: (x: string) =>
      `The premium is the amount approved by the FOPH (OFSP). The redistribution is the share of environmental levies that the insurer deducts from each bill (${x} a month per person in 2027). The total is what you pay.`,
    reseau: "Some network models are offered only in part of the region. The insurer can tell you whether your municipality is included.",
    source: (d: string) => `2027 premiums approved by the FOPH (OFSP, Priminfo), data of ${d}. The premium on your policy is what counts.`,
    integrite: (d: string) => `Updated on ${d}. No insurer pays to be listed here or for the order of the results.`,
    franchisesTitre: "The same profile with the other deductibles",
    franchisesTexte: (qp: string) =>
      `A higher deductible lowers the premium, and more of your costs stay with you. The last column adds up the yearly premium of the 1st offer, the full deductible and the maximum co-payment (10% of costs, at most ${qp} a year).`,
    thFranchise: "Deductible",
    thPremiere: "1st offer, premium per year",
    thMax: "At most out of pocket",
    delai: "To change insurer on 1 January 2027, your cancellation must reach your current insurer by 30 November 2026 at the latest.",
    lettre: "Prepare my cancellation letter",
    accompagne: "Get a call back to switch insurer",
    accompagneSuite: ", from an adviser of a partner broker. Your name and number are enough.",
    complet: "The full form",
    completSuite: " picks up the profile you entered here, if you would rather describe everything.",
  },
};

/* Chargement à la demande, une fois par fichier. */
const cache = new Map<string, Promise<unknown>>();
function charger<X>(fichier: string): Promise<X> {
  if (!cache.has(fichier)) {
    const p = fetch(`/data/primes-2027/${fichier}`).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    });
    p.catch(() => cache.delete(fichier));
    cache.set(fichier, p);
  }
  return cache.get(fichier) as Promise<X>;
}

type Lieu = { npa: string; canton: P.Canton; region: number; communes: string };
/* accident : null tant que le visiteur n'a pas choisi, la valeur suit alors l'âge (P.accidentParDefaut). */
type PersonneUI = { id: number; naissance: string; franchise: number | null; accident: boolean | null };
const MAX_PERSONNES = 6;

/* donneesDu : date du relevé des primes (ISO), lue au build dans les données (lib/date-primes.ts). */
/* Le bloc « Recevoir des offres » (formulaire de rappel : téléphone, consentements, Turnstile) n'existe qu'une fois
   les résultats calculés : il n'est pas dans le HTML initial. Son code se charge après l'affichage de la page
   (chargerApresAffichage dans le composant), bien avant qu'un profil complet soit saisi. */
const importerOffre = () => import("@/components/outils/offre-comparateur").then((m) => m.OffreComparateur);
const OffreComparateur = dynamic(importerOffre, { ssr: false });

export function ComparateurPrimes({ locale = "fr", donneesDu }: { locale?: Locale; donneesDu: string }) {
  const isEn = locale === "en";
  const t = TXT[locale];
  const nf = isEn ? nfEn : nfFr;
  const chf = (x: number, d = 0) => chfBase(x, isEn ? "en" : "fr", d, NB, NB);
  const signe = (x: number) => (Math.round(x) === 0 ? "0" : `${x > 0 ? "+" : "−"}${nf(Math.abs(x))}`);

  const [saisieLieu, setSaisieLieu] = useState("");
  const [personnes, setPersonnes] = useState<PersonneUI[]>([{ id: 1, naissance: "", franchise: null, accident: null }]);
  const [filtre, setFiltre] = useState<P.Filtre>("tous");
  const [parAn, setParAn] = useState(false);
  const [avecCaisse, setAvecCaisse] = useState(false);
  const [actA, setActA] = useState("");
  const [actP, setActP] = useState("");
  const [index, setIndex] = useState<P.IndexNpa | null>(null);
  const [choixLieu, setChoixLieu] = useState(0);
  const [donnees, setDonnees] = useState<Record<string, P.DonneesCanton>>({});
  const [etat, setEtat] = useState<"pret" | "erreur">("pret");
  const [nb, setNb] = useState(PAR_PAGE);
  const [copie, setCopie] = useState(false);
  /* Erreurs de saisie : affichées une fois le champ quitté (touche) ou le formulaire envoyé (soumis), jamais pendant la frappe. */
  const [touche, setTouche] = useState<Record<string, boolean>>({});
  const [soumis, setSoumis] = useState(false);
  const quitter = (cle: string) => () => setTouche((c) => (c[cle] ? c : { ...c, [cle]: true }));
  /* Défilement vers le résultat : demandé à l'envoi du formulaire ou par un lien de profil complet, exécuté dès que la liste est prête. */
  const [defiler, setDefiler] = useState(false);

  /* Profil partagé par lien : après le #, jamais envoyé au serveur. Lu une fois, puis retiré de l'adresse
     pour que la mesure d'audience ne le voie pas. Format : #npa=1201&p=1985.300.1,2015.0.1 */
  useEffect(() => chargerApresAffichage(() => void importerOffre(), { interaction: true }), []);
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    const n = h.get("npa");
    const ps = (h.get("p") ?? "").split(",").filter(Boolean).slice(0, MAX_PERSONNES);
    if (!n && !ps.length) return;
    if (n && /^\d{4}$/.test(n)) setSaisieLieu(n);
    const lues2 = ps
      .map((x, k) => {
        const [a, f, acc] = x.split(".");
        const p: PersonneUI = { id: k + 1, naissance: a, franchise: Number.isFinite(+f) ? +f : null, accident: acc === "1" ? true : acc === "0" ? false : null };
        return /^\d{4}$/.test(a ?? "") ? p : null;
      })
      .filter((x): x is PersonneUI => Boolean(x));
    if (lues2.length) setPersonnes(lues2);
    if (n && /^\d{4}$/.test(n) && lues2.length && lues2.every((x) => P.anneeValide(+x.naissance))) setDefiler(true);
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);
  const [tri, setTri] = useState<Tri>("prix");
  const formRef = useRef<HTMLFormElement>(null);
  const reglagesRef = useRef<HTMLDivElement>(null);
  const [barre, setBarre] = useState(false);
  /* Formulaire « Recevoir des offres » à l'écran : le bouton du même nom quitte la barre du bas. */
  const [offreVue, setOffreVue] = useState(false);
  const offreZoneRef = useRef<HTMLDivElement>(null);
  const listeRef = useRef<HTMLDivElement>(null);
  const apresRef = useRef<HTMLDivElement>(null);
  const rappelApres = useRef<HTMLParagraphElement>(null);
  const resultatRef = useRef<HTMLElement>(null);
  const titreRef = useRef<HTMLHeadingElement>(null);
  const offreRef = useRef<OffreComparateurHandle>(null);
  const [offreEnvoyee, setOffreEnvoyee] = useState(false);

  /* Lieu : NPA en tête de saisie ; si la saisie reprend une suggestion exacte, sa région est retenue. */
  const npa = saisieLieu.trim().match(/^(\d{4})\b/)?.[1] ?? "";
  const sugg = useMemo(() => (index ? P.suggestions(index, saisieLieu) : []), [index, saisieLieu]);
  const lieux: Lieu[] = useMemo(() => {
    if (!index) return [];
    if (npa) return P.regionsNpa(index, npa).map((l) => ({ ...l, npa }));
    const s = P.suggestions(index, saisieLieu, 2);
    return s.length === 1 ? [s[0]] : [];
  }, [index, npa, saisieLieu]);
  const exacte = lieux.findIndex((l) => P.libelleLieu(l.npa, l.communes, l.canton) === saisieLieu.trim());
  const lieu: Lieu | undefined = exacte >= 0 ? lieux[exacte] : lieux[Math.min(choixLieu, lieux.length - 1)];
  const ambigu = lieux.length > 1 && exacte < 0;
  const inconnu = Boolean(index) && saisieLieu.trim().length >= 4 && !sugg.length;
  const erreurLieu: string | null =
    lieu || inconnu || !(soumis || touche.lieu) ? null : !saisieLieu.trim() ? t.lieuVide : index ? t.lieuIntrouvable : null;

  /* Personnes : classe d'âge selon l'année, franchise parmi celles de la classe (enfant 0 à 600, dès 19 ans 300 à 2500). */
  const lues = personnes.map((p) => {
    const annee = parseInt(p.naissance, 10);
    const ok = p.naissance.length === 4 && P.anneeValide(annee);
    const cl: P.Classe | null = ok ? P.classe(annee) : null;
    const choix = P.FRANCHISES[cl ?? "adulte"];
    const fr = p.franchise !== null && choix.includes(p.franchise) ? p.franchise : choix[0];
    const accident = p.accident ?? (ok ? P.accidentParDefaut(annee) : false);
    const erreur = !ok && (soumis || touche[`n-${p.id}`]) ? t.anneeHors(ANNEE_MIN, ANNEE_MAX) : null;
    return { ...p, annee, ok, cl, choix, fr, accident, erreur };
  });
  const tousValides = lues.every((p) => p.ok);
  const pers: P.Personne[] = tousValides ? lues.map((p) => ({ classe: p.cl!, franchise: p.fr, accident: p.accident })) : [];
  const maj = (id: number, ch: Partial<PersonneUI>) => setPersonnes((cur) => cur.map((p) => (p.id === id ? { ...p, ...ch } : p)));

  useEffect(() => {
    if (!saisieLieu || index) return;
    charger<P.IndexNpa>("npa.json").then(setIndex, () => setEtat("erreur"));
  }, [saisieLieu, index]);
  useEffect(() => setChoixLieu(0), [npa]);
  useEffect(() => {
    if (!lieu || donnees[lieu.canton]) return;
    charger<P.DonneesCanton>(`${lieu.canton}.json`).then(
      (d) => setDonnees((cur) => ({ ...cur, [d.canton]: d })),
      () => setEtat("erreur"),
    );
  }, [lieu, donnees]);

  const d = lieu ? donnees[lieu.canton] : undefined;
  /* Seules les catégories proposées dans le canton sont listées (aucune offre PHARM en Suisse romande en 2027). */
  const typesPresents = d ? P.TYPES.filter((ty) => d.produits.some((x) => x[2] === ty)) : [];
  const pret = Boolean(d && lieu && pers.length);
  const r = pret ? P.offresFoyer(d!, lieu!.region, pers, filtre) : null;
  const seul = pers.length === 1 ? pers[0] : null;
  const listePrete = Boolean(r);
  useEffect(() => {
    if (!defiler) return;
    /* Lien de profil dont le lieu est hors des régions couvertes : rien à montrer, on abandonne. */
    if (etat === "erreur" || inconnu) { setDefiler(false); return; }
    if (!listePrete) return;
    setDefiler(false);
    const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    titreRef.current?.focus({ preventScroll: true });
    resultatRef.current?.scrollIntoView({ behavior: reduit ? "auto" : "smooth", block: "start" });
  }, [defiler, listePrete, etat, inconnu]);
  const lignesFr = pret && seul ? P.parFranchise(d!, { region: lieu!.region, classe: seul.classe, accident: seul.accident, filtre }) : [];

  /* Caisse actuelle : prime du foyer chez elle, même profil, tous modèles confondus. */
  const tousModeles = pret ? P.offresFoyer(d!, lieu!.region, pers).offres : [];
  const assureursListe = [...new Set(tousModeles.map((o) => o.assureur))].sort((a, b) => a.localeCompare(b));
  const produitsActA = tousModeles.filter((o) => o.assureur === actA).map((o) => o.produit).sort((a, b) => a.localeCompare(b));
  const actuelle = avecCaisse ? tousModeles.find((o) => o.assureur === actA && o.produit === actP) : undefined;

  /* Mesure : un seul événement, au premier résultat affiché. Aucune valeur saisie n'est envoyée. */
  const suivi = useRef(false);
  useEffect(() => {
    if (r && r.total && !suivi.current) {
      suivi.current = true;
      suivre("comparateur_utilise");
    }
  }, [r]);
  const cleProfil = JSON.stringify([lieu?.canton, lieu?.region, pers, filtre]);
  useEffect(() => setNb(PAR_PAGE), [cleProfil]);
  /* GA4 view_item_list : nombre d'offres affichées seulement, une fois par profil. */
  const listeVue = useRef("");
  useEffect(() => {
    if (!r || !r.total || listeVue.current === cleProfil) return;
    const t = setTimeout(() => {
      listeVue.current = cleProfil;
      versGA("view_item_list", { item_list_name: "comparateur_primes", item_count: r.total });
    }, 1500);
    return () => clearTimeout(t);
  }, [r, cleProfil]);

  /* Bouton de rappel en bas d'écran (mobile) : visible tant que la liste occupe l'écran, masqué sur le bloc final. */
  const aListe = Boolean(r && r.total);
  useEffect(() => {
    if (!aListe || !listeRef.current || typeof IntersectionObserver === "undefined") return;
    const vus = new Map<Element, boolean>();
    const obs = new IntersectionObserver((entrees) => {
      for (const e of entrees) vus.set(e.target, e.isIntersecting);
      setBarre(Boolean(listeRef.current && vus.get(listeRef.current)) && !(apresRef.current && vus.get(apresRef.current)));
    }, { rootMargin: "-40% 0px 0px 0px" });
    obs.observe(listeRef.current);
    if (apresRef.current) obs.observe(apresRef.current);
    return () => obs.disconnect();
  }, [aListe]);
  useEffect(() => {
    if (!aListe || !offreZoneRef.current || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setOffreVue(e.isIntersecting));
    obs.observe(offreZoneRef.current);
    return () => obs.disconnect();
  }, [aListe]);

  /* Tableau en deux parties (ordinateur) : si les colonnes débordent, les deux parties défilent ensemble à l'horizontale. */
  const deuxParties = aListe && Math.min(nb, r?.total ?? 0) > OFFRES_AVANT_BLOC;
  useEffect(() => {
    const boites = [...(listeRef.current?.querySelectorAll<HTMLElement>("[data-slot=table-container]") ?? [])];
    if (boites.length < 2) return;
    const suivreDefil = (ev: Event) => {
      const x = (ev.currentTarget as HTMLElement).scrollLeft;
      for (const b of boites) if (b !== ev.currentTarget && b.scrollLeft !== x) b.scrollLeft = x;
    };
    for (const b of boites) b.addEventListener("scroll", suivreDefil, { passive: true });
    return () => { for (const b of boites) b.removeEventListener("scroll", suivreDefil); };
  }, [deuxParties]);

  /* rappel_vu : appel de fin de parcours (un seul événement « comparateur » par page). */
  useRappelVu(rappelApres, "comparateur", Boolean(aListe));

  function profilVersFormulaires() {
    const p1 = lues[0];
    ecrirePreremplissage({
      porte: "sante",
      besoin: ["lamal"],
      ...(lieu ? { npa: lieu.npa } : {}),
      ...(p1?.ok ? { birthYear: p1.annee } : {}),
      householdSize: Math.min(4, personnes.length),
    });
  }
  function versRappel() {
    const p1 = lues[0];
    ecrirePreremplissage({ besoin: ["sante"], ...(lieu ? { npa: lieu.npa } : {}), ...(p1?.ok ? { birthYear: p1.annee } : {}), householdSize: Math.min(4, personnes.length) });
    suivre("rappel_ouvert", { emplacement: "comparateur" }, true);
  }

  function copierLien() {
    const p = lues.map((x) => `${x.naissance}.${x.fr}.${x.accident ? 1 : 0}`).join(",");
    const url = `${window.location.origin}${window.location.pathname}#npa=${lieu?.npa ?? ""}&p=${p}`;
    navigator.clipboard?.writeText(url).then(() => setCopie(true), () => setCopie(false));
  }
  const prix = (mensuel: number) => (parAn ? mensuel * 12 : mensuel);
  const triees = r
    ? tri === "prix" ? r.offres
      : tri === "prixDesc" ? [...r.offres].reverse()
      : [...r.offres].sort((a, b) => a.assureur.localeCompare(b.assureur) || a.produit.localeCompare(b.produit))
    : [];
  const visibles = triees.slice(0, nb);
  /* Rang par la prime, ex æquo compris (même règle que la phrase sur l'offre actuelle), quel que soit le tri choisi. */
  const rangs = r ? P.rangsPrix(r.offres.map((o) => o.annuel)) : [];
  const rangPrix = new Map(r ? r.offres.map((o, i) => [o, rangs[i] - 1]) : []);
  /* Badge « Prime la plus basse » : seulement sous le tri par prime croissante, pour toute offre à la prime minimale (égalités comprises). */
  const minAnnuel = r && r.offres.length ? r.offres[0].annuel : null;
  const plusBasse = (o: P.OffreFoyer) => tri === "prix" && minAnnuel !== null && o.annuel === minAnnuel;
  const redis = r ? r.redistribution : 0;
  const lienRappel = (cls?: string, texte?: string) => (
    <a className={cls} href={RAPPEL[locale]} onClick={versRappel}>
      <IconeTelephone size={16} />
      {texte ?? t.rappel}
    </a>
  );
  const carte = (o: P.OffreFoyer, i: number) => {
    const ip = rangPrix.get(o) ?? i;
    const vsAct = actuelle ? o.annuel - actuelle.annuel : null;
    const estAct = actuelle && o.assureur === actuelle.assureur && o.produit === actuelle.produit;
    return (
      <li key={`${o.assureur}|${o.produit}`}>
        <Card size="sm">
        <CardContent className="carte-prime">
          <span className="rang">{ip + 1}</span>
          <div className="offre-qui">
            <b>{o.assureur}</b>
            <span className="produit">{o.produit}</span>
            <span className="badges-offre">
              {plusBasse(o) ? <Badge variant="outline" className="badge-rang h-auto text-base">{t.plusBasse}</Badge> : null}
              {estAct ? <Badge variant="secondary" className="h-auto text-base">{t.votreCaisse}</Badge> : null}
              <Badge variant="outline" className="h-auto text-base">{t.typesCourts[o.type]}</Badge>
            </span>
          </div>
          <div className="combien">
            <span className="montant">{nf(prix(o.mensuel), parAn ? 0 : 2)}</span>
            <span className="unite">CHF {parAn ? t.an : t.mois}</span>
          </div>
          {/* Un seul écart visible : face à la caisse actuelle si elle est indiquée, sinon face à la 1re offre (la 1re : face à la moyenne). */}
          <p className={vsAct !== null ? "ecart-carte face-caisse" : "ecart-carte"}>
            {vsAct !== null
              ? <><b>{signe(vsAct)}</b> {t.parAn} {t.faceCaisse}</>
              : ip > 0
                ? <><b>{signe(o.ecartMin)}</b> {t.parAn} {t.facePremiere}</>
                : <><b>{signe(o.ecartMoyenne)}</b> {t.parAn} {t.faceMoyenne}</>}
          </p>
          <Depliable className="detail-offre" titre={t.details}>
            <ul>
              <li>{chf(o.mensuel, 2)} {t.mois}, {chf(o.annuel)} {t.an}</li>
              <li>{chf(o.mensuel - redis, 2)} {t.mois} {t.apresRedis}</li>
              <li>{t.types[o.type]}</li>
              {vsAct !== null && ip > 0 ? <li><b>{signe(o.ecartMin)}</b> {t.parAn} {t.facePremiere}</li> : null}
              {vsAct !== null || ip > 0 ? <li><b>{signe(o.ecartMoyenne)}</b> {t.parAn} {t.faceMoyenne}</li> : null}
              {o.details.map((x, k) => (
                <li key={k}>
                  {seul ? "" : `${t.personne(k + 1)}${isEn ? ": " : `${T}: `}`}
                  {t.classeCourt[pers[k].classe]}, {t.franchiseDe(pers[k].franchise)}, {pers[k].accident ? t.accOui : t.accNon}
                  {seul ? "" : <>, <b>{chf(prix(x), parAn ? 0 : 2)}</b></>}
                </li>
              ))}
            </ul>
          </Depliable>
        </CardContent>
        </Card>
      </li>
    );
  };
  /* Tableau (ordinateur) : deux parties autour du bloc « Recevoir des offres », colonnes identiques (colgroup + table-layout fixe en CSS).
     La seconde répète l'en-tête et porte une légende masquée, pour rester compréhensible seule. */
  const tableau = (lignes: P.OffreFoyer[], legende: string, suite = false) => (
    <Table variant="chiffres" className={`primes-liste${suite ? " primes-suite" : ""}`}>
      <TableCaption className={suite ? "visually-hidden" : undefined}>{legende}</TableCaption>
      <colgroup>
        <col className="c-offre" />
        <col className="c-prime" />
        <col className="c-total" />
        <col className="c-ecart" />
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{t.thOffre}</TableHead>
          <TableHead scope="col">{t.thPrime}<small>{t.avantRedis}</small></TableHead>
          <TableHead scope="col">{t.thTotal}<small>{`${t.apresRedis} (−${nf(prix(redis), 2)})`}</small></TableHead>
          {actuelle
            ? <TableHead scope="col" className="col-caisse">{t.thCaisse}<small>{t.ecartAnCourt}</small></TableHead>
            : <TableHead scope="col">{t.thEcart}<small>{t.vsPremiere}</small></TableHead>}
          <TableHead scope="col">{t.thEcart}<small>{t.vsMoyenne}</small></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lignes.map((o) => {
          const i = rangPrix.get(o) ?? 0;
          const estAct = actuelle && o.assureur === actuelle.assureur && o.produit === actuelle.produit;
          return (
            <TableRow key={`${o.assureur}|${o.produit}`} data-state={estAct ? "selected" : undefined}>
              <TableCell className="pl-9 align-top">
                <span className="rang">{i + 1}</span>
                <b>{o.assureur}</b>
                <span className="produit">{o.produit}</span>
                {estAct || plusBasse(o) ? (
                  <span className="badges-offre">
                    {plusBasse(o) ? <Badge variant="outline" className="badge-rang h-auto whitespace-normal rounded-lg text-left text-base">{t.plusBasse}</Badge> : null}
                    {estAct ? <Badge variant="secondary" className="h-auto text-base">{t.votreCaisse}</Badge> : null}
                  </span>
                ) : null}
                <span className="type">{t.typesCourts[o.type]}</span>
                {!seul ? <span className="type">{o.details.map((x) => nf(prix(x), parAn ? 0 : 2)).join(" + ")}</span> : null}
              </TableCell>
              <TableCell className="mois align-top">{nf(prix(o.mensuel), parAn ? 0 : 2)}</TableCell>
              <TableCell className="align-top">{nf(prix(o.mensuel - redis), parAn ? 0 : 2)}</TableCell>
              {actuelle
                ? <TableCell className="col-caisse align-top">{signe(o.annuel - actuelle.annuel)}</TableCell>
                : <TableCell className="align-top">{i === 0 ? "0" : signe(o.ecartMin)}</TableCell>}
              <TableCell className="align-top">{signe(o.ecartMoyenne)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
  const Coche = ({ ok }: { ok: boolean }) =>
    ok ? (
      <svg className="coche-ok" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.4" /></svg>
    ) : null;

  return (
    <div className="ph-sensitive outil outil-comparateur" data-ph-mask>
      <form
        ref={formRef}
        className="form"
        noValidate
        onSubmit={(ev) => {
          ev.preventDefault();
          setSoumis(true);
          if (lieu && tousValides) setDefiler(true);
          else document.getElementById(!lieu ? "cp-lieu" : `cp-n-${lues.find((p) => !p.ok)?.id}`)?.focus();
        }}
      >
        <Card><CardContent>
        <div className="champ">
          <label htmlFor="cp-lieu">{t.lieu}</label>
          <div className="avec-coche">
            <Input
              className="pr-10"
              id="cp-lieu"
              list="cp-lieux"
              autoComplete="off"
              enterKeyHint="next"
              placeholder={t.lieuPh}
              value={saisieLieu}
              onChange={(e) => { setSaisieLieu(e.target.value); setDefiler(false); }}
              onBlur={quitter("lieu")}
              aria-invalid={erreurLieu || inconnu ? true : undefined}
              aria-describedby="cp-lieu-aide"
            />
            <Coche ok={Boolean(lieu) && !ambigu} />
          </div>
          <datalist id="cp-lieux">
            {sugg.map((s) => (
              <option key={`${s.npa}${s.canton}${s.region}`} value={s.libelle}>{t.region(s.canton, s.region)}</option>
            ))}
          </datalist>
        </div>
        {ambigu ? (
          <div id="cp-lieu-aide" className="choix-lieu">
            <p className="sous-q">{t.plusieurs}</p>
            <ChoixBoutons
              name="cp-lieu-choix"
              variante="option"
              className="choix-liste"
              value={choixLieu}
              onChange={setChoixLieu}
              options={lieux.map((l, i) => ({ value: i, key: `${l.canton}${l.region}`, label: l.communes, detail: t.region(l.canton, l.region) }))}
            />
          </div>
        ) : lieu ? (
          <p className="lieu-trouve" id="cp-lieu-aide" role="status">{lieu.npa} {lieu.communes}{lieu.communes === t.region(lieu.canton, lieu.region) ? "" : ` · ${t.region(lieu.canton, lieu.region)}`}</p>
        ) : inconnu ? (
          <Alert variant="attention" className="provisoire" id="cp-lieu-aide" role="status">{t.inconnu}</Alert>
        ) : erreurLieu ? (
          <Alert variant="attention" className="provisoire" id="cp-lieu-aide" role="status">{erreurLieu}</Alert>
        ) : (
          <p className="note-outil" id="cp-lieu-aide">{t.lieuAide}</p>
        )}

        {lues.map((p, k) => (
          <fieldset className="personne" key={p.id}>
            <legend>
              {t.personne(k + 1)}
              {personnes.length > 1 ? (
                <Button type="button" variant="texte" size="texte" onClick={() => setPersonnes((cur) => cur.filter((x) => x.id !== p.id))}>
                  {t.retirer}
                </Button>
              ) : null}
            </legend>
            <div className="ligne">
              <div className="champ">
                <label htmlFor={`cp-n-${p.id}`}>{t.naissance}</label>
                <div className="avec-coche">
                  <Input
                    className="pr-10"
                    id={`cp-n-${p.id}`}
                    inputMode="numeric"
                    maxLength={4}
                    placeholder={isEn ? "e.g. 1994" : "ex. 1994"}
                    value={p.naissance}
                    onChange={(e) => { maj(p.id, { naissance: e.target.value.replace(/\D/g, "").slice(0, 4) }); setDefiler(false); }}
                    onBlur={quitter(`n-${p.id}`)}
                    aria-invalid={p.erreur ? true : undefined}
                    aria-describedby={`cp-cl-${p.id}`}
                  />
                  <Coche ok={p.ok} />
                </div>
              </div>
              <div className="champ">
                <label htmlFor={`cp-f-${p.id}`}>{t.franchiseCourt}</label>
                <Choix id={`cp-f-${p.id}`} value={p.fr} disabled={!p.ok} onChange={(v) => maj(p.id, { franchise: v })} options={p.choix.map((f) => ({ value: f, label: nf(f) }))} />
                {k === 0 ? <small className="aide-champ">{t.franchiseAide}</small> : null}
              </div>
            </div>
            {p.erreur ? (
              <Alert variant="attention" className="provisoire" id={`cp-cl-${p.id}`} role="status">{p.erreur}</Alert>
            ) : (
              <p className="note-outil classe" id={`cp-cl-${p.id}`} role="status">{p.cl ? t.classe[p.cl] : NB}</p>
            )}
            <Case checked={p.accident} onChange={(c) => maj(p.id, { accident: c })}>
              {t.accidentCase}<small>{t.accidentInfo}</small>
            </Case>
          </fieldset>
        ))}
        {personnes.length < MAX_PERSONNES ? (
          <Button
            type="button"
            variant="pointille"
            size="bloc"
            className="ajouter-personne"
            onClick={() => setPersonnes((cur) => [...cur, { id: Math.max(...cur.map((x) => x.id)) + 1, naissance: "", franchise: null, accident: null }])}
          >
            + {t.ajouter}
          </Button>
        ) : null}
        <Button type="submit" className="w-full">{r && r.total ? t.voirN(r.total) : t.voir}</Button>
        {r && r.total ? <small className="aide-champ">{t.enDirect}</small> : null}
        </CardContent></Card>
      </form>

      <section className="apercu" ref={resultatRef}>
        <h2 ref={titreRef} tabIndex={-1} className={lieu && tousValides && r ? "titre-resultat" : "visually-hidden"}>{lieu && tousValides && r ? t.titre(`${lieu.npa} ${lieu.communes}`) : t.resultat}</h2>
        {/* Seule ligne annoncée aux lecteurs d'écran : attente, erreur, chargement, puis le résumé de la liste (même nœud, toujours présent). */}
        <div aria-live="polite">
          {!lieu || !tousValides ? (
            <p className="attente">{t.attente}</p>
          ) : etat === "erreur" ? (
            <Alert variant="attention" className="provisoire">{t.erreur}</Alert>
          ) : !d || !r ? (
            <p className="attente">{t.chargement}</p>
          ) : (
            <p className="resume-liste">
              {seul ? t.resume(r.total, lieu.communes, t.classeCourt[seul.classe], seul.franchise, seul.accident) : t.resumeFoyer(r.total, lieu.communes, pers.length)}{" "}
              <b>{t.triCourt[tri]}</b>
            </p>
          )}
        </div>
        {lieu && tousValides && etat !== "erreur" && d && r ? (
          <>
            {r.total ? <p className="fourchette">{t.fourchette(chf(prix(r.min), parAn ? 0 : 2), chf(prix(r.max), parAn ? 0 : 2), chf(prix(r.moyenne), parAn ? 0 : 2), parAn ? t.an : t.mois, chf(redis / Math.max(1, pers.length), 2))}</p> : null}
            {r.total ? <p className="note-outil memes">{t.memes}</p> : null}
            {!seul ? <p className="note-outil">{t.foyerNote}</p> : null}
            <div className="reglages" ref={reglagesRef}>
              <div className="champ">
                <label htmlFor="cp-tri">{t.trier}</label>
                <Choix id="cp-tri" value={tri} onChange={setTri} options={(["prix", "prixDesc", "assureur"] as Tri[]).map((x) => ({ value: x, label: t.tris[x] }))} />
              </div>
              <div className="champ">
                <label htmlFor="cp-modele">{t.modele}</label>
                <Choix id="cp-modele" value={filtre} onChange={setFiltre} options={(["tous", ...typesPresents] as P.Filtre[]).map((f) => ({ value: f, label: t.filtres[f] }))} />
              </div>
              <ToggleGroup
                className="periode"
                variant="outline"
                size="champ"
                spacing={0}
                aria-label={t.affichage}
                value={[parAn ? "an" : "mois"]}
                onValueChange={(v) => { if (v[0]) setParAn(v[0] === "an"); }}
              >
                <ToggleGroupItem value="mois">{t.periodeCourt.mois}</ToggleGroupItem>
                <ToggleGroupItem value="an">{t.periodeCourt.an}</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <Case className="case caisse-case" checked={avecCaisse} onChange={setAvecCaisse}>
              {t.ecartCaisse}<small>{t.caisseAide}</small>
            </Case>
            {avecCaisse ? (
              <div className="ligne caisse-actuelle">
                <div className="champ">
                  <label htmlFor="cp-act-a">{t.assureur}</label>
                  <Choix id="cp-act-a" value={actA} onChange={(v) => { setActA(v); setActP(""); }} options={[{ value: "", label: t.choisir }, ...assureursListe.map((a) => ({ value: a, label: a }))]} />
                </div>
                <div className="champ">
                  <label htmlFor="cp-act-p">{t.produit}</label>
                  <Choix id="cp-act-p" value={actP} onChange={setActP} disabled={!actA} options={[{ value: "", label: t.choisir }, ...produitsActA.map((x) => ({ value: x, label: x }))]} />
                </div>
              </div>
            ) : null}
            {actuelle && r && r.total ? (() => {
              const dansListe = r.offres.some((o) => o.assureur === actuelle.assureur && o.produit === actuelle.produit);
              /* Rang par la prime, quel que soit le tri choisi : 1 + nombre d'offres à prime strictement plus basse. */
              const rang = 1 + r.offres.filter((o) => o.annuel < actuelle.annuel).length;
              const gain = actuelle.annuel - r.offres[0].annuel;
              return (
                <Alert variant="info" className="synthese-caisse">
                  <AlertTitle>{t.caisseTitre(actuelle.assureur, actuelle.produit)}</AlertTitle>
                  <AlertDescription>
                    {dansListe ? t.caisseRang(chf(actuelle.mensuel, 2), chf(actuelle.annuel), rang, r.offres.length) : t.caisseHors(chf(actuelle.mensuel, 2), chf(actuelle.annuel))}
                    {Math.round(gain) > 0 ? t.caisseGain(chf(gain)) : null}
                  </AlertDescription>
                </Alert>
              );
            })() : null}

            {!r.total ? (
              <Alert variant="attention" className="provisoire">{t.aucune}</Alert>
            ) : (
              <div ref={listeRef}>
                {/* Le bloc « Recevoir des offres » est rendu une seule fois, après les trois premières offres.
                    Mobile : cartes (les tableaux sont masqués). Ordinateur : tableau coupé en deux autour du bloc
                    (les cartes sont masquées), mêmes colonnes et largeurs fixes pour que les deux parties s'alignent. */}
                <ol className="cartes-primes">{visibles.slice(0, OFFRES_AVANT_BLOC).map(carte)}</ol>
                {tableau(visibles.slice(0, OFFRES_AVANT_BLOC), t.caption(Boolean(actuelle)))}
                <div ref={offreZoneRef}>
                <OffreComparateur
                  ref={offreRef}
                  locale={locale}
                  profil={{ npa: lieu.npa, personnes: lues.map((p) => ({ annee: p.annee, franchise: p.fr, accident: p.accident })) }}
                  ecartAn={r.total > 1 ? chf(r.offres[r.offres.length - 1].annuel - r.offres[0].annuel) : null}
                  onEnvoyee={() => setOffreEnvoyee(true)}
                />
                </div>
                {visibles.length > OFFRES_AVANT_BLOC ? (
                  <>
                    <ol className="cartes-primes" start={OFFRES_AVANT_BLOC + 1}>{visibles.slice(OFFRES_AVANT_BLOC).map((o, i) => carte(o, i + OFFRES_AVANT_BLOC))}</ol>
                    {tableau(visibles.slice(OFFRES_AVANT_BLOC), t.captionSuite(OFFRES_AVANT_BLOC + 1, visibles.length), true)}
                  </>
                ) : null}


                {r.total > nb ? (
                  <Button type="button" variant="texte" size="texte" className="plus min-h-11 text-base" onClick={() => setNb((v) => v + PAR_PAGE)}>
                    {t.plus(Math.min(r.total, nb + PAR_PAGE), r.total)}
                  </Button>
                ) : null}
                <p className="rappel-liste rappel-bureau">{t.rappelQ} {lienRappel()}{t.rappelSuite}</p>
              </div>
            )}

            <div className="integrite">
              <p>{t.source(dateCh(donneesDu))}</p>
              <p>{t.redistribution(chf(r.redistribution / Math.max(1, pers.length), 2))}</p>
              <p>{t.reseau}</p>
              <p><b>{t.integrite(dateCh(donneesDu))}</b></p>
              <p>
                <Button type="button" variant="texte" size="texte" className="font-semibold" onClick={copierLien}>{t.lienProfil}</Button>
                {copie ? <span className="copie-ok"> {t.lienCopie}</span> : null}
              </p>
            </div>

            {r.total && seul ? (
              <Depliable className="franchises" titre={t.franchisesTitre}>
                <p>{t.franchisesTexte(chf(P.QUOTE_PART_MAX[seul.classe]))}</p>
                <Table variant="chiffres">
                  <TableCaption className="visually-hidden">{t.franchisesTitre}</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">{t.thFranchise}</TableHead>
                      <TableHead scope="col">{t.thPremiere}</TableHead>
                      <TableHead scope="col">{t.thMax}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lignesFr.filter((l) => l.nombre).map((l) => (
                      <TableRow
                        key={l.franchise}
                        aria-current={l.franchise === seul.franchise ? "true" : undefined}
                        data-state={l.franchise === seul.franchise ? "selected" : undefined}
                      >
                        <TableCell>{chf(l.franchise)}</TableCell>
                        <TableCell>{nf(l.premiere)}</TableCell>
                        <TableCell>{nf(l.maxACharge)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Depliable>
            ) : null}

            <div className="apres apres-comparateur" ref={apresRef}>
              <p className="delai-fait">{t.delai} <a href={outils(locale).lettre}>{t.lettre}</a></p>
              {/* Formulaire court d'abord (un écran, prérempli), le formulaire en trois écrans ensuite. */}
              <p ref={rappelApres}>
                <a href={RAPPEL[locale]} onClick={versRappel}>{t.accompagne}</a>
                {t.accompagneSuite}
              </p>
              <p>
                <a href={lienDemande(locale, "sante")} onClick={profilVersFormulaires}>{t.complet}</a>
                {t.completSuite}
              </p>
            </div>

            {aListe && barre ? (
              <div className={offreEnvoyee || offreVue ? "barre-collante" : "barre-collante avec-offre"}>
                <Button type="button" variant="commande" size="commande" className="border-filet font-narrow" onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}>{offreEnvoyee ? t.modifier : t.profilCourt}</Button>
                <Button type="button" variant="commande" size="commande" className="border-filet font-narrow" onClick={() => reglagesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>{offreEnvoyee ? t.trierFiltrer : t.trierCourt}</Button>
                {offreEnvoyee || offreVue ? null : (
                  <Button type="button" size="commande" className="border-sentier font-narrow font-bold" onClick={() => offreRef.current?.ouvrir()}>{t.offresCourt}</Button>
                )}
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
