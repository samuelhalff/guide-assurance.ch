/* Comparateur de primes LAMal 2027 : lecture des données par canton (public/data/primes-2027/<CANTON>.json,
   produites par data/scripts/build_comparateur_2027.py) et calcul de la liste triée. Aucun appel réseau ici :
   la page charge le fichier du canton, ce module ne fait que calculer. Montants des fichiers en centimes. */

export type Classe = "enfant" | "jeune" | "adulte";
export type TypeModele = "BASE" | "FLEX" | "PRAXIS" | "TEL_DIG" | "PHARM";
export type Filtre = "tous" | TypeModele;
export type Canton = "GE" | "VD" | "VS" | "FR" | "NE" | "JU" | "BE";

export const CANTONS: Canton[] = ["GE", "VD", "VS", "FR", "NE", "JU", "BE"];
export const TYPES: TypeModele[] = ["BASE", "PRAXIS", "TEL_DIG", "PHARM", "FLEX"];
export const ANNEE = 2027;

/* Franchises autorisées (art. 93 et 103 OAMal) : enfants 0 à 600 CHF, dès 19 ans 300 à 2500 CHF. */
export const FRANCHISES: Record<Classe, number[]> = {
  enfant: [0, 100, 200, 300, 400, 500, 600],
  jeune: [300, 500, 1000, 1500, 2000, 2500],
  adulte: [300, 500, 1000, 1500, 2000, 2500],
};
/* Quote-part maximale par an (art. 103 OAMal), la même chez tous les assureurs. */
export const QUOTE_PART_MAX: Record<Classe, number> = { enfant: 350, jeune: 700, adulte: 700 };

export type DonneesCanton = {
  canton: Canton;
  annee: number;
  source: string;
  regions: Record<string, { commune: string }>;
  assureurs: string[];
  produits: [number, string, TypeModele][];
  redistribution: Partial<Record<Classe, number>>;
  primes: Record<string, Partial<Record<Classe, Record<string, { a: (number | null)[]; s: (number | null)[] }>>>>;
};

/* NPA -> [canton, région, communes]. */
export type IndexNpa = Record<string, [string, number, string][]>;

export type Profil = { region: number; classe: Classe; franchise: number; accident: boolean; filtre?: Filtre };

export type Offre = {
  assureur: string;
  produit: string;
  type: TypeModele;
  mensuel: number; // CHF
  annuel: number; // CHF
  ecartMin: number; // CHF par an, par rapport à la première offre de la liste
  ecartMoyenne: number; // CHF par an, par rapport à la moyenne de la liste (négatif = en dessous)
};

export type Resultat = { offres: Offre[]; total: number; min: number; max: number; moyenne: number; redistribution: number };

/* Classe d'âge de l'année de prime : enfant jusqu'à 18 ans, jeune adulte de 19 à 25 ans, adulte dès 26 ans
   (art. 61 LAMal ; l'âge compte selon l'année de naissance). */
export function classe(naissance: number, annee = ANNEE): Classe {
  const age = annee - naissance;
  if (age <= 18) return "enfant";
  if (age <= 25) return "jeune";
  return "adulte";
}

/* Couverture accident par défaut (art. 8 LAMal) : seul un salarié assuré LAA (8 h par semaine chez le même employeur)
   peut la suspendre. Cochée d'office pour les enfants et dès 65 ans, laissée au choix entre les deux. */
export function accidentParDefaut(naissance: number, annee = ANNEE): boolean {
  const age = annee - naissance;
  return age <= 18 || age >= 65;
}

export function anneeValide(naissance: number, annee = ANNEE): boolean {
  return Number.isInteger(naissance) && naissance >= annee - 120 && naissance <= annee;
}

/* Régions possibles pour un NPA, limitées aux cantons couverts. */
export function regionsNpa(index: IndexNpa, npa: string): { canton: Canton; region: number; communes: string }[] {
  if (!/^\d{4}$/.test(npa)) return [];
  return (index[npa] ?? [])
    .filter(([c]) => (CANTONS as string[]).includes(c))
    .map(([c, r, communes]) => ({ canton: c as Canton, region: r, communes }));
}

const chf = (centimes: number) => Math.round(centimes) / 100;
const arr = (x: number) => Math.round(x * 100) / 100;

export function offres(d: DonneesCanton, p: Profil): Resultat {
  const ligne = d.primes[String(p.region)]?.[p.classe]?.[String(p.franchise)];
  const redistribution = chf(d.redistribution[p.classe] ?? 0);
  if (!ligne) return { offres: [], total: 0, min: 0, max: 0, moyenne: 0, redistribution };
  const v = p.accident ? ligne.a : ligne.s;
  const filtre = p.filtre ?? "tous";
  const brutes = v
    .map((c, i) => ({ c, i }))
    .filter((x): x is { c: number; i: number } => x.c !== null && (filtre === "tous" || d.produits[x.i][2] === filtre))
    .sort((a, b) => a.c - b.c || d.produits[a.i][1].localeCompare(d.produits[b.i][1]));
  if (!brutes.length) return { offres: [], total: 0, min: 0, max: 0, moyenne: 0, redistribution };
  const min = chf(brutes[0].c);
  const moyenne = chf(brutes.reduce((s, x) => s + x.c, 0) / brutes.length);
  const liste = brutes.map(({ c, i }) => {
    const [ia, produit, type] = d.produits[i];
    const mensuel = chf(c);
    return {
      assureur: d.assureurs[ia],
      produit,
      type,
      mensuel,
      annuel: arr(mensuel * 12),
      ecartMin: arr((mensuel - min) * 12),
      ecartMoyenne: arr((mensuel - moyenne) * 12),
    };
  });
  return { offres: liste, total: liste.length, min, max: liste[liste.length - 1].mensuel, moyenne: arr(moyenne), redistribution };
}

