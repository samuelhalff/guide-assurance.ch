/* node mockups/tests/frontaliers.test.js
   Aucun exemple chiffré officiel n'existe (l'Urssaf publie seulement la formule) : les cas FR appliquent la formule Urssaf. */
import assert from 'node:assert';
import * as F from '../src/lib/engines/frontaliers.ts';
import data from '../src/data/primes-eu-fr-2027.json' with { type: 'json' };
let n = 0; const t = (nom, fn) => { fn(); n++; };

t('60 000 € en 2027', () => assert.strictEqual(F.cotisationFR(60000, 2027).cotisation, 3822));
t('sous l’abattement', () => assert.strictEqual(F.cotisationFR(12000, 2027).cotisation, 0));
t('égal à l’abattement', () => assert.strictEqual(F.cotisationFR(12225, 2027).cotisation, 0));
t('100 000 €', () => assert.strictEqual(F.cotisationFR(100000, 2027).cotisation, 7022));
t('40 000 € (un conjoint frontalier)', () => assert.strictEqual(F.cotisationFR(40000, 2027).cotisation, 2222));
t('prorata 184 jours', () => assert.strictEqual(F.cotisationFR(60000, 2027, { jours: 184 }).cotisation, 1927));
t('taxation d’office 2027', () => assert.strictEqual(F.cotisationFR(0, 2027, { office: true }).cotisation, 18582));
t('2026 sur 58 000 €', () => assert.strictEqual(F.cotisationFR(58000, 2026).cotisation, 3679));
t('déclaration tardive +10 %', () => assert.strictEqual(F.cotisationFR(60000, 2027, { tardif: true }).cotisation, 4302));
t('abattement 2027', () => assert.strictEqual(F.cotisationFR(1, 2027).abattement, 12225));
t('2027 marqué provisoire', () => assert.ok(F.cotisationFR(1, 2027).provisoire.length > 0));
t('année inconnue refusée', () => assert.throws(() => F.cotisationFR(1, 2030)));

t('classes d’âge 2027', () => {
  assert.strictEqual(F.classe(2009, 2027), 'enfant');
  assert.strictEqual(F.classe(2008, 2027), 'jeune');
  assert.strictEqual(F.classe(2002, 2027), 'jeune');
  assert.strictEqual(F.classe(2001, 2027), 'adulte');
});

