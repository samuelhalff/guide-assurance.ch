"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as P from "@/lib/engines/primes";
import type { Locale } from "@/lib/i18n";
import { suivre, versGA } from "@/lib/analytics";
import { outils } from "@/lib/nav";
import { RAPPEL, ecrirePreremplissage, lienDemande } from "@/lib/demande";
import { IconeTelephone, useRappelVu } from "@/components/demande/lien-rappel";
import { dateCh } from "@/lib/taux3a";

/* Comparateur de primes LAMal 2027. Les données du canton sont chargées à la demande (public/data/primes-2027) ;
   le calcul se fait dans le navigateur, rien de ce qui est saisi n'est envoyé ni mis dans l'adresse.
   Cadre (docs/decisions.md §0 bis) : des faits triés selon les critères du visiteur, aucune recommandation.
   Parcours repris de priminfo (research/05-benchmark-comparateurs.md) : lieu, année, franchise, accident ; le modèle,
   l'affichage mois/an et la caisse actuelle viennent après, sur la liste. */

const T = " "; // espace fine insécable avant ; : ? ! »
const NB = " ";
const nfFr = (x: number, d = 0) =>
  new Intl.NumberFormat("fr-CH", { minimumFractionDigits: d, maximumFractionDigits: d }).format(x).replace(/\s/g, T);
