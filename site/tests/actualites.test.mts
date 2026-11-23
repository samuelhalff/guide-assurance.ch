// node tests/actualites.test.mts : filtrage des brouillons (plan du site, flux, llms, index) et vérificateur d’articles.
import { join } from 'node:path';
import * as A from '../src/lib/actualites-core.ts';
import { verifierArticle, nombres } from '../src/lib/verifier-actualite.ts';

let n = 0, ko = 0;
function ok(nom: string, cond: boolean, info?: unknown) { n++; if (!cond) { ko++; console.log('ÉCHEC', nom, info ?? ''); } }
const abs = (p: string) => `https://guide-assurance.ch${p}`;
const F = join(import.meta.dirname, 'fixtures', 'actualites');
const fr = A.lireDossier(join(F, 'fr'), 'fr'), en = A.lireDossier(join(F, 'en'), 'en');

/* ---------- Filtrage ---------- */
ok('fixtures lues', fr.length === 2 && en.length === 1, [fr.length, en.length]);
ok('publies() garde le publié', A.publies(fr).map((a) => a.slug).join() === 'publie');
ok('brouillonsDe()', A.brouillonsDe([...fr, ...en]).length === 2);
const plan = JSON.stringify(A.entreesPlan(fr, en, abs));
ok('plan : article publié présent', plan.includes('/actualites/publie/'));
ok('plan : index FR présent', plan.includes('"https://guide-assurance.ch/actualites/"'));
ok('plan : aucun brouillon', !/secret/.test(plan), plan);
ok('plan : pas d’index EN sans article EN publié', !plan.includes('/en/news/"'), plan);
ok('plan : rien si aucun publié', A.entreesPlan(A.brouillonsDe(fr), en, abs).length === 0);
const rss = A.fluxRss(fr, 'fr', abs, new Date('2026-11-23T00:00:00Z'));
ok('flux : publié présent', rss.includes('Article publié de test'));
ok('flux : brouillon absent', !/secret/i.test(rss));
ok('flux : atom:link self', rss.includes('rel="self"') && rss.includes('/actualites/feed.xml'));
ok('flux EN vide sans brouillon', !/secret/i.test(A.fluxRss(en, 'en', abs)));
const llms = A.lignesLlms(fr, abs).join('\n') + A.textesLlms([...fr, ...en], abs).join('\n');
ok('llms : publié présent', llms.includes('/actualites/publie/'));
ok('llms : aucun brouillon', !/secret|brouillon/i.test(llms), llms);
ok('index : ordre et filtre', A.publies([...fr]).sort(A.parDate).every((a) => a.status === 'published'));

/* ---------- Jetons d’aperçu ---------- */
const cle = 'x'.repeat(64);
const j1 = A.jetonApercu(cle, 'fr', 'brouillon-secret'), j2 = A.jetonApercu(cle, 'en', 'brouillon-secret');
ok('jeton : 32 hex', /^[0-9a-f]{32}$/.test(j1));
ok('jeton : stable', j1 === A.jetonApercu(cle, 'fr', 'brouillon-secret'));
ok('jeton : dépend de la langue et du slug', j1 !== j2 && j1 !== A.jetonApercu(cle, 'fr', 'autre'));
ok('jeton : dépend de la clé', j1 !== A.jetonApercu('y'.repeat(64), 'fr', 'brouillon-secret'));
ok('jeton : ne contient pas le slug', !j1.includes('secret'));

