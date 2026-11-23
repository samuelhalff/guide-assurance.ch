// node tests/html.test.mts : contrôles SEO/GEO sur le HTML généré (site/out), spec docs/seo-geo-spec.md §1.4, §1.5, §7.2
// Lancer après `npm run build`. Aucune dépendance : expressions régulières bornées au <head> ou au <body> du HTML de Next.
//  1. canonical : un seul, dans <head>, absolu https://guide-assurance.ch, auto-référent (forme avec barre finale).
//     Politique : une page indexable en a un ; une page noindex peut ne pas en avoir, mais si elle en a un, il est auto-référent.
//  2. hreflang : dans <head>, chaque valeur une fois, jeu complet {fr-CH, en, x-default}, x-default = URL FR, la page figure
//     dans son propre jeu, la page cible existe dans out/, est indexable et renvoie le même jeu. Une page noindex n'en émet pas.
//  3. JSON-LD : parsable ; dans une page, un même @id n'est défini qu'une fois (ou à l'identique) ; une référence {"@id"} vers
//     un fragment de la page se résout dans la page, vers un autre fragment du site se résout ailleurs dans le site ;
//     sur tout le site, un même @id porte toujours le même @type.
//  4. FAQPage : chaque Question.name est le texte exact d'un titre (h2/h3) visible et acceptedAnswer.text le texte exact des
//     paragraphes qui suivent ce titre dans sa section (joints par une espace, ligne de sources <p class="src"> exclue).
//  5. sitemap.xml sans <priority> ni <changefreq>, chaque <loc> existe, est indexable et auto-canonique ; chaque page indexable
//     figure dans le sitemap ; llms.txt et llms-full.txt n'ont que des liens absolus et aucun gabarit non interpolé.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const t0 = performance.now();
const SITE = 'https://guide-assurance.ch';
const OUT = process.env.HTML_OUT ?? join(import.meta.dirname, '..', 'out'); // HTML_OUT : autre dossier (tests du test)
if (!existsSync(join(OUT, 'index.html'))) { console.log(`ÉCHEC : ${OUT}/index.html absent, lancer npm run build d'abord`); process.exit(1); }

const echecs = new Map<string, string[]>(); // règle → messages
const ko = (regle: string, page: string, msg: string) => { if (!echecs.has(regle)) echecs.set(regle, []); echecs.get(regle)!.push(`${page} : ${msg}`); };
const R1 = '1. canonical', R2 = '2. hreflang', R3 = '3. JSON-LD', R4 = '4. FAQPage visible', R5 = '5. sitemap / llms.txt';

/* ---------- Lecture des pages ---------- */
function* fichiers(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== '_next') yield* fichiers(p); }
    else if (e.name.endsWith('.html')) yield p;
  }
}
// out/index.html → /, out/foo/index.html → /foo/, out/404.html → /404.html (servie telle quelle par le proxy)
const urlDe = (f: string) => { const r = relative(OUT, f).split('\\').join('/'); return '/' + (r === 'index.html' ? '' : r.endsWith('/index.html') ? r.slice(0, -10) : r); };

type Lien = Record<string, string>;
type Page = { url: string; html: string; head: string; body: string; apres: string; noindex: boolean; lang: string; liens: Lien[]; liensApres: Lien[]; ld: unknown[] };
const attrs = (tag: string): Lien => { const a: Lien = {}; for (const m of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) a[m[1].toLowerCase()] = decode(m[2]); return a; };
const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
function decode(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e.toLowerCase()] ?? m);
}
// Texte visible : commentaires React (<!-- -->) et balises retirés, entités décodées, espaces insécables (U+00A0, U+202F, U+2009) → espace
const norm = (s: string) => s.replace(/[\u00a0\u202f\u2009\s]+/g, ' ').trim();
const texte = (html: string) => norm(decode(html.replace(/<!--[\s\S]*?-->/g, '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')));