const nfEn = (x: number, d = 0) => new Intl.NumberFormat("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d }).format(x);

const PAR_PAGE = 20;
type Tri = "prix" | "prixDesc" | "assureur";
const RAPPEL_APRES = 5;

const CANTON_FR: Record<P.Canton, string> = { GE: "Genève", VD: "Vaud", VS: "Valais", FR: "Fribourg", NE: "Neuchâtel", JU: "Jura", BE: "Jura bernois" };
const CANTON_EN: Record<P.Canton, string> = { GE: "Geneva", VD: "Vaud", VS: "Valais", FR: "Fribourg", NE: "Neuchâtel", JU: "Jura", BE: "Bernese Jura" };
/* Cantons à plusieurs régions de prime couvertes (OFSP, régions 2027). */
const MULTI: P.Canton[] = ["VD", "VS", "FR"];

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
    verifier: "Vérifiez l’année.",
    personne: (n: number) => `Personne ${n}`,
    ajouter: "Ajouter une personne",
    retirer: "Retirer",
    accidentCase: "Assurance accidents",
    accidentInfo: `Inutile si vous travaillez au moins 8${NB}heures par semaine chez le même employeur, car son assurance accidents (LAA) vous couvre déjà.`,
    voir: "Voir les primes",
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
    plusBasse: `Montant le plus bas pour ce profil, après redistribution${T}:`,
    lienProfil: "Copier le lien de ce profil",
    lienCopie: "Lien copié. Votre lieu, vos années de naissance et vos franchises figurent après le signe #, une partie de l’adresse que le navigateur ne transmet pas à notre serveur.",
    trier: "Trier",
    tris: { prix: "Prime croissante", prixDesc: "Prime décroissante", assureur: "Assureur, A à Z" } as Record<Tri, string>,
    triCourt: { prix: "Triées de la prime la plus basse à la plus haute.", prixDesc: "Triées de la prime la plus haute à la plus basse.", assureur: "Triées par assureur, de A à Z." } as Record<Tri, string>,
    details: "Détails",
    plus: (n: number, total: number) => `Afficher plus (${n} sur ${total})`,
    modifier: "Modifier le profil",
    trierFiltrer: "Trier / filtrer",
    rappelOffre: `Une question sur cette offre${T}? Être rappelé`,
    franchiseDe: (f: number) => `franchise ${nfFr(f)}${NB}CHF`,
    accOui: "avec accident",
    accNon: "sans accident",
    affichage: "Afficher",
    mois: "par mois",
    an: "par an",
    caisseAide: "L’écart entre chaque offre et la prime 2027 de votre caisse actuelle s’affiche dans la liste. Ce choix n’est envoyé nulle part.",
    assureur: "Assureur",
    produit: "Modèle",
    choisir: "Choisir",
    attente: "La liste des primes 2027 s’affiche ici dès que votre lieu et votre année de naissance sont indiqués.",
    chargement: "Chargement des primes…",
    erreur: "Les primes n’ont pas pu être chargées. Vérifiez votre connexion et réessayez.",
    aucune: "Aucun assureur ne propose ce modèle pour ce profil. Les autres modèles restent disponibles dans le filtre.",
    resultat: "Résultat",
    resume: (n: number, lieu: string, cl: string, fr: number, acc: boolean) =>
      `${n} offre${n > 1 ? "s" : ""} pour ${cl} à ${lieu}, franchise ${nfFr(fr)}${NB}CHF, ${acc ? "avec" : "sans"} accident.`,
    tri: "Triées de la prime la plus basse à la plus haute.",
    fourchette: (a: string, b: string, m: string, u: string) => `Après redistribution des taxes environnementales, vous payez de ${a} à ${b} ${u}, pour une moyenne de ${m}.`,
    memes: "La loi (LAMal) fixe les prestations de l’assurance de base, qui sont donc identiques d’un assureur à l’autre. Les offres diffèrent par la prime, les règles du modèle et le service.",
    caption: "Primes 2027 de chaque offre, triées de la plus basse à la plus haute, avec l’écart annuel par rapport à la première offre et à la moyenne de la liste.",
    thOffre: "Assureur et modèle",
    thPrime: "Prime",
    thRedis: "Redistribution",
    thTotal: "Total",
    thEcart: "Écart par an",
    vsPremiere: "par rapport à la 1re offre",
    vsMoyenne: "par rapport à la moyenne",
    vsActuelle: "par rapport à votre caisse",
    actuelle: "Votre caisse actuelle",
    premiere: "1re offre de la liste",
    apresRedis: "après redistribution",
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
    verifier: "Check the year.",
    personne: (n: number) => `Person ${n}`,
    ajouter: "Add a person",
    retirer: "Remove",
    accidentCase: "Accident insurance",
    accidentInfo: "Not needed if you work at least 8 hours a week for the same employer, because their accident insurance (LAA) already covers you.",
    voir: "See the premiums",
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
    plusBasse: "Lowest amount for this profile, after redistribution:",
    lienProfil: "Copy the link to this profile",
    lienCopie: "Link copied. Your place, years of birth and deductibles sit after the # sign, a part of the address that the browser does not send to our server.",
    trier: "Sort",
    tris: { prix: "Lowest first", prixDesc: "Highest first", assureur: "Insurer A to Z" } as Record<Tri, string>,
    triCourt: { prix: "Sorted from the lowest to the highest premium.", prixDesc: "Sorted from the highest to the lowest premium.", assureur: "Sorted by insurer, A to Z." } as Record<Tri, string>,
    details: "Details",
    plus: (n: number, total: number) => `Show more (${n} of ${total})`,
    modifier: "Edit profile",
    trierFiltrer: "Sort / filter",
    rappelOffre: "A question about this offer? Call me back",
    franchiseDe: (f: number) => `deductible CHF${NB}${nfEn(f)}`,
    accOui: "with accident cover",
    accNon: "without accident cover",
    affichage: "Show",
    mois: "per month",
    an: "per year",
    caisseAide: "The list then shows the difference between each offer and your current insurer’s 2027 premium. This choice is not sent anywhere.",
    assureur: "Insurer",
    produit: "Model",
    choisir: "Choose",
    attente: "The list of 2027 premiums appears here once your place and year of birth are entered.",
    chargement: "Loading premiums…",
    erreur: "The premiums could not be loaded. Check your connection and try again.",
    aucune: "No insurer offers this model for this profile. The other models are still available in the filter.",
    resultat: "Result",
    resume: (n: number, lieu: string, cl: string, fr: number, acc: boolean) =>
      `${n} offer${n > 1 ? "s" : ""} for ${cl} in ${lieu}, deductible CHF${NB}${nfEn(fr)}, ${acc ? "with" : "without"} accident cover.`,
    tri: "Sorted from the lowest to the highest premium.",
    fourchette: (a: string, b: string, m: string, u: string) => `After the environmental levy redistribution, you pay from ${a} to ${b} ${u}, with an average of ${m}.`,
    memes: "The law (LAMal) sets the benefits of basic insurance, so they are identical from one insurer to the next. Offers differ in the premium, the rules of the model and the service.",
    caption: "2027 premiums of each offer, sorted from the lowest to the highest, with the yearly difference from the first offer and from the average of the list.",
    thOffre: "Insurer and model",
    thPrime: "Premium",
    thRedis: "Redistribution",
    thTotal: "Total",
    thEcart: "Difference per year",
    vsPremiere: "compared with the 1st offer",
    vsMoyenne: "compared with the average",
    vsActuelle: "compared with your insurer",
    actuelle: "Your current insurer",
    premiere: "1st offer in the list",
    apresRedis: "after redistribution",
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
type PersonneUI = { id: number; naissance: string; franchise: number | null; accident: boolean };
const MAX_PERSONNES = 6;

/* donneesDu : date du relevé des primes (ISO), lue au build dans les données (lib/date-primes.ts). */
export function ComparateurPrimes({ locale = "fr", donneesDu }: { locale?: Locale; donneesDu: string }) {
  const isEn = locale === "en";
  const t = TXT[locale];
  const nf = isEn ? nfEn : nfFr;
  const chf = (x: number, d = 0) => (isEn ? `CHF${NB}${nf(x, d)}` : `${nf(x, d)}${NB}CHF`);
  const signe = (x: number) => (Math.round(x) === 0 ? "0" : `${x > 0 ? "+" : "−"}${nf(Math.abs(x))}`);

  const [saisieLieu, setSaisieLieu] = useState("");
  const [personnes, setPersonnes] = useState<PersonneUI[]>([{ id: 1, naissance: "", franchise: null, accident: false }]);
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

  /* Profil partagé par lien : après le #, jamais envoyé au serveur. Lu une fois, puis retiré de l'adresse
     pour que la mesure d'audience ne le voie pas. Format : #npa=1201&p=1985.300.1,2015.0.1 */
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    const n = h.get("npa");
    const ps = (h.get("p") ?? "").split(",").filter(Boolean).slice(0, MAX_PERSONNES);
    if (!n && !ps.length) return;
    if (n && /^\d{4}$/.test(n)) setSaisieLieu(n);
    const lues2 = ps
      .map((x, k) => {
        const [a, f, acc] = x.split(".");
        return /^\d{4}$/.test(a ?? "") ? { id: k + 1, naissance: a, franchise: Number.isFinite(+f) ? +f : null, accident: acc === "1" } : null;
      })
      .filter((x): x is PersonneUI => Boolean(x));
    if (lues2.length) setPersonnes(lues2);
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);
  const [tri, setTri] = useState<Tri>("prix");
  const formRef = useRef<HTMLFormElement>(null);
  const reglagesRef = useRef<HTMLDivElement>(null);
  const [barre, setBarre] = useState(false);
  const listeRef = useRef<HTMLDivElement>(null);
  const apresRef = useRef<HTMLDivElement>(null);
  const rappelListe = useRef<HTMLParagraphElement>(null);
  const rappelApres = useRef<HTMLParagraphElement>(null);
  const resultatRef = useRef<HTMLElement>(null);

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

  /* Personnes : classe d'âge selon l'année, franchise parmi celles de la classe (enfant 0 à 600, dès 19 ans 300 à 2500). */
  const lues = personnes.map((p) => {
    const annee = parseInt(p.naissance, 10);
    const ok = p.naissance.length === 4 && P.anneeValide(annee);
    const cl: P.Classe | null = ok ? P.classe(annee) : null;
    const choix = P.FRANCHISES[cl ?? "adulte"];
    const fr = p.franchise !== null && choix.includes(p.franchise) ? p.franchise : choix[0];
    return { ...p, annee, ok, cl, choix, fr };
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

  /* rappel_vu : appel sous la 5e offre et appel de fin de liste (un seul événement « comparateur » par page). */
  useRappelVu(rappelListe, "comparateur", Boolean(aListe) && (r?.offres.length ?? 0) >= RAPPEL_APRES);
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
  const rangPrix = new Map(r ? r.offres.map((o, i) => [o, i]) : []);
  const redis = r ? r.redistribution : 0;
  const lienRappel = (cls?: string, texte?: string) => (
    <a className={cls} href={RAPPEL[locale]} onClick={versRappel}>
      <IconeTelephone size={16} />
      {texte ?? t.rappel}
    </a>
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
          resultatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        <div className="champ">
          <label htmlFor="cp-lieu">{t.lieu}</label>
          <div className="avec-coche">
            <input
              className="saisie"
              id="cp-lieu"
              list="cp-lieux"
              autoComplete="off"
              enterKeyHint="next"
              placeholder={t.lieuPh}
              value={saisieLieu}
              onChange={(e) => setSaisieLieu(e.target.value)}
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
            <div className="choix-liste" role="radiogroup">
              {lieux.map((l, i) => (
                <label className="option" key={`${l.canton}${l.region}`}>
                  <input type="radio" name="cp-lieu-choix" checked={i === choixLieu} onChange={() => setChoixLieu(i)} />
                  <span className="repere" aria-hidden="true" />
                  <span className="libelle">{l.communes}<small>{t.region(l.canton, l.region)}</small></span>
                </label>
              ))}
            </div>
          </div>
        ) : lieu ? (
          <p className="lieu-trouve" id="cp-lieu-aide" role="status">{lieu.npa} {lieu.communes}{lieu.communes === t.region(lieu.canton, lieu.region) ? "" : ` · ${t.region(lieu.canton, lieu.region)}`}</p>
        ) : index && saisieLieu.trim().length >= 4 && !sugg.length ? (
          <p className="note-outil provisoire" id="cp-lieu-aide" role="status">{t.inconnu}</p>
        ) : (
          <p className="note-outil" id="cp-lieu-aide">{t.lieuAide}</p>
        )}

        {lues.map((p, k) => (
          <fieldset className="personne" key={p.id}>
            <legend>
              {t.personne(k + 1)}
              {personnes.length > 1 ? (
                <button type="button" className="retirer" onClick={() => setPersonnes((cur) => cur.filter((x) => x.id !== p.id))}>
                  {t.retirer}
                </button>
              ) : null}
            </legend>
            <div className="ligne">
              <div className="champ">
                <label htmlFor={`cp-n-${p.id}`}>{t.naissance}</label>
                <div className="avec-coche">
                  <input
                    className="saisie"
                    id={`cp-n-${p.id}`}
                    inputMode="numeric"
                    maxLength={4}
                    placeholder={isEn ? "e.g. 1994" : "ex. 1994"}
                    value={p.naissance}
                    onChange={(e) => maj(p.id, { naissance: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                    aria-describedby={`cp-cl-${p.id}`}
                  />
                  <Coche ok={p.ok} />
                </div>
              </div>
              <div className="champ">
                <label htmlFor={`cp-f-${p.id}`}>{t.franchiseCourt}</label>
                <select className="saisie" id={`cp-f-${p.id}`} value={p.fr} disabled={!p.ok} onChange={(e) => maj(p.id, { franchise: +e.target.value })}>
                  {p.choix.map((f) => <option key={f} value={f}>{nf(f)}</option>)}
                </select>
              </div>
            </div>
            <p className="note-outil classe" id={`cp-cl-${p.id}`} role="status">{p.cl ? t.classe[p.cl] : p.naissance.length === 4 ? t.verifier : NB}</p>
            <label className="case">
              <input type="checkbox" checked={p.accident} onChange={(e) => maj(p.id, { accident: e.target.checked })} />
              <span>{t.accidentCase}<small>{t.accidentInfo}</small></span>
            </label>
          </fieldset>
        ))}
        {personnes.length < MAX_PERSONNES ? (
          <button
            type="button"
            className="ajouter-personne"
            onClick={() => setPersonnes((cur) => [...cur, { id: Math.max(...cur.map((x) => x.id)) + 1, naissance: "", franchise: null, accident: false }])}
          >
            + {t.ajouter}
          </button>
        ) : null}
        <p className="note-outil franchise-aide">{t.franchiseAide}</p>
        <button type="submit" className="bouton voir-primes">{t.voir}</button>
      </form>

      <section className="apercu" aria-live="polite" ref={resultatRef}>
        <h2 className={lieu && tousValides && r ? "titre-resultat" : "visually-hidden"}>{lieu && tousValides && r ? t.titre(`${lieu.npa} ${lieu.communes}`) : t.resultat}</h2>
        {!lieu || !tousValides ? (
          <p className="attente">{t.attente}</p>
        ) : etat === "erreur" ? (
          <p className="provisoire">{t.erreur}</p>
        ) : !d || !r ? (
          <p className="attente">{t.chargement}</p>
        ) : (
          <>
            <p className="resume-liste">
              {seul ? t.resume(r.total, lieu.communes, t.classeCourt[seul.classe], seul.franchise, seul.accident) : t.resumeFoyer(r.total, lieu.communes, pers.length)}{" "}
              <b>{t.triCourt[tri]}</b>
            </p>
            {r.total ? <p className="fourchette">{t.fourchette(chf(prix(r.min - redis), parAn ? 0 : 2), chf(prix(r.max - redis), parAn ? 0 : 2), chf(prix(r.moyenne - redis), parAn ? 0 : 2), parAn ? t.an : t.mois)}</p> : null}
            {!seul ? <p className="note-outil">{t.foyerNote}</p> : null}
            {r.total ? (
              <p className="plus-basse">
                {t.plusBasse} <b>{r.offres[0].assureur}, {r.offres[0].produit}</b> · {chf(prix(r.offres[0].mensuel - redis), parAn ? 0 : 2)} {parAn ? t.an : t.mois}
              </p>
            ) : null}

            <div className="reglages" ref={reglagesRef}>
              <div className="champ">
                <label htmlFor="cp-tri">{t.trier}</label>
                <select className="saisie" id="cp-tri" value={tri} onChange={(e) => setTri(e.target.value as Tri)}>
                  {(["prix", "prixDesc", "assureur"] as Tri[]).map((x) => <option key={x} value={x}>{t.tris[x]}</option>)}
                </select>
              </div>
              <div className="champ">
                <label htmlFor="cp-modele">{t.modele}</label>
                <select className="saisie" id="cp-modele" value={filtre} onChange={(e) => setFiltre(e.target.value as P.Filtre)}>
                  {(["tous", ...typesPresents] as P.Filtre[]).map((f) => (
                    <option key={f} value={f}>{t.filtres[f]}</option>
                  ))}
                </select>
              </div>
              <div className="bascule" role="radiogroup" aria-label={t.affichage}>
                <label className="pastille">
                  <input type="radio" name="cp-periode" checked={!parAn} onChange={() => setParAn(false)} />
                  <span>{t.mois}</span>
                </label>
                <label className="pastille">
                  <input type="radio" name="cp-periode" checked={parAn} onChange={() => setParAn(true)} />
                  <span>{t.an}</span>
                </label>
              </div>
            </div>
            <label className="case caisse-case">
              <input type="checkbox" checked={avecCaisse} onChange={(e) => setAvecCaisse(e.target.checked)} />
              <span>{t.ecartCaisse}<small>{t.caisseAide}</small></span>
            </label>
            {avecCaisse ? (
              <div className="ligne caisse-actuelle">
                <div className="champ">
                  <label htmlFor="cp-act-a">{t.assureur}</label>
                  <select className="saisie" id="cp-act-a" value={actA} onChange={(e) => { setActA(e.target.value); setActP(""); }}>
                    <option value="">{t.choisir}</option>
                    {assureursListe.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="champ">
                  <label htmlFor="cp-act-p">{t.produit}</label>
                  <select className="saisie" id="cp-act-p" value={actP} onChange={(e) => setActP(e.target.value)} disabled={!actA}>
                    <option value="">{t.choisir}</option>
                    {produitsActA.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                {actuelle ? <p className="note-outil">{t.actuelle}{isEn ? ":" : `${T}:`} {chf(actuelle.mensuel, 2)} {t.mois}, {chf(actuelle.annuel)} {t.an}.</p> : null}
              </div>
            ) : null}

            {!r.total ? (
              <p className="provisoire">{t.aucune}</p>
            ) : (
              <div ref={listeRef}>
                <p className="verdict">{t.memes}</p>

                {/* Mobile : une carte par offre */}
                <ol className="cartes-primes">
                  {visibles.map((o, i) => {
                    const ip = rangPrix.get(o) ?? i;
                    const vsAct = actuelle ? o.annuel - actuelle.annuel : null;
                    const estAct = actuelle && o.assureur === actuelle.assureur && o.produit === actuelle.produit;
                    return (
                      <li key={`${o.assureur}|${o.produit}`} className={estAct ? "est-actuelle" : undefined}>
                        <div className="carte-prime">
                          <span className="rang">{ip + 1}</span>
                          <div className="offre-qui">
                            <b>{o.assureur}</b>
                            <span className="produit">{o.produit}</span>
                            <span className="type">{t.types[o.type]}</span>
                          </div>
                          <div className="combien">
                            <span className="montant">{nf(prix(o.mensuel), parAn ? 0 : 2)}</span>
                            <span className="unite">CHF {parAn ? t.an : t.mois}</span>
                            <span className="autre">{parAn ? `${nf(o.mensuel, 2)} ${t.mois}` : `${nf(o.annuel)} ${t.an}`}</span>
                          </div>
                          <ul className="ecarts">
                            <li>{ip === 0 ? t.premiere : <><b>{signe(o.ecartMin)}</b> {t.parAn} {t.vsPremiere}</>}</li>
                            <li><b>{signe(o.ecartMoyenne)}</b> {t.parAn} {t.vsMoyenne}</li>
                            {vsAct !== null ? <li className="vs-actuelle"><b>{signe(vsAct)}</b> {t.parAn} {t.vsActuelle}</li> : null}
                          </ul>
                          <details className="detail-offre">
                            <summary>{t.details}</summary>
                            <ul>
                              <li>{chf(o.mensuel, 2)} {t.mois}, {chf(o.annuel)} {t.an}</li>
                              <li>{chf(o.mensuel - redis, 2)} {t.mois} {t.apresRedis}</li>
                              {o.details.map((x, k) => (
                                <li key={k}>
                                  {seul ? "" : `${t.personne(k + 1)}${isEn ? ": " : `${T}: `}`}
                                  {t.classeCourt[pers[k].classe]}, {t.franchiseDe(pers[k].franchise)}, {pers[k].accident ? t.accOui : t.accNon}
                                  {seul ? "" : <>, <b>{chf(prix(x), parAn ? 0 : 2)}</b></>}
                                </li>
                              ))}
                            </ul>
                          </details>
                          <a className="rappel-offre" href={RAPPEL[locale]} onClick={versRappel}>{t.rappelOffre}</a>
                        </div>
                        {i === RAPPEL_APRES - 1 ? <p className="rappel-liste" ref={rappelListe}>{t.rappelQ} {lienRappel()}</p> : null}
                      </li>
                    );
                  })}
                </ol>

                {/* Ordinateur : tableau */}
                <table className="assureurs primes-liste">
                  <caption>{t.caption}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t.thOffre}</th>
                      <th scope="col">{t.thPrime}</th>
                      <th scope="col">{t.thRedis}</th>
                      <th scope="col">{t.thTotal}</th>
                      <th scope="col">{t.thEcart}<small>{t.vsPremiere}</small></th>
                      <th scope="col">{t.thEcart}<small>{t.vsMoyenne}</small></th>
                      {actuelle ? <th scope="col">{t.thEcart}<small>{t.vsActuelle}</small></th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((o) => {
                      const i = rangPrix.get(o) ?? 0;
                      const estAct = actuelle && o.assureur === actuelle.assureur && o.produit === actuelle.produit;
                      return (
                        <tr key={`${o.assureur}|${o.produit}`} className={estAct ? "est-actuelle" : undefined}>
                          <td>
                            <span className="rang">{i + 1}</span>
                            <b>{o.assureur}</b>
                            <span className="produit">{o.produit}</span>
                            <span className="type">{t.typesCourts[o.type]}</span>
                            {!seul ? <span className="type">{o.details.map((x) => nf(prix(x), parAn ? 0 : 2)).join(" + ")}</span> : null}
                          </td>
                          <td className="mois">{nf(prix(o.mensuel), parAn ? 0 : 2)}</td>
                          <td>−{nf(prix(redis), 2)}</td>
                          <td>{nf(prix(o.mensuel - redis), parAn ? 0 : 2)}</td>
                          <td>{i === 0 ? "0" : signe(o.ecartMin)}</td>
                          <td>{signe(o.ecartMoyenne)}</td>
                          {actuelle ? <td>{signe(o.annuel - actuelle.annuel)}</td> : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {r.total > nb ? (
                  <button type="button" className="commande plus" onClick={() => setNb((v) => v + PAR_PAGE)}>
                    {t.plus(Math.min(r.total, nb + PAR_PAGE), r.total)}
                  </button>
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
                <button type="button" className="lien-profil" onClick={copierLien}>{t.lienProfil}</button>
                {copie ? <span className="copie-ok"> {t.lienCopie}</span> : null}
              </p>
            </div>

            {r.total && seul ? (
              <details className="franchises">
                <summary>{t.franchisesTitre}</summary>
                <p>{t.franchisesTexte(chf(P.QUOTE_PART_MAX[seul.classe]))}</p>
                <table className="assureurs">
                  <caption className="visually-hidden">{t.franchisesTitre}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t.thFranchise}</th>
                      <th scope="col">{t.thPremiere}</th>
                      <th scope="col">{t.thMax}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignesFr.filter((l) => l.nombre).map((l) => (
                      <tr key={l.franchise} aria-current={l.franchise === seul.franchise ? "true" : undefined}>
                        <td>{chf(l.franchise)}</td>
                        <td>{nf(l.premiere)}</td>
                        <td>{nf(l.maxACharge)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
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
              <div className="barre-collante">
                <button type="button" className="commande" onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}>{t.modifier}</button>
                <button type="button" className="commande" onClick={() => reglagesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>{t.trierFiltrer}</button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
