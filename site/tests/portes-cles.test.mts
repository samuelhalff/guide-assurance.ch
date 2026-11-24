// node tests/portes-cles.test.mts : la copie légère des portes (shared/demande/portes-cles.ts, lue par le site) dit la même chose que portes.ts
import * as L from '../../shared/demande/portes-cles.ts';
import * as P from '../../shared/demande/portes.ts';
let n = 0, ko = 0;
function eq(nom: string, got: unknown, exp: unknown) { n++; if (JSON.stringify(got) !== JSON.stringify(exp)) { ko++; console.log('ÉCHEC', nom, '\n  obtenu ', got, '\n  attendu', exp); } }
eq('PORTES', L.PORTES, P.PORTES);
eq('PORTE_RAPPEL', L.PORTE_RAPPEL, P.PORTE_RAPPEL);
eq('PORTES_FORMULAIRE', L.PORTES_FORMULAIRE, P.PORTES_FORMULAIRE);
eq('RAPPEL_SUJET_DEFAUT', L.RAPPEL_SUJET_DEFAUT, P.RAPPEL_SUJET_DEFAUT);
eq('PREFILL_STORAGE_KEY', L.PREFILL_STORAGE_KEY, P.PREFILL_STORAGE_KEY);
eq('portes de PORTES_DEF', Object.keys(P.PORTES_DEF), [...L.PORTES]);
console.log(ko ? `${ko} échec(s) sur ${n}` : `portes-cles : ${n} contrôles OK`);
if (ko) process.exit(1);
