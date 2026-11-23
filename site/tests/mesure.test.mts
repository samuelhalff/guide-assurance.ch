// node tests/mesure.test.mts : consentement par défaut (script du <head>), persistance PostHog, source IA, UTM (src/lib/mesure-regles.ts)
import vm from 'node:vm';
import * as M from '../src/lib/mesure-regles.ts';
let n = 0, ko = 0;
function eq(nom: string, got: unknown, exp: unknown) { n++; if (JSON.stringify(got) !== JSON.stringify(exp)) { ko++; console.log('ÉCHEC', nom, '\n  obtenu ', got, '\n  attendu', exp); } }

/* Exécute le script du <head> dans un bac à sable et rend le dataLayer. */
function executer(opts: { choix?: string | null; referent?: string; search?: string; dejaVu?: boolean } = {}) {
  const local = new Map<string, string>(opts.choix ? [['ga-consentement', opts.choix]] : []);
  const session = new Map<string, string>(opts.dejaVu ? [['ga-ia-vu', '1']] : []);
  const stockage = (m: Map<string, string>) => ({ getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, String(v)) });
  const ecoute: (() => void)[] = [];
  const ctx: Record<string, unknown> = {
    localStorage: stockage(local), sessionStorage: stockage(session), URLSearchParams, URL,
    location: { search: opts.search ?? '' },
    document: { referrer: opts.referent ?? '', readyState: 'loading', createElement: () => ({}), head: { appendChild() {} } },
    addEventListener: (_: string, f: () => void) => ecoute.push(f),
  };
  ctx.window = ctx;
  vm.runInNewContext(M.scriptAmorce('GTM-TEST', 'ga-consentement'), ctx);
  return { dl: (ctx.dataLayer as unknown[]).map((a) => (a && typeof a === 'object' && 'length' in (a as object) ? Array.from(a as ArrayLike<unknown>) : a)), session };
}
const consent = (dl: unknown[], type: string) => dl.filter((a) => Array.isArray(a) && a[0] === 'consent' && a[1] === type).map((a) => (a as unknown[])[2] as Record<string, unknown>);

eq('script vide sans GTM', M.scriptAmorce('', 'x'), '');
{
  const { dl } = executer();
  const d = consent(dl, 'default');
  eq('un seul défaut : tout accordé partout, personnalisation comprise, sans région', d, [M.ACCORDE]);
  eq('aucun update sans choix', consent(dl, 'update').length, 0);
  eq('ads_data_redaction', dl.some((a) => Array.isArray(a) && a[0] === 'set' && a[1] === 'ads_data_redaction' && a[2] === true), true);
  eq('gtm.js pas encore injecté (attend load)', dl.some((a) => (a as Record<string, unknown>)?.event === 'gtm.js'), false);
}
{
  const r = M.consentementsParDefaut(M.EEE_RU);
  eq('opt-in régional rétablissable : défaut refusé limité aux régions, avant le général', [r.length, r[0].analytics_storage, r[0].ad_personalization, r[0].wait_for_update, (r[0].region as string[]).includes('FR'), (r[0].region as string[]).includes('CH'), r[1]], [2, 'denied', 'denied', 500, true, false, M.ACCORDE]);
}
eq('choix oui : update tout accordé', consent(executer({ choix: 'oui' }).dl, 'update'), [M.ACCORDE]);
eq('choix non : update tout refusé', consent(executer({ choix: 'non' }).dl, 'update'), [M.REFUSE]);
eq('choix invalide : aucun update', consent(executer({ choix: 'peut-être' }).dl, 'update').length, 0);
{
  const { dl, session } = executer({ referent: 'https://chatgpt.com/' });
  eq('IA : propriété utilisateur', dl.some((a) => Array.isArray(a) && a[0] === 'set' && a[1] === 'user_properties' && (a[2] as Record<string, unknown>).ai_source === 'chatgpt'), true);
  eq('IA : paramètre d’événement', dl.some((a) => Array.isArray(a) && a[0] === 'set' && (a[1] as Record<string, unknown>)?.ai_source === 'chatgpt'), true);
  eq('IA : marque de session posée', session.get('ga-ia-vu'), '1');
  eq('IA : seulement à la première page', executer({ referent: 'https://chatgpt.com/', dejaVu: true }).dl.some((a) => Array.isArray(a) && a[1] === 'user_properties'), false);
  eq('IA : utm_source', executer({ search: '?utm_source=perplexity' }).dl.some((a) => Array.isArray(a) && a[1] === 'user_properties' && (a[2] as Record<string, unknown>).ai_source === 'perplexity'), true);
  eq('pas d’IA depuis Google', executer({ referent: 'https://www.google.com/' }).dl.some((a) => Array.isArray(a) && a[1] === 'user_properties'), false);
}

