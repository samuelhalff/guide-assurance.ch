// node tests/ics.test.mts : rappels .ics (RFC 5545), src/lib/ics.ts
import * as I from '../src/lib/ics.ts';
const p = (s: string) => { const [d, m, y] = s.split('.').map(Number); return new Date(y, m - 1, d); };
let n = 0, ko = 0;
function eq(nom: string, got: unknown, exp: unknown) { n++; if (JSON.stringify(got) !== JSON.stringify(exp)) { ko++; console.log('ÉCHEC', nom, '\n  obtenu ', got, '\n  attendu', exp); } }
const enc = new TextEncoder();

/* Déplie un fichier .ics (RFC 5545 §3.1) */
const deplier = (s: string) => s.replace(/\r\n /g, '');
function structure(s: string, nom: string) {
  eq(`${nom} : finit par CRLF`, s.endsWith('\r\n'), true);
  eq(`${nom} : aucun LF isolé`, /[^\r]\n/.test(s), false);
  const lignes = s.split('\r\n').slice(0, -1);
  eq(`${nom} : lignes ≤ 75 octets`, lignes.filter((l) => enc.encode(l).length > 75), []);
  eq(`${nom} : aucun caractère de remplacement (UTF-8 non coupé)`, s.includes('�'), false);
  const un = deplier(s).split('\r\n');
  const compte = (re: RegExp) => un.filter((l) => re.test(l)).length;
  eq(`${nom} : BEGIN/END VEVENT équilibrés`, compte(/^BEGIN:VEVENT$/), compte(/^END:VEVENT$/));
  eq(`${nom} : BEGIN/END VALARM équilibrés`, compte(/^BEGIN:VALARM$/), compte(/^END:VALARM$/));
  const ev = compte(/^BEGIN:VEVENT$/);
  eq(`${nom} : un UID par événement`, compte(/^UID:.+@guide-assurance\.ch$/), ev);
  eq(`${nom} : un DTSTAMP UTC par événement`, compte(/^DTSTAMP:\d{8}T\d{6}Z$/), ev);
  eq(`${nom} : DTSTART date`, compte(/^DTSTART;VALUE=DATE:\d{8}$/), ev);
  eq(`${nom} : VERSION 2.0 et PRODID`, [compte(/^VERSION:2\.0$/), compte(/^PRODID:/)], [1, 1]);
  const uids = un.filter((l) => l.startsWith('UID:'));
  eq(`${nom} : UID uniques`, new Set(uids).size, uids.length);
  return un;
}