/* Même profil, toutes les franchises : primes annuelles de la liste (première et moyenne) et part maximale à charge
   (prime annuelle + franchise entière + quote-part maximale). Des faits, aucun choix proposé. */
export type LigneFranchise = { franchise: number; premiere: number; moyenne: number; maxACharge: number; nombre: number };
export function parFranchise(d: DonneesCanton, p: Omit<Profil, "franchise">): LigneFranchise[] {
  return FRANCHISES[p.classe].map((franchise) => {
    const r = offres(d, { ...p, franchise });
    const premiere = arr(r.min * 12);
    return { franchise, premiere, moyenne: arr(r.moyenne * 12), maxACharge: arr(premiere + franchise + QUOTE_PART_MAX[p.classe]), nombre: r.total };
  });
}

/* Recherche de lieu : « 1201 », « 1201 Genève », « Prilly » ou « 1008 Prilly ». Chaque suggestion est un NPA dans une
   région de prime ; un NPA à cheval sur deux régions donne deux suggestions. */
export type Suggestion = { npa: string; canton: Canton; region: number; communes: string; libelle: string };
const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function libelleLieu(npa: string, communes: string, canton: Canton) {
  return `${npa} ${communes} (${canton})`;
}
export function suggestions(index: IndexNpa, saisie: string, max = 8): Suggestion[] {
  const q = sansAccent(saisie.trim());
  if (q.length < 2) return [];
  const m = q.match(/^(\d{1,4})\s*(.*)$/);
  const chiffres = m ? m[1] : "";
  const texte = m ? m[2] : q;
  const out: Suggestion[] = [];
  for (const [npa, lieux] of Object.entries(index)) {
    if (chiffres && !npa.startsWith(chiffres)) continue;
    for (const [c, r, communes] of lieux) {
      if (!(CANTONS as string[]).includes(c)) continue;
      if (texte && !sansAccent(communes).includes(texte)) continue;
      out.push({ npa, canton: c as Canton, region: r, communes, libelle: libelleLieu(npa, communes, c as Canton) });
      if (out.length >= max) return out;
    }
  }
  return out;
}

/* Foyer : une prime par personne, chez le même assureur et dans le même modèle. Une offre n'est retenue que si
   elle existe pour chaque personne du foyer. Montants mensuels en CHF ; `details` donne la prime de chacun. */
export type Personne = { classe: Classe; franchise: number; accident: boolean };
export type OffreFoyer = Offre & { details: number[] };
export type ResultatFoyer = { offres: OffreFoyer[]; total: number; min: number; max: number; moyenne: number; redistribution: number };

export function offresFoyer(d: DonneesCanton, region: number, personnes: Personne[], filtre: Filtre = "tous"): ResultatFoyer {
  const lignes = personnes.map((p) => {
    const l = d.primes[String(region)]?.[p.classe]?.[String(p.franchise)];
    return l ? (p.accident ? l.a : l.s) : null;
  });
  const redistribution = arr(personnes.reduce((s, p) => s + chf(d.redistribution[p.classe] ?? 0), 0));
  const vide = { offres: [], total: 0, min: 0, max: 0, moyenne: 0, redistribution };
  if (!personnes.length || lignes.some((l) => !l)) return vide;
  const brutes: { i: number; c: number; det: number[] }[] = [];
  d.produits.forEach((prod, i) => {
    if (filtre !== "tous" && prod[2] !== filtre) return;
    const det = lignes.map((l) => l![i]);
    if (det.some((c) => c === null)) return;
    brutes.push({ i, c: (det as number[]).reduce((s, c) => s + c, 0), det: det as number[] });
  });
  if (!brutes.length) return vide;
  brutes.sort((a, b) => a.c - b.c || d.produits[a.i][1].localeCompare(d.produits[b.i][1]));
  const min = chf(brutes[0].c);
  const moyenne = chf(brutes.reduce((s, x) => s + x.c, 0) / brutes.length);
  const offres = brutes.map(({ i, c, det }) => {
    const [ia, produit, type] = d.produits[i];
    const mensuel = chf(c);
    return {
      assureur: d.assureurs[ia], produit, type, mensuel,
      annuel: arr(mensuel * 12), ecartMin: arr((mensuel - min) * 12), ecartMoyenne: arr((mensuel - moyenne) * 12),
      details: det.map(chf),
    };
  });
  return { offres, total: offres.length, min, max: offres[offres.length - 1].mensuel, moyenne: arr(moyenne), redistribution };
}

/* Rang par la prime (classement avec ex æquo) : 1 + nombre d'offres à prime strictement plus basse. Une offre à égalité
   porte le même rang que les autres, dans la liste comme dans la phrase « Votre offre actuelle est au rang … ». */
export function rangsPrix(annuels: readonly number[]): number[] {
  return annuels.map((a) => 1 + annuels.filter((x) => x < a).length);
}
