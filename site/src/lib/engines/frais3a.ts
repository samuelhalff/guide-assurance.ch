/* Moteur des frais du 3e pilier (fonctions pures, tests/donnees.test.mts). Frais du 3e pilier (src/data/frais-3a.json), relevés à la main sur les pages des fournisseurs et contrôlés chaque mois
   par infra/refresh/frais3a.py. Deux familles séparées : les comptes 3a (rémunérés par un taux, frais du compte) et les
   solutions 3a en titres (aucun intérêt : coûts annuels publiés et part en actions, jamais de rendement).
   Tri des solutions en titres, critère affiché : coût annuel publié le plus haut de la fourchette, du plus bas au plus
   haut, quand les frais du fournisseur et ceux des fonds sont publiés ; les offres dont une partie des coûts n'est pas
   publiée viennent ensuite, par ordre alphabétique. Aucune ligne payée, aucun « meilleur ». */

export type FraisCompte = { tenue_chf: number | null; transfert_chf: number | null; note_fr: string; note_en: string; url: string; lu_le: string };
export type Titres3a = {
  id: string; fournisseur: string; produit: string; nom_complet: string;
  cout_min_pct: number | null; cout_max_pct: number | null; cout_complet: boolean; cout_fr: string; cout_en: string;
  actions_min_pct: number | null; actions_max_pct: number | null; minimum_chf: number | null; taux_liquidites_pct: number | null;
  autres_fr: string; autres_en: string; url: string; lu_le: string;
};


export function trierTitres(liste: Titres3a[]): Titres3a[] {
  const complet = (t: Titres3a) => t.cout_complet && t.cout_max_pct !== null;
  return [...liste].sort((a, b) => {
    const ca = complet(a), cb = complet(b);
    if (ca !== cb) return ca ? -1 : 1;
    if (ca && cb) return a.cout_max_pct! - b.cout_max_pct! || a.cout_min_pct! - b.cout_min_pct! || a.fournisseur.localeCompare(b.fournisseur, "fr");
    return a.fournisseur.localeCompare(b.fournisseur, "fr");
  });
}

const pc = (x: number, en: boolean) => (en ? `${x.toFixed(2)}%` : `${x.toFixed(2).replace(".", ",")} %`);
/* Fourchette affichée : « 0,39 à 0,41 % », « 0,50 % », ou null si non chiffrée. */
export function fourchette(t: Pick<Titres3a, "cout_min_pct" | "cout_max_pct">, en = false): string | null {
  const { cout_min_pct: a, cout_max_pct: b } = t;
  if (a === null && b === null) return null;
  if (a === null || b === null || a === b) return pc((b ?? a)!, en);
  return en ? `${a.toFixed(2)}–${pc(b, true)}` : `${a.toFixed(2).replace(".", ",")} à ${pc(b, false)}`;
}
export function partActions(t: Pick<Titres3a, "actions_min_pct" | "actions_max_pct">, en = false): string | null {
  const { actions_min_pct: a, actions_max_pct: b } = t;
  if (a === null && b === null) return null;
  const p = (x: number) => (en ? `${x}%` : `${x} %`);
  if (a === null) return en ? `up to ${p(b!)}` : `jusqu’à ${p(b!)}`;
  if (b === null) return en ? `from ${p(a)}` : `dès ${p(a)}`;
  return en ? `${a}–${p(b)}` : `${a} à ${p(b)}`;
}
/* Frais d'un compte 3a en une ligne : tenue et transfert vers un autre prestataire. */
export function resumeFraisCompte(f: FraisCompte | undefined, en = false): string {
  if (!f) return "";
  const chf = (x: number) => (en ? `CHF ${x}` : `${x} CHF`);
  const tenue = f.tenue_chf === null ? (en ? "account fee not published" : "tenue de compte non publiée") : f.tenue_chf === 0 ? (en ? "free account" : "tenue de compte gratuite") : (en ? `account fee ${chf(f.tenue_chf)} a year` : `tenue de compte ${chf(f.tenue_chf)} par an`);
  const tr = f.transfert_chf === null ? (en ? "transfer fee not published" : "transfert non chiffré") : f.transfert_chf === 0 ? (en ? "free transfer" : "transfert gratuit") : (en ? `transfer or closure ${chf(f.transfert_chf)}` : `transfert ou clôture ${chf(f.transfert_chf)}`);
  const s = `${tenue}, ${tr}`;
  return s[0].toUpperCase() + s.slice(1) + ".";
}