const pages = new Map<string, Page>();
for (const f of fichiers(OUT)) {
  const html = readFileSync(f, 'utf8');
  const url = urlDe(f);
  if (!/<head[\s>]/.test(html)) continue; // fichier de vérification Search Console (google….html), pas une page
  const iH = html.search(/<head[\s>]/), fH = html.indexOf('</head>');
  const head = html.slice(iH, fH), apres = html.slice(fH);
  const iB = apres.search(/<body[\s>]/);
  // Corps sans scripts (charge RSC self.__next_f, JSON-LD), styles ni gabarits : ce que voit le lecteur
  const body = apres.slice(iB).replace(/<(script|style|template|noscript)\b[\s\S]*?<\/\1>/gi, '');
  const robots = [...head.matchAll(/<meta\b[^>]*\bname="robots"[^>]*>/gi)].map((m) => attrs(m[0]).content ?? '');
  const ld: unknown[] = [];
  for (const m of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { ld.push(JSON.parse(m[1])); } catch (e) { ko(R3, url, `JSON-LD non parsable (${(e as Error).message})`); }
  }
  pages.set(url, {
    url, html, head, body, apres, ld,
    noindex: robots.some((c) => /noindex/i.test(c)),
    lang: /<html\b[^>]*\blang="([^"]+)"/.exec(html)?.[1] ?? '',
    liens: [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0])),
    liensApres: [...apres.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0])),
  });
}

/* ---------- 1. canonical ---------- */
for (const p of pages.values()) {
  const can = p.liens.filter((l) => l.rel === 'canonical');
  const canApres = p.liensApres.filter((l) => l.rel === 'canonical');
  if (canApres.length) ko(R1, p.url, `${canApres.length} canonical après </head>`);
  if (can.length > 1) ko(R1, p.url, `${can.length} canonical dans <head> (${can.map((l) => l.href).join(', ')})`);
  if (!can.length) { if (!p.noindex) ko(R1, p.url, 'page indexable sans canonical'); continue; }
  const href = can[0].href ?? '';
  if (!href.startsWith(SITE + '/')) ko(R1, p.url, `canonical non absolu ou hors domaine : ${href}`);
  else if (href !== SITE + p.url) ko(R1, p.url, `canonical ${href} ≠ URL de la page ${SITE + p.url}`);
}

/* ---------- 2. hreflang ---------- */
const JEU = ['en', 'fr-CH', 'x-default'];
const alternates = (p: Page) => p.liens.filter((l) => l.rel === 'alternate' && l.hreflang);
const jeuDe = (p: Page) => Object.fromEntries(alternates(p).map((l) => [l.hreflang, l.href]));
for (const p of pages.values()) {
  const alt = alternates(p);
  const altApres = p.liensApres.filter((l) => l.rel === 'alternate' && l.hreflang);
  if (altApres.length) ko(R2, p.url, `${altApres.length} hreflang après </head>`);
  if (!alt.length) continue;
  if (p.noindex) ko(R2, p.url, 'page noindex qui émet des hreflang (spec §1.5)');
  const valeurs = alt.map((l) => l.hreflang);
  const doublons = valeurs.filter((v, i) => valeurs.indexOf(v) !== i);
  if (doublons.length) ko(R2, p.url, `hreflang en double : ${[...new Set(doublons)].join(', ')}`);
  const jeu = [...new Set(valeurs)].sort();
  if (jeu.join() !== JEU.join()) ko(R2, p.url, `jeu hreflang ${jeu.join(', ')} ≠ ${JEU.join(', ')}`);
  const j = jeuDe(p);
  if (j['x-default'] !== j['fr-CH']) ko(R2, p.url, `x-default ${j['x-default']} ≠ URL FR ${j['fr-CH']}`);
  const propre = p.lang.startsWith('en') ? j.en : j['fr-CH'];
  if (propre !== SITE + p.url) ko(R2, p.url, `hreflang de sa propre langue (${p.lang}) = ${propre}, pas l'URL de la page`);
  const vus = new Set<string>();
  for (const [v, href] of Object.entries(j)) {
    if (!href?.startsWith(SITE + '/')) { ko(R2, p.url, `hreflang ${v} non absolu : ${href}`); continue; }
    if (vus.has(href)) continue; vus.add(href); // x-default et fr-CH visent la même page : un seul contrôle
    const cible = pages.get(href.slice(SITE.length));
    if (!cible) { ko(R2, p.url, `hreflang ${v} → ${href} : page absente de out/`); continue; }
    if (cible === p) continue;
    if (cible.noindex) ko(R2, p.url, `hreflang ${v} → ${href} : cible noindex`);
    const jc = jeuDe(cible);
    if (JSON.stringify(Object.entries(jc).sort()) !== JSON.stringify(Object.entries(j).sort()))
      ko(R2, p.url, `pas de réciprocité avec ${href} (son jeu : ${JSON.stringify(jc)})`);
  }
}