/* ---------- Vérificateur ---------- */
const para = (k: number) => Array.from({ length: k }, (_, i) => `La prime moyenne observée dans le canton reste stable pour la période numéro ${i % 10} selon la source officielle citée plus bas.`).join(' ');
const faqOk = Array.from({ length: 4 }, (_, i) => ({ q: `Question ${i} ?`, a: 'Une réponse complète et neutre, rédigée en phrases entières, qui reprend les chiffres publiés par l’office fédéral et renvoie vers la source officielle pour le détail des montants.' }));
const base = {
  locale: 'fr' as const,
  title: 'Primes 2027 : la hausse par canton',
  description: 'En 2027, la prime moyenne d’un adulte augmente de 3,2 % à 5,9 % selon le canton romand, d’après les chiffres publiés par l’OFSP en septembre.',
  sources: [{ label: 'a', url: 'https://www.bag.admin.ch/a' }, { label: 'b', url: 'https://www.fedlex.admin.ch/b' }, { label: 'c', url: 'https://www.priminfo.admin.ch/' }],
  faq: faqOk,
  markdown: `${para(12)}\n\n## Première question ?\n\n${para(12)}\n\n## Deuxième question ?\n\n${para(12)}\n\n## Troisième question ?\n\n${para(12)}`,
};
const regles = (x: Partial<typeof base>, o = {}) => verifierArticle({ ...base, ...x }, o).map((e) => e.regle);
ok('vérif : article valide', regles({}).length === 0, verifierArticle(base));
ok('vérif : nom du courtier', regles({ markdown: base.markdown + ' ' + ['Lem', 'anis'].join('') + '.' }).includes('mots interdits'));
ok('vérif : West Bay', regles({ markdown: base.markdown + ' West Bay SA.' }).includes('mots interdits'));
ok('vérif : commission', regles({ markdown: base.markdown + ' Une commission est versée.' }).includes('mots interdits'));
ok('vérif : recommandation', regles({ markdown: base.markdown + ' Nous recommandons ce modèle.' }).includes('mots interdits'));
ok('vérif : envoi recommandé permis', regles({ markdown: base.markdown + ' Un envoi recommandé laisse une marge.' }).length === 0);
ok('vérif : nom d’assureur', regles({ markdown: base.markdown + ' Selon Helsana.' }, { noms: ['Helsana'] }).includes('entreprise nommée'));
ok('vérif : tiret long', regles({ markdown: base.markdown + ' Un tiret — ici.' }).includes('typographie'));
ok('vérif : pas X mais Y', regles({ markdown: base.markdown + ' Ce n’est pas une hausse mais une baisse.' }).includes('tournure'));
ok('vérif : espace normale avant :', regles({ markdown: base.markdown + ' Voici le total : 3.' }).includes('espace fine'));
ok('vérif : guillemets sans fine', regles({ markdown: base.markdown + ' Il dit « oui ».' }).includes('espace fine'));
ok('vérif : 2 sources', regles({ sources: base.sources.slice(0, 2) }).includes('sources'));
ok('vérif : sources non officielles', regles({ sources: [{ label: 'x', url: 'https://example.com/a' }, { label: 'y', url: 'https://example.org/b' }, base.sources[0]] }).includes('sources'));
ok('vérif : trop court', regles({ markdown: '## Q ?\n\nCourt.' }).includes('longueur'));
ok('vérif : H2 sans question', regles({ markdown: base.markdown.replace('## Première question ?', '## Première partie') }).includes('structure'));
ok('vérif : H1 dans le corps', regles({ markdown: '# Titre\n\n' + base.markdown }).includes('structure'));
ok('vérif : FAQ trop courte', regles({ faq: faqOk.slice(0, 2) }).includes('faq'));
ok('vérif : chiffres présents dans les sources', regles({}, { corpus: '3.2 5.9 2027' }).length === 0, verifierArticle(base, { corpus: '3.2 5.9' }));
ok('vérif : chiffre inventé', regles({ markdown: base.markdown + ' La hausse atteint 7,4 %.' }, { corpus: '3.2 5.9' }).includes('chiffres sans source'));
ok('nombres : dates ignorées', nombres('le 31 décembre, le 1er janvier, on 30 November, le 29.09.2026').length === 0, nombres('le 31 décembre, le 1er janvier, on 30 November, le 29.09.2026'));
ok('nombres : milliers et virgule', JSON.stringify(nombres('1 743,60 CHF, 3 648 CHF, 0,50 %, art. 64 LAMal, 1er janvier, 3a')) === JSON.stringify(['1743.6', '3648', '0.5']), nombres('1 743,60 CHF, 3 648 CHF, 0,50 %, art. 64 LAMal, 1er janvier, 3a'));

console.log(`actualites : ${n - ko}/${n} OK`);
if (ko) process.exit(1);
