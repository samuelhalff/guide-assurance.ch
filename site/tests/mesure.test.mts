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

console.log(ko ? `${ko}/${n} échecs` : `mesure : ${n} vérifications OK`);
if (ko) process.exit(1);
