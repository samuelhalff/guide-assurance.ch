/* Frontaliers France → Suisse : assurance maladie française (cotisation Urssaf) ou LAMal.
   Fonctions pures, testées par tests/frontaliers.test.mjs. Sources vérifiées le 22.11.2026 :
   - Urssaf, « Travail en Suisse : déclarer vos revenus » (MAJ 24.09.2026) : 8 % × (revenus N−2 − 25 % du PASS), arrondis à l'euro,
     proratisation au nombre de jours, taxation d'office sur 5 PASS, majoration de 10 % en cas de déclaration tardive ;
   - calcul aligné sur le simulateur public Urssaf (betagouv/mon-entreprise, contextes/frontalier-suisse/domaine/cotisation.ts) ;
   - PASS 2026 : 48 060 € ; PASS 2027 : 48 900 € (annonce BOSS du 16.10.2026, arrêté à paraître) ;
   - OFSP, primes 2027 des résidents UE (Prämien_EU) ; art. 101a et 103, al. 7, OAMal (franchise de 300 CHF seulement). */
export const PASS: Record<number, number> = { 2018: 39732, 2024: 46368, 2025: 47100, 2026: 48060, 2027: 48900 };
export const TAUX: Record<number, number> = { 2018: 0.08, 2024: 0.08, 2025: 0.08, 2026: 0.08, 2027: 0.08 };
/* Ce qui n'est pas encore confirmé par un texte publié, à revérifier avant la mise en ligne */
const PROVISOIRE: Record<number, string[]> = { 2027: ['taux 2027 non confirmé tant que la LFSS 2027 n’est pas votée', 'PASS 2027 annoncé, arrêté à paraître'] };

export type Cotisation = { base: number; abattement: number; taux: number; cotisation: number; annuelle: number; mensuelle: number; jours: number; provisoire: string[] };

/* Cotisation maladie annuelle d'un frontalier, en euros.
   assiette : salaires + autres revenus déclarés à l'Urssaf pour l'année N−2 (€) ; jours : jours d'affiliation dans l'année ;
   tardif : déclaration faite après une taxation d'office (+10 %) ; office : taxation d'office (5 PASS). */
export function cotisationFR(assiette: number, annee: number, o: { jours?: number; tardif?: boolean; office?: boolean } = {}): Cotisation {
  if (!PASS[annee]) throw new Error('Année non prise en charge : ' + annee);
  const base = o.office ? 5 * PASS[annee] : Math.round((assiette || 0) * (o.tardif ? 1.1 : 1));
  const abattement = Math.round(0.25 * PASS[annee]);
  const net = Math.max(0, base - abattement);
  const annuelle = Math.round(net * TAUX[annee]);
  /* Comme le simulateur Urssaf : cotisation annuelle arrondie, puis prorata de ce montant arrondi (365 ou 366 jours) */
  const jAn = (Date.UTC(annee + 1, 0, 1) - Date.UTC(annee, 0, 1)) / 864e5;
  const jours = o.jours && o.jours < jAn ? o.jours : jAn;
  return {
    base, abattement, taux: TAUX[annee],
    cotisation: jours === jAn ? annuelle : Math.round((annuelle * jours) / jAn),
    annuelle, mensuelle: Math.round(annuelle / 12), jours, provisoire: PROVISOIRE[annee] || [],
  };
}

export type Classe = 'enfant' | 'jeune' | 'adulte';
/* Classe d'âge LAMal pour l'année de prime : enfant jusqu'à 18 ans, jeune adulte de 19 à 25 ans, adulte dès 26 ans. */
export function classe(anneeNaissance: number, anneePrime: number): Classe {
  const age = anneePrime - anneeNaissance;
  return age <= 18 ? 'enfant' : age <= 25 ? 'jeune' : 'adulte';
}

type Prime = { avec: number; sans: number };
export type Assureur = { no: number; nom: string; adulte: Prime; jeune: Prime; enfant: Prime };
export type DonneesPrimes = { assureurs: Assureur[]; source?: string };
export type Personne = { classe: Classe; accident: boolean };
export type LigneLamal = { no: number; nom: string; mensuel: number; annuel: number };