/* Persistance PostHog et enregistrement */
eq('sans choix : persistant (ignorer le bandeau vaut acceptation)', M.persistantParDefaut(null), true);
eq('accepté : persistant', M.persistantParDefaut('oui'), true);
eq('refusé : mémoire', M.persistantParDefaut('non'), false);
eq('replay : guide', M.replayAutorise('/assurance-maladie/'), true);
eq('replay : accueil', M.replayAutorise('/'), true);
eq('replay : demande-envoyee autorisée', M.replayAutorise('/demande-envoyee/'), true);
eq('replay : /demande/ exclu', M.replayAutorise('/demande/'), false);
eq('replay : /demande/rappel/ exclu', M.replayAutorise('/demande/rappel/'), false);
eq('replay : /en/request/call-back/ exclu', M.replayAutorise('/en/request/call-back/'), false);

/* Source IA */
const ia: [string, string | null, string | null][] = [
  ['https://chatgpt.com/', null, 'chatgpt'], ['https://chat.openai.com/c/1', null, 'chatgpt'], ['https://www.perplexity.ai/search?q=x', null, 'perplexity'],
  ['https://claude.ai/chat/1', null, 'claude'], ['https://copilot.microsoft.com/', null, 'copilot'], ['https://gemini.google.com/app', null, 'gemini'],
  ['https://chat.deepseek.com/', null, 'deepseek'], ['https://chat.mistral.ai/', null, 'mistral'],
  ['https://www.google.com/', null, null], ['https://www.bing.com/', null, null], ['', null, null], ['pas une adresse', null, null],
  ['', 'chatgpt.com', 'chatgpt'], ['', 'ChatGPT', 'chatgpt'], ['', 'newsletter', null], ['https://notclaude.ai.example.com/', null, null],
  ['https://evilchatgpt.com/', null, null],
];
for (const [r, u, exp] of ia) eq(`sourceIA(${r || '∅'}, ${u})`, M.sourceIA(r, u), exp);

/* UTM et téléchargements */
eq('utm', M.utmDepuis('?utm_source=x&utm_medium=y&autre=z'), { utm_source: 'x', utm_medium: 'y' });
eq('sans utm', M.utmDepuis('?q=1'), null);
eq('utm tronqué à 100', M.utmDepuis('?utm_campaign=' + 'a'.repeat(300))?.utm_campaign.length, 100);
eq('pdf', M.extensionTelechargement('/kit-rh/guide-assurance-kit-rh-fr.pdf'), 'pdf');
eq('csv', M.extensionTelechargement('/data/primes-2027-regions.csv'), 'csv');
eq('page', M.extensionTelechargement('/assurance-maladie/'), null);

