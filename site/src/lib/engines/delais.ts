/* Délais de résiliation, assurance maladie suisse. Fonctions pures, testées par tests/delais.test.mjs.
   Toutes les dates sont des Date locales à minuit. Sources vérifiées dans Fedlex le 22.11.2026 :
   art. 7 al. 1-2 LAMal ; art. 94 al. 2 et 100 al. 3 OAMal ; art. 35a LCA. */
const JOUR = 864e5;
type Cand = { fin: Date; dl: Date; base?: string; dlLegal?: Date };
export type Resultat = {
  fin: Date | null; dl: Date | null; poster: Date | null; manque: Cand | null;
  /* Date du texte quand elle tombe un samedi ou un dimanche : dl est alors le vendredi qui précède. */
  dlLegal?: Date | null;
  base: string; incertain: string[]; premiere?: Date | null;
};
const d0 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dim = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const finDeMois = (d: Date) => d.getDate() === dim(d.getFullYear(), d.getMonth());

/* Recule de n mois. Une fin de mois reste une fin de mois (31.12 - 3 mois = 30.09). */
export function moinsMois(d: Date, n: number): Date {
  let m = d.getMonth() - n, y = d.getFullYear();
  while (m < 0) { m += 12; y--; }
  return new Date(y, m, finDeMois(d) ? dim(y, m) : Math.min(d.getDate(), dim(y, m)));
}
/* Même jour, k années plus tard ; un 29 février devient 28 février les années non bissextiles. */
export function plusAns(d: Date, k: number): Date {
  const y = d.getFullYear() + k, m = d.getMonth();
  return new Date(y, m, finDeMois(d) ? dim(y, m) : Math.min(d.getDate(), dim(y, m)));
}
const jourAvant = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
export const jours = (a: Date, b: Date) => Math.round((d0(b).getTime() - d0(a).getTime()) / JOUR);
/* Réception : un assureur ne reçoit pas de courrier le week-end. Une date qui tombe un samedi ou un dimanche est avancée au
   vendredi (prudence ; les jours fériés cantonaux ne sont pas pris en compte). */
export function ouvrable(d: Date): Date {
  const j = d.getDay();
  return j === 6 ? jourAvant(d) : j === 0 ? new Date(d.getFullYear(), d.getMonth(), d.getDate() - 2) : d;
}
const cand = (fin: Date, legal: Date, base?: string): Cand => {
  const dl = ouvrable(legal);
  return { fin, dl, base, ...(dl.getTime() !== legal.getTime() ? { dlLegal: legal } : {}) };
};

/* Date conseillée pour poster : 7 jours avant la date de réception (marge de Guide Assurance, pas une règle légale). */
export const aPoster = (dl: Date) => new Date(dl.getFullYear(), dl.getMonth(), dl.getDate() - 7);

/* Choisit la première échéance encore possible et signale celle qu'on vient de manquer. */
function choisir(today: Date, cands: Cand[]) {
  cands.sort((a, b) => a.fin.getTime() - b.fin.getTime());
  let ok: Cand | null = null, manque: Cand | null = null;
  for (const c of cands) {
    if (c.fin < today) continue;
    if (c.dl >= today) { ok = c; break; }
    if (!manque) manque = c;
  }
  return { ok, manque };
}

/* LAMal. std = franchise de 300 francs et libre choix du médecin. */
export function lamal(todayIn: Date, std: boolean): Resultat {
  const today = d0(todayIn);
  const c: Cand[] = [], y = today.getFullYear();
  for (let Y = y; Y <= y + 2; Y++) {
    c.push(cand(new Date(Y, 11, 31), new Date(Y, 10, 30), std ? 'Art. 7, al. 2, LAMal.' : 'Art. 7, al. 2, LAMal ; art. 94 et 100 OAMal.'));
    if (std) c.push(cand(new Date(Y, 5, 30), new Date(Y, 2, 31), 'Art. 7, al. 1, LAMal.'));
  }
  const r = choisir(today, c);
  const ok = r.ok!;
  return { fin: ok.fin, dl: ok.dl, dlLegal: ok.dlLegal ?? null, poster: aPoster(ok.dl), manque: r.manque, base: ok.base!, incertain: [] };
}

export type OptionsLCA = { echeance?: Date | null; debut?: Date | null; preavis?: number; annuel?: boolean };
/* LCA. echeance : échéance annuelle de la police ; debut : début du contrat ; preavis : mois (3 par défaut) ;
   annuel : true si les conditions générales permettent de résilier chaque année. */
export function lca(todayIn: Date, o: OptionsLCA): Resultat {
  const today = d0(todayIn);
  const preavis = o.preavis || 3, incertain: string[] = [];
  const E = o.echeance ? d0(o.echeance) : (o.debut ? jourAvant(plusAns(d0(o.debut), 1)) : null);
  if (!E) return { fin: null, dl: null, poster: null, manque: null, base: 'Art. 35a LCA.', incertain: ['echeance'] };
  /* Fins annuelles possibles, de l'an passé à dans six ans */
  let c: Cand[] = [];
  const k0 = today.getFullYear() - E.getFullYear() - 1;
  for (let k = k0; k <= k0 + 8; k++) {
    const fin = plusAns(E, k);
    c.push(cand(fin, moinsMois(fin, preavis)));
  }
  /* Art. 35a al. 1 : pas avant la fin de la 3e année, sauf clause plus favorable (al. 2) */
  let premiere: Date | null = null;
  if (!o.annuel) {
    if (o.debut) {
      const p = jourAvant(plusAns(d0(o.debut), 3));
      premiere = p;
      c = c.filter((x) => x.fin >= p);
    } else incertain.push('debut');
  }
  if (preavis !== 3) incertain.push('preavis');
  const r = choisir(today, c);
  if (!r.ok) return { fin: null, dl: null, poster: null, manque: r.manque, base: 'Art. 35a LCA.', incertain: incertain.concat('aucune') };
  return { fin: r.ok.fin, dl: r.ok.dl, dlLegal: r.ok.dlLegal ?? null, poster: aPoster(r.ok.dl), manque: r.manque, premiere,
    base: o.annuel ? 'Vos conditions générales ; art. 35a, al. 2, LCA.' : 'Art. 35a, al. 1, LCA.', incertain };
}
