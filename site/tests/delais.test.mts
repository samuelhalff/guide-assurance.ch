// node mockups/tests/delais.test.js
import * as D from '../src/lib/engines/delais.ts';
const f = d => d ? `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}` : null;
const p = s => { const [d,m,y] = s.split('.').map(Number); return new Date(y, m-1, d); };
let n = 0, ko = 0;
function eq(nom, got, exp) { n++; if (JSON.stringify(got) !== JSON.stringify(exp)) { ko++; console.log('ÉCHEC', nom, '\n  obtenu ', got, '\n  attendu', exp); } }

// Outils de date
eq('31.12 -3 mois', f(D.moinsMois(p('31.12.2026'), 3)), '30.09.2026');
eq('31.03 -3 mois', f(D.moinsMois(p('31.03.2027'), 3)), '31.12.2026');
eq('28.02 (fin de mois) -3', f(D.moinsMois(p('28.02.2027'), 3)), '30.11.2026');
eq('29.02.2028 -3', f(D.moinsMois(p('29.02.2028'), 3)), '30.11.2027');
eq('15.01 -3', f(D.moinsMois(p('15.01.2027'), 3)), '15.10.2026');
eq('31.05 -1', f(D.moinsMois(p('31.05.2027'), 1)), '30.04.2027');
eq('29.02.2028 +1 an', f(D.plusAns(p('29.02.2028'), 1)), '28.02.2029');
eq('28.02.2027 +1 an (fin de mois)', f(D.plusAns(p('28.02.2027'), 1)), '29.02.2028');

// LAMal
const L = (t, std) => { const r = D.lamal(p(t), std); return [f(r.fin), f(r.dl), r.manque ? f(r.manque.fin) : null]; };
eq('22.11.2026 autre', L('22.11.2026', false), ['31.12.2026', '30.11.2026', null]);
eq('22.11.2026 std', L('22.11.2026', true), ['31.12.2026', '30.11.2026', null]);
eq('30.11.2026 dernier jour', L('30.11.2026', false), ['31.12.2026', '30.11.2026', null]);
eq('01.12.2026 autre : manqué', L('01.12.2026', false), ['31.12.2027', '30.11.2027', '31.12.2026']);
eq('01.12.2026 std : manqué, 30.06', L('01.12.2026', true), ['30.06.2027', '31.03.2027', '31.12.2026']);
eq('31.03.2027 std', L('31.03.2027', true), ['30.06.2027', '31.03.2027', null]);
eq('01.04.2027 std : manqué 30.06', L('01.04.2027', true), ['31.12.2027', '30.11.2027', '30.06.2027']);
eq('15.07.2027 std', L('15.07.2027', true), ['31.12.2027', '30.11.2027', null]);
eq('31.12.2026 autre : manqué', L('31.12.2026', false), ['31.12.2027', '30.11.2027', '31.12.2026']);
eq('01.01.2027 autre', L('01.01.2027', false), ['31.12.2027', '30.11.2027', null]);
eq('poster 7 j avant', f(D.lamal(p('22.11.2026'), false).poster), '23.11.2026');

// LCA
const C = (t, o) => { const r = D.lca(p(t), o); return [f(r.fin), f(r.dl), r.manque ? f(r.manque.fin) : null, r.incertain]; };
const o = (e, d, x={}) => Object.assign({ echeance: e ? p(e) : null, debut: d ? p(d) : null, preavis: 3, annuel: false }, x);
eq('contrat ancien, échéance 31.12, délai passé', C('22.11.2026', o('31.12.2026', '01.01.2015')), ['31.12.2027', '30.09.2027', '31.12.2026', []]);
eq('début 01.01.2026 : pas avant 31.12.2028', C('22.11.2026', o('31.12.2026', '01.01.2026')), ['31.12.2028', '30.09.2028', null, []]);
eq('début 01.07.2025, échéance 31.12 : pas avant 30.06.2028 → 31.12.2028', C('22.11.2026', o('31.12.2026', '01.07.2025')), ['31.12.2028', '30.09.2028', null, []]);
eq('début 01.01.2024 : 3e année finit 31.12.2026, délai manqué', C('22.11.2026', o('31.12.2026', '01.01.2024')), ['31.12.2027', '30.09.2027', '31.12.2026', []]);
eq('début 01.01.2024, testé le 15.09.2026', C('15.09.2026', o('31.12.2026', '01.01.2024')), ['31.12.2026', '30.09.2026', null, []]);
eq('début inconnu : incertain', C('22.11.2026', o('31.12.2026', null)), ['31.12.2027', '30.09.2027', '31.12.2026', ['debut']]);
eq('CG annuelles, préavis 1 mois', C('22.11.2026', o('31.12.2026', '01.01.2026', { annuel: true, preavis: 1 })), ['31.12.2026', '30.11.2026', null, ['preavis']]);
eq('échéance 31.03, contrat ancien', C('22.11.2026', o('31.03.2027', '01.04.2010')), ['31.03.2027', '31.12.2026', null, []]);
eq('échéance 29.02.2028 (bissextile)', C('01.11.2027', o('29.02.2028', '01.03.2015')), ['29.02.2028', '30.11.2027', null, []]);
eq('échéance 28.02 (fin de mois) → 29.02.2028', C('01.12.2027', o('28.02.2027', '01.03.2015')), ['28.02.2029', '30.11.2028', '29.02.2028', []]);
eq('sans échéance, début 15.04.2020 → échéance 14.04', C('22.11.2026', o(null, '15.04.2020')), ['14.04.2027', '14.01.2027', null, []]);
eq('ni échéance ni début', C('22.11.2026', o(null, null)), [null, null, null, ['echeance']]);
eq('échéance saisie dans le passé lointain', C('22.11.2026', o('31.12.2019', '01.01.2010')), ['31.12.2027', '30.09.2027', '31.12.2026', []]);
console.log(`${n - ko}/${n} tests réussis`); process.exit(ko ? 1 : 0);