/* Canal d'acquisition au premier contact */
const H = 'guide-assurance.ch';
const canaux: [string, string, string][] = [
  ['https://www.google.com/', '', 'google'], ['https://www.google.ch/', '', 'google'], ['android-app://com.google.android.googlequicksearchbox/', '', 'google'],
  ['https://www.bing.com/search?q=x', '', 'bing'], ['https://duckduckgo.com/', '', 'autre_recherche'], ['https://www.ecosia.org/', '', 'autre_recherche'], ['https://search.brave.com/', '', 'autre_recherche'],
  ['https://chatgpt.com/', '', 'ia'], ['', '?utm_source=chatgpt.com', 'ia'], ['https://www.perplexity.ai/', '', 'ia'], ['https://gemini.google.com/app', '', 'ia'],
  ['https://copilot.microsoft.com/', '', 'ia'], ['https://claude.ai/', '', 'ia'],
  ['https://www.facebook.com/', '', 'reseau_social'], ['https://t.co/abc', '', 'reseau_social'], ['https://www.linkedin.com/', '', 'reseau_social'], ['', '?utm_source=linkedin&utm_medium=social', 'reseau_social'],
  ['https://www.comparis.ch/forum', '', 'referent'], ['', '?utm_source=newsletter&utm_medium=email', 'referent'],
  ['', '', 'direct'], ['https://guide-assurance.ch/assurance-maladie/', '', 'direct'], ['https://www.guide-assurance.ch/', '', 'direct'], ['pas une adresse', '', 'direct'],
  ['https://www.google.com/', '?gclid=abc', 'payant'], ['', '?utm_source=google&utm_medium=cpc', 'payant'], ['https://www.bing.com/', '?msclkid=1', 'payant'], ['', '?gbraid=x', 'payant'],
  ['', '?utm_source=google&utm_medium=organic', 'google'],
];
for (const [r, q, exp] of canaux) eq(`canal(${r || '∅'}, ${q || '∅'})`, M.canalAcquisition(r, q, H), exp);
eq('attribution complète (IA par utm)', M.attributionDepuis('', '?utm_source=chatgpt.com&utm_medium=referral', '/assurance-maladie/', H),
  { canal: 'ia', page_arrivee: '/assurance-maladie/', utm_source: 'chatgpt.com', utm_medium: 'referral', ai_source: 'chatgpt' });
eq('attribution complète (google)', M.attributionDepuis('https://www.google.ch/', '', '/', H), { canal: 'google', page_arrivee: '/', referent_domaine: 'google.ch' });
eq('attribution : chemin seul tronqué, jamais la requête', M.attributionDepuis('', '?q=secret', '/' + 'a'.repeat(300), H).page_arrivee.length, 100);
eq('attribution : référent du site ignoré', M.attributionDepuis('https://guide-assurance.ch/x/', '', '/y/', H).referent_domaine, undefined);
/* Lecture : clés connues seulement, rien d'autre ne passe (pas de valeur saisie possible). */
eq('attributionLue filtre', M.attributionLue(JSON.stringify({ canal: 'google', page_arrivee: '/', nom: 'Jean', email: 'a@b.ch', utm_source: 'x', n: 3 })), { canal: 'google', page_arrivee: '/', utm_source: 'x' });
eq('attributionLue vide', M.attributionLue(null), {});
eq('attributionLue illisible', M.attributionLue('{'), {});
eq('attributionLue sans canal', M.attributionLue(JSON.stringify({ page_arrivee: '/' })), {});
/* demande_envoyee : mêmes propriétés que rappel_ouvert et assistant_vers_demande, propriétés de l'événement prioritaires. */
{
  const a = M.attributionLue(JSON.stringify(M.attributionDepuis('https://www.google.com/', '?utm_campaign=lamal', '/primes/', H)));
  const env = M.proprietesConversion('demande_envoyee', { porte: 'lamal' }, a);
  eq('demande_envoyee porte l\'attribution', env, { canal: 'google', referent_domaine: 'google.com', page_arrivee: '/primes/', utm_campaign: 'lamal', porte: 'lamal' });
  const rap = M.proprietesConversion('rappel_ouvert', { emplacement: 'tete' }, a) as Record<string, unknown>;
  const ast = M.proprietesConversion('assistant_vers_demande', { porte: 'lamal', formulaire: 'rappel' }, a) as Record<string, unknown>;
  const cle = (o: Record<string, unknown>) => ['canal', 'page_arrivee', 'utm_campaign', 'referent_domaine'].map((k) => o[k]);
  eq('mêmes propriétés d\'attribution sur les trois conversions', [cle(rap), cle(ast)], [cle(env as Record<string, unknown>), cle(env as Record<string, unknown>)]);
  eq('propriété propre prioritaire', (M.proprietesConversion('demande_envoyee', { canal: 'x' }, a) as Record<string, unknown>).canal, 'x');
  eq('événement hors conversion inchangé', M.proprietesConversion('faq_ouverte', { question_index: 1 }, a), { question_index: 1 });
  eq('sans attribution (refus) : inchangé', M.proprietesConversion('demande_envoyee', { porte: 'lamal' }, {}), { porte: 'lamal' });
}

console.log(ko ? `${ko}/${n} échecs` : `mesure : ${n} vérifications OK`);
if (ko) process.exit(1);
