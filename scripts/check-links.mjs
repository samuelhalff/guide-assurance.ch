#!/usr/bin/env node
// Liens internes cassés dans le site généré (site/out) : href et src relatifs ou vers https://guide-assurance.ch,
// résolus comme le proxy nginx (try_files $uri $uri/index.html $uri.html). Liens externes non vérifiés (instables).
// Usage : node scripts/check-links.mjs [site/out]   -> liste des liens cassés, code 1 s'il y en a.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix, relative } from "node:path";

const OUT = process.argv[2] || "site/out";
const HOTE = "https://guide-assurance.ch";

function* pages(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* pages(p);
    else if (e.name.endsWith(".html")) yield p;
  }
}

function existe(chemin) {
  const p = join(OUT, decodeURIComponent(chemin));
  if (existsSync(p) && statSync(p).isFile()) return true;
  if (existsSync(join(p, "index.html"))) return true;
  return existsSync(p.replace(/\/$/, "") + ".html");
}

const casses = new Map();
let n = 0;
for (const f of pages(OUT)) {
  const html = readFileSync(f, "utf8");
  const page = "/" + relative(OUT, f).replace(/\\/g, "/");
  for (const m of html.matchAll(/\s(?:href|src)="([^"#?]+)[^"]*"/g)) {
    let u = m[1];
    if (u.startsWith(HOTE)) u = u.slice(HOTE.length) || "/";
    if (/^(?:[a-z]+:|\/\/)/i.test(u) || u === "") continue;
    const abs = u.startsWith("/") ? u : posix.join(posix.dirname(page), u);
    n++;
    if (!existe(abs)) {
      if (!casses.has(abs)) casses.set(abs, new Set());
      casses.get(abs).add(page);
    }
  }
}
console.log(`${n} liens internes vérifiés, ${casses.size} cible(s) introuvable(s)`);
for (const [cible, src] of casses) console.log(`${cible}  (dans ${[...src].slice(0, 3).join(", ")}${src.size > 3 ? ` et ${src.size - 3} autres` : ""})`);
process.exit(casses.size ? 1 : 0);