/* ---------- 3. JSON-LD ---------- */
type Noeud = Record<string, unknown>;
const stable = (v: unknown): string => Array.isArray(v) ? `[${v.map(stable).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable((v as Noeud)[k])).join(',')}}` : JSON.stringify(v);
function parcourir(v: unknown, f: (n: Noeud) => void) {
  if (Array.isArray(v)) v.forEach((x) => parcourir(x, f));
  else if (v && typeof v === 'object') { f(v as Noeud); Object.values(v).forEach((x) => parcourir(x, f)); }
}
const typesParId = new Map<string, Map<string, Set<string>>>(); // @id → @type → pages
const definisSite = new Set<string>();
const refsSite: [string, string][] = []; // [page, @id] vers un fragment d'une autre page du site
for (const p of pages.values()) {
  const defs = new Map<string, string>(), refs: string[] = [];
  parcourir(p.ld, (n) => {
    const id = n['@id'];
    if (typeof id !== 'string') return;
    const cles = Object.keys(n);
    if (cles.length === 1) { refs.push(id); return; }
    const s = stable(n);
    if (defs.has(id) && defs.get(id) !== s) ko(R3, p.url, `@id ${id} défini deux fois avec un contenu différent`);
    defs.set(id, s); definisSite.add(id);
    if (n['@type'] !== undefined) {
      const t = [n['@type']].flat().map(String).sort().join('+');
      if (!typesParId.has(id)) typesParId.set(id, new Map());
      const m = typesParId.get(id)!; if (!m.has(t)) m.set(t, new Set()); m.get(t)!.add(p.url);
    }
  });
  for (const r of refs) {
    const absolu = r.startsWith('#') ? SITE + p.url + r : r;
    if (absolu.startsWith(SITE + p.url + '#')) { if (!defs.has(r) && !defs.has(absolu)) ko(R3, p.url, `référence {"@id": "${r}"} non résolue dans la page`); }
    else if (absolu.startsWith(SITE + '/') && absolu.includes('#')) refsSite.push([p.url, absolu]);
  }
}
for (const [page, id] of refsSite) if (!definisSite.has(id)) ko(R3, page, `référence {"@id": "${id}"} définie nulle part sur le site`);
for (const [id, m] of typesParId) if (m.size > 1)
  ko(R3, id, `@type incohérent selon les pages : ${[...m].map(([t, ps]) => `${t} (${[...ps].slice(0, 3).join(', ')}${ps.size > 3 ? ', …' : ''})`).join(' / ')}`);