/* Primes LAMal du foyer chez chaque assureur, en CHF par mois.
   Toute la famille doit être assurée chez le même assureur (option LAMal), d'où un total par assureur. */
export function lamalFoyer(data: DonneesPrimes, personnes: Personne[]) {
  const liste: LigneLamal[] = data.assureurs.map((a) => {
    let mensuel = 0;
    personnes.forEach((p) => { mensuel += a[p.classe][p.accident ? 'avec' : 'sans']; });
    mensuel = Math.round(mensuel * 100) / 100;
    return { no: a.no, nom: a.nom, mensuel, annuel: Math.round(mensuel * 12 * 100) / 100 };
  });
  liste.sort((x, y) => x.mensuel - y.mensuel || x.nom.localeCompare(y.nom, 'fr'));
  const m = liste.map((x) => x.mensuel), n = m.length;
  const med = n % 2 ? m[(n - 1) / 2] : (m[n / 2 - 1] + m[n / 2]) / 2;
  return { liste, min: m[0], mediane: Math.round(med * 100) / 100, max: m[n - 1] };
}

export type StatutConjoint = 'aucun' | 'sans' | 'france' | 'suisse';
export type Revenu = { naissance: number; assiette?: number; autres?: number; moinsDe8h?: boolean };
export type Foyer = {
  annee: number; tauxEurChf: number; frontalier: Revenu;
  conjoint?: { statut: StatutConjoint } & Partial<Revenu>; enfants?: number[];
};
export type Membre = { qui: string; classe: Classe; role: 'frontalier' | 'proche' | 'france'; accident?: boolean; assiette?: number };

/* Qualification du foyer (art. 32 du règlement CE 883/2004 ; OFSP ; CLEISS) :
   - le frontalier choisit son système ; ses proches SANS activité le suivent ;
   - conjoint qui travaille en France : il relève du régime français, et les enfants y sont rattachés en priorité ;
   - conjoint frontalier lui aussi : il a son propre droit d'option ; le simulateur suppose la même option pour les deux. */
export function foyer(f: Foyer): Membre[] {
  const cj = f.conjoint || { statut: 'aucun' as const }, m: Membre[] = [];
  m.push({ qui: 'Vous', classe: classe(f.frontalier.naissance, f.annee), role: 'frontalier', accident: !!f.frontalier.moinsDe8h, assiette: (f.frontalier.assiette || 0) + (f.frontalier.autres || 0) });
  if (cj.statut === 'sans') m.push({ qui: 'Votre conjoint', classe: classe(cj.naissance!, f.annee), role: 'proche', accident: true });
  if (cj.statut === 'suisse') m.push({ qui: 'Votre conjoint', classe: classe(cj.naissance!, f.annee), role: 'frontalier', accident: !!cj.moinsDe8h, assiette: (cj.assiette || 0) + (cj.autres || 0) });
  if (cj.statut === 'france') m.push({ qui: 'Votre conjoint', classe: classe(cj.naissance!, f.annee), role: 'france' });
  (f.enfants || []).forEach((n, k) => {
    m.push({ qui: 'Enfant ' + (k + 1), classe: classe(n, f.annee), role: cj.statut === 'france' ? 'france' : 'proche', accident: true });
  });
  return m;
}

export function comparer(data: DonneesPrimes, f: Foyer) {
  const membres = foyer(f);
  const assuresCH = membres.filter((p) => p.role !== 'france');
  const horsChoix = membres.filter((p) => p.role === 'france');
  const cotis = membres.filter((p) => p.role === 'frontalier').map((p) => cotisationFR(p.assiette!, f.annee));
  const lamal = lamalFoyer(data, assuresCH as Personne[]);
  const frEur = cotis.reduce((s, c) => s + c.cotisation, 0);
  const frChf = Math.round(frEur * f.tauxEurChf);
  return {
    membres, assuresCH, horsChoix,
    france: { detail: cotis, eur: frEur, chf: frChf },
    lamal,
    ecart: { min: Math.round(lamal.min * 12) - frChf, mediane: Math.round(lamal.mediane * 12) - frChf },
  };
}
