// node tests/telephone.test.mts : numéro de téléphone du formulaire (shared/demande/telephone.ts). Les détails des portes sont testés côté leads.
import { normaliserTelephone as n, formaterTelephone, estTelephoneE164Valide, TELEPHONE_ERREURS } from '../../shared/demande/telephone.ts';
let total = 0, ko = 0;
function eq(nom: string, got: unknown, exp: unknown) { total++; if (JSON.stringify(got) !== JSON.stringify(exp)) { ko++; console.log('ÉCHEC', nom, '\n  obtenu ', got, '\n  attendu', exp); } }
const e164 = (s: string) => { const r = n(s); return r.ok ? r.e164 : r.raison; };

// Suisse : formats nationaux, internationaux, (0), 00
eq('CH mobile national', e164('079 123 45 67'), '+41791234567');
eq('CH mobile points', e164('079.123.45.67'), '+41791234567');
eq('CH +41', e164('+41 79 123 45 67'), '+41791234567');
eq('CH 0041', e164('0041791234567'), '+41791234567');
eq('CH (0)', e164('+41 (0)79 123 45 67'), '+41791234567');
eq('CH 0 après +41', e164('+41 079 123 45 67'), '+41791234567');
eq('CH fixe Genève', e164('022 345 67 89'), '+41223456789');
eq('CH fixe Lausanne', e164('021 345 67 89'), '+41213456789');
eq('CH type mobile', n('078 123 45 67'), { ok: true, e164: '+41781234567', pays: 'CH', type: 'mobile' });
eq('CH type fixe', n('027 345 67 89'), { ok: true, e164: '+41273456789', pays: 'CH', type: 'fixe' });
eq('CH 0900 refusé', e164('0900 123 456'), 'prefixe-ch');
eq('CH 0800 refusé', e164('0800 123 456'), 'prefixe-ch');
eq('070 sans indicatif suisse : français', e164('070 123 45 67'), '+33701234567');
eq('CH trop court', e164('079 123 45'), 'court');
eq('CH trop long', e164('079 123 45 678'), 'long');
eq('CH répétitif', e164('079 999 99 99'), 'repetitif');
eq('CH répétitif 0', e164('022 000 00 00'), 'repetitif');
// France
eq('FR mobile', e164('+33 6 12 34 56 78'), '+33612345678');
eq('FR mobile 07', e164('+33 7 81 23 45 67'), '+33781234567');
eq('FR fixe', e164('+33 4 50 12 34 56'), '+33450123456');
eq('FR 0 après +33', e164('+33 06 12 34 56 78'), '+33612345678');
eq('FR 0033', e164('0033 6 12 34 56 78'), '+33612345678');
eq('FR 08 refusé', e164('+33 8 00 12 34 56'), 'prefixe-fr');
eq('FR national hors indicatif suisse', n('06 52 34 56 78'), { ok: true, e164: '+33652345678', pays: 'FR', type: 'mobile' });
eq('FR fixe national', e164('01 42 34 56 78'), '+33142345678');
eq('06 1… reste suisse (Bâle 061)', e164('061 234 56 78'), '+41612345678');
eq('FR trop court', e164('+33 6 12 34'), 'court');
// Autres pays
eq('DE', e164('+49 151 23456789'), '+4915123456789');
eq('UK', e164('+44 7911 123456'), '+447911123456');
eq('US', e164('+1 415 555 2671'), '+14155552671');
eq('INTL trop court', e164('+12 3456'), 'court');
eq('INTL trop long', e164('+1234567890123456'), 'long');
eq('INTL répétitif', e164('+44 7777 777777'), 'repetitif');
// Saisies invalides
eq('vide', e164('   '), 'vide');
eq('lettres', e164('079 abc'), 'caracteres');
eq('plus au milieu', e164('079+123'), 'caracteres');
eq('sans 0 ni +', e164('791234567'), 'prefixe-ch');
// Contrôle serveur et affichage
eq('E.164 valide', estTelephoneE164Valide('+41791234567'), true);
eq('E.164 non normalisé', estTelephoneE164Valide('+410791234567'), false);
eq('E.164 0900', estTelephoneE164Valide('+41901234567'), false);
eq('format CH', formaterTelephone('+41791234567'), '+41 79 123 45 67');
eq('format FR', formaterTelephone('+33612345678'), '+33 6 12 34 56 78');
eq('messages FR/EN pour chaque raison', Object.values(TELEPHONE_ERREURS).every((m) => m.fr && m.en && !m.fr.includes('—') && !/ [;:?!]/.test(m.fr)), true);

console.log(`${total - ko}/${total} contrôles téléphone OK`);
if (ko) process.exit(1);