// Échappement et repli
eq('échappement', I.echapper('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
const longue = 'DESCRIPTION:' + 'é'.repeat(100);
const rep = I.replier(longue);
eq('repli : chaque ligne ≤ 75 octets', rep.split('\r\n').every((l) => enc.encode(l).length <= 75), true);
eq('repli : suite commence par une espace', rep.split('\r\n').slice(1).every((l) => l.startsWith(' ')), true);
eq('repli : dépliage rend la ligne', rep.replace(/\r\n /g, ''), longue);
eq('ligne courte intacte', I.replier('SUMMARY:x'), 'SUMMARY:x');
eq('repli : 75 octets ASCII pile', I.replier('X'.repeat(75)), 'X'.repeat(75));
eq('repli : 76 octets ASCII', I.replier('X'.repeat(76)), 'X'.repeat(75) + '\r\n X');

// Déclencheurs
eq('14 jours avant à 9 h', I.declencheur({ joursAvant: 14 }), '-P13DT15H');
eq('le jour même à 9 h', I.declencheur({ joursAvant: 0 }), 'PT9H');
eq('1 jour avant à 8 h', I.declencheur({ joursAvant: 1, heure: 8 }), '-P0DT16H');

// Dates
eq('dateIcs', I.dateIcs(p('30.11.2026')), '20261130');
eq('horodatage UTC', I.horodatageIcs(new Date(Date.UTC(2026, 10, 23, 6, 5, 9))), '20261123T060509Z');
eq('prochain 30.11 depuis 23.11.2026', I.dateIcs(I.prochain(p('23.11.2026'), 10, 30)), '20261130');
eq('prochain 30.11 le jour même', I.dateIcs(I.prochain(p('30.11.2026'), 10, 30)), '20261130');
eq('prochain 30.11 depuis 01.12.2026', I.dateIcs(I.prochain(p('01.12.2026'), 10, 30)), '20271130');
eq('prochain 31.03 depuis 23.11.2026', I.dateIcs(I.prochain(p('23.11.2026'), 2, 31)), '20270331');
eq('UID stable', I.uidIcs('LAMal 30 novembre', p('30.11.2026')), 'lamal-30-novembre-20261130@guide-assurance.ch');

// Échéances fixes
const today = p('23.11.2026');
const maintenant = new Date(Date.UTC(2026, 10, 23, 10, 0, 0));
const fixes = (['lamal', 'semestre', '3a'] as const).map((t) => I.evenementFixe(t, today, 'fr'));
eq('dates fixes', fixes.map((e) => I.dateIcs(e.date)), ['20261130', '20270331', '20261231']);
const cal = I.calendrierIcs(fixes, { maintenant });
const un = structure(cal, 'fixes FR');
eq('RRULE annuelle sur les trois', un.filter((l) => l === 'RRULE:FREQ=YEARLY').length, 3);
eq('DTEND lendemain du 31.12', un.includes('DTEND;VALUE=DATE:20270101'), true);
eq('description cite l’article (LAMal)', un.some((l) => l.startsWith('DESCRIPTION:') && l.includes('art. 7\\, al. 2\\, LAMal')), true);
eq('lien vers le rappel dans la description', un.some((l) => l.startsWith('DESCRIPTION:') && l.includes('/demande/rappel/')), true);
eq('alarme 14 jours avant', un.includes('TRIGGER:-P13DT15H'), true);
eq('DTSTAMP = maintenant', un.filter((l) => l.startsWith('DTSTAMP:'))[0], 'DTSTAMP:20261123T100000Z');
structure(I.calendrierIcs((['lamal', 'semestre', '3a'] as const).map((t) => I.evenementFixe(t, today, 'en')), { maintenant, langue: 'EN' }), 'fixes EN');

// Lettre
const lca = I.evenementLettre('lca', p('30.09.2027'), p('31.12.2027'), 'fr');
eq('lettre LCA : date', I.dateIcs(lca.date), '20270930');
eq('lettre LCA : pas de répétition', lca.annuel, undefined);
const ul = structure(I.calendrierIcs([lca], { maintenant }), 'lettre');
eq('lettre LCA : fin citée', ul.some((l) => l.includes('31 décembre 2027')), true);

// Contrats saisis
const c1 = I.evenementContrat({ type: 'auto', echeance: p('31.12.2026'), preavis: 3 }, 0, today, 'fr');
eq('auto 31.12.2026, préavis 3 mois, le 23.11.2026 → 30.09.2027 (délai 2026 passé)', I.dateIcs(c1.date), '20270930');
const c2 = I.evenementContrat({ type: 'menage', echeance: p('31.03.2027'), preavis: 3 }, 1, today, 'fr');
eq('ménage 31.03.2027 → 31.12.2026', I.dateIcs(c2.date), '20261231');
const c3 = I.evenementContrat({ type: 'autre', nom: 'Moto, Yamaha', echeance: p('31.05.2027'), preavis: 1 }, 2, today, 'fr');
eq('autre 31.05.2027 préavis 1 → 30.04.2027', I.dateIcs(c3.date), '20270430');
eq('nom saisi repris', c3.titre.startsWith('Moto, Yamaha'), true);
const c4 = I.evenementContrat({ type: 'complementaire', echeance: p('29.05.2028'), preavis: 3 }, 3, today, 'fr');
eq('29.02 ramené au 28.02', I.dateIcs(c4.date), '20280228');
const c5 = I.evenementContrat({ type: 'auto', echeance: p('15.01.2020'), preavis: 3 }, 4, today, 'fr');
eq('échéance ancienne → 15.10.2027', I.dateIcs(c5.date), '20271015');
const uc = structure(I.calendrierIcs([c1, c2, c3, c4, c5], { maintenant }), 'contrats');
eq('virgule du nom échappée', uc.some((l) => l.startsWith('SUMMARY:Moto\\, Yamaha')), true);
eq('alarme un mois avant', uc.includes('TRIGGER:-P29DT15H'), true);

console.log(`${n - ko}/${n} tests réussis`); process.exit(ko ? 1 : 0);