/* ---------- 4. FAQPage : texte visible exact ---------- */
// Rendu (faq-sections.tsx, guide-page.tsx) : <section><h2|h3>question</h2|h3><p>réponse</p>…[<p class="src">sources</p>]</section>
type Bloc = { q: string; a: string };
function blocsFaq(body: string): Bloc[] {
  const blocs: Bloc[] = [];
  for (const m of body.matchAll(/<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const suite = body.slice(m.index! + m[0].length);
    const fin = suite.search(/<h[1-6]\b|<\/section>|<section\b/i);
    const zone = fin < 0 ? suite : suite.slice(0, fin);
    const ps = [...zone.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)].filter((x) => !/class="[^"]*\bsrc\b/.test(x[1])).map((x) => texte(x[2]));
    blocs.push({ q: texte(m[2]), a: ps.join(' ') });
  }
  return blocs;
}
let nbQuestions = 0;
for (const p of pages.values()) {
  const faqs: Noeud[] = [];
  parcourir(p.ld, (n) => { if ([n['@type']].flat().includes('FAQPage')) faqs.push(n); });
  if (!faqs.length) continue;
  const blocs = blocsFaq(p.body);
  for (const faq of faqs) for (const q of [faq.mainEntity].flat() as Noeud[]) {
    nbQuestions++;
    const nom = norm(String(q?.name ?? '')), rep = norm(String((q?.acceptedAnswer as Noeud)?.text ?? ''));
    const b = blocs.filter((x) => x.q === nom);
    if (!b.length) { ko(R4, p.url, `question absente des titres visibles : « ${nom} »`); continue; }
    if (!b.some((x) => x.a === rep)) {
      const vu = b[0].a; let i = 0; while (i < vu.length && vu[i] === rep[i]) i++;
      ko(R4, p.url, `réponse différente pour « ${nom.slice(0, 60)} » à partir du caractère ${i} :\n      JSON-LD : …${rep.slice(Math.max(0, i - 20), i + 60)}\n      visible : …${vu.slice(Math.max(0, i - 20), i + 60)}`);
    }
  }
}

/* ---------- 5. sitemap, llms.txt ---------- */
const sitemap = readFileSync(join(OUT, 'sitemap.xml'), 'utf8');
for (const tag of ['priority', 'changefreq']) { const n = sitemap.split(`<${tag}>`).length - 1; if (n) ko(R5, '/sitemap.xml', `${n} balises <${tag}> (spec §2.1 : <loc> et <lastmod> seulement)`); }
const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => decode(m[1]));
for (const loc of locs) {
  const p = loc.startsWith(SITE + '/') ? pages.get(loc.slice(SITE.length)) : undefined;
  if (!p) { ko(R5, '/sitemap.xml', `<loc> ${loc} absent de out/`); continue; }
  if (p.noindex) ko(R5, '/sitemap.xml', `<loc> ${loc} est noindex`);
}
const dansSitemap = new Set(locs);
for (const p of pages.values()) if (!p.noindex && !dansSitemap.has(SITE + p.url)) ko(R5, p.url, 'page indexable absente du sitemap');
for (const nom of ['llms.txt', 'llms-full.txt']) {
  const f = join(OUT, nom);
  if (!existsSync(f)) { if (nom === 'llms.txt') ko(R5, '/' + nom, 'absent'); continue; }
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(/\]\(([^)\s]*)\)/g)) if (!/^https:\/\//.test(m[1])) ko(R5, '/' + nom, `lien relatif : ${m[1]}`);
  for (const m of s.matchAll(/\$\{[^}]*\}/g)) ko(R5, '/' + nom, `gabarit non interpolé « ${m[0]} » : …${s.slice(Math.max(0, m.index! - 40), m.index! + 20).replace(/\n/g, ' ')}…`);
}

/* ---------- Bilan ---------- */
const ms = Math.round(performance.now() - t0);
const total = [...echecs.values()].reduce((a, l) => a + l.length, 0);
for (const r of [R1, R2, R3, R4, R5]) {
  const l = echecs.get(r) ?? [];
  console.log(`${l.length ? 'ÉCHEC' : 'OK   '} ${r}${l.length ? ` (${l.length})` : ''}`);
  for (const m of l) console.log('  - ' + m);
}
console.log(`${pages.size} pages, ${nbQuestions} questions FAQ, ${locs.length} URL du sitemap contrôlées en ${ms} ms : ${total ? `${total} échec(s)` : 'tout est conforme'}`);
process.exit(total ? 1 : 0);