t('données : 13 assureurs, fourchettes OFSP', () => {
  assert.strictEqual(data.assureurs.length, 13);
  const r = F.lamalFoyer(data, [{ classe: 'adulte', accident: false }]);
  assert.strictEqual(r.min, 209.3); assert.strictEqual(r.max, 823.1); assert.strictEqual(r.mediane, 489.3);
  const a = F.lamalFoyer(data, [{ classe: 'adulte', accident: true }]);
  assert.strictEqual(a.min, 225); assert.strictEqual(a.mediane, 515); assert.strictEqual(a.max, 885);
});
t('liste complète et triée', () => {
  const r = F.lamalFoyer(data, [{ classe: 'adulte', accident: false }, { classe: 'enfant', accident: true }]);
  assert.strictEqual(r.liste.length, 13);
  for (let i = 1; i < 13; i++) assert.ok(r.liste[i].mensuel >= r.liste[i - 1].mensuel);
});
t('foyer : même assureur pour toute la famille', () => {
  const css = data.assureurs.find(a => a.no === 8);
  const r = F.lamalFoyer(data, [{ classe: 'adulte', accident: false }, { classe: 'adulte', accident: true }, { classe: 'enfant', accident: true }]);
  const ligne = r.liste.find(x => x.no === 8);
  assert.strictEqual(ligne.mensuel, Math.round((css.adulte.sans + css.adulte.avec + css.enfant.avec) * 100) / 100);
});
const base = (cj, enfants) => ({ annee: 2027, tauxEurChf: 0.93, frontalier: { naissance: 1985, assiette: 60000 }, conjoint: cj, enfants: enfants || [] });
t('foyer complet : conjoint sans activité + 2 enfants = 4 primes (cas GPT)', () => {
  const c = F.comparer(data, base({ statut: 'sans', naissance: 1987 }, [2015, 2018]));
  assert.strictEqual(c.assuresCH.length, 4);
  assert.strictEqual(Math.round(c.lamal.min * 12), 6452);   // Helsana : 209,30 + 225,00 + 2 × 51,70
  assert.strictEqual(Math.round(c.lamal.max * 12), 26857);  // KPT
  assert.strictEqual(c.lamal.liste[0].nom, 'Helsana');
  assert.strictEqual(c.france.eur, 3822);                    // proches rattachés sans cotisation
  assert.deepStrictEqual(c.assuresCH.map(p => p.accident), [false, true, true, true]);
});
t('conjoint qui travaille en France : enfants côté français, LAMal = frontalier seul', () => {
  const c = F.comparer(data, base({ statut: 'france', naissance: 1987 }, [2015, 2018]));
  assert.strictEqual(c.assuresCH.length, 1);
  assert.strictEqual(c.horsChoix.length, 3);
  assert.strictEqual(c.lamal.min, 209.3);
  assert.strictEqual(c.france.eur, 3822);
});
t('sans conjoint, 2 enfants : 3 primes', () => {
  const c = F.comparer(data, base({ statut: 'aucun' }, [2015, 2018]));
  assert.strictEqual(c.assuresCH.length, 3);
  assert.strictEqual(Math.round(c.lamal.min * 12), 3752);
});
t('deux frontaliers : deux cotisations, deux primes sans accident', () => {
  const c = F.comparer(data, base({ statut: 'suisse', naissance: 1986, assiette: 40000 }, []));
  assert.strictEqual(c.france.eur, 3822 + 2222);
  assert.deepStrictEqual(c.assuresCH.map(p => p.accident), [false, false]);
});
t('moins de 8 h : prime avec accident', () => {
  const b = base({ statut: 'aucun' }); b.frontalier.moinsDe8h = true;
  assert.strictEqual(F.comparer(data, b).lamal.min, 225);
});
t('jeune adulte (19-25) et enfant de 19 ans en formation', () => {
  const b = base({ statut: 'aucun' }, [2008]); b.frontalier.naissance = 2003;
  const c = F.comparer(data, b);
  assert.deepStrictEqual(c.assuresCH.map(p => p.classe), ['jeune', 'jeune']);
});
t('aucune personne ajoutée ni oubliée', () => {
  for (const st of ['aucun', 'sans', 'france', 'suisse']) {
    const c = F.comparer(data, base({ statut: st, naissance: 1987, assiette: 1 }, [2015]));
    const attendu = 1 + (st === 'aucun' ? 0 : 1) + 1;
    assert.strictEqual(c.membres.length, attendu, st);
    assert.strictEqual(c.assuresCH.length + c.horsChoix.length, attendu, st);
  }
});
// Cas de test officiels du simulateur public Urssaf (betagouv/mon-entreprise, contextes/frontalier-suisse/domaine/cotisation.test.ts)
t('Urssaf officiel : exemple PASS 2018, 45 000 + 10 000 € → 3 605 €', () => assert.strictEqual(F.cotisationFR(55000, 2018).cotisation, 3605));
t('Urssaf officiel : 2026, base 42 985 €, 3 439 €/an, 287 €/mois', () => {
  const r = F.cotisationFR(45000 + 10000, 2026);
  assert.strictEqual(r.base - r.abattement, 42985); assert.strictEqual(r.annuelle, 3439); assert.strictEqual(r.mensuelle, 287);
});
t('Urssaf officiel : affiliation au 01.05.2026 (245 jours) → 2 308 €', () => assert.strictEqual(F.cotisationFR(55000, 2026, { jours: 245 }).cotisation, 2308));
t('Urssaf officiel : fin au 30.09.2026 (273 jours) → 2 572 €', () => assert.strictEqual(F.cotisationFR(55000, 2026, { jours: 273 }).cotisation, 2572));
t('Urssaf officiel : 5 000 € → 0', () => assert.strictEqual(F.cotisationFR(5000, 2026).cotisation, 0));
t('salaires + autres revenus additionnés', () => {
  const c = F.comparer(data, { annee: 2027, tauxEurChf: 1, frontalier: { naissance: 1985, assiette: 80000, autres: 10000 }, conjoint: { statut: 'aucun' }, enfants: [] });
  assert.strictEqual(c.france.eur, Math.round((90000 - 12225) * 0.08));
});
console.log(n + ' tests OK');
