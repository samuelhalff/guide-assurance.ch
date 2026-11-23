// node scripts/verifier-actualite.mts <fichier.md> [--locale fr|en] [--corpus fichier] [--noms fichier.json]
// Sortie : JSON {ok, echecs:[{regle,detail}], mots}. Code 0 si ok, 1 sinon, 2 si le fichier est illisible.
import { readFileSync } from "node:fs";
import { lireArticle } from "../src/lib/actualites-core.ts";
import { verifierArticle, mots } from "../src/lib/verifier-actualite.ts";

const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const fichier = args.find((x, i) => !x.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!fichier) { console.error("usage : verifier-actualite.mts <fichier.md> [--locale fr|en] [--corpus f] [--noms f.json]"); process.exit(2); }
const locale = (opt("--locale") ?? (/[/\\]en[/\\]/.test(fichier) ? "en" : "fr")) as "fr" | "en";
let a;
try { a = lireArticle(fichier, locale); } catch (err) {
  console.log(JSON.stringify({ ok: false, echecs: [{ regle: "front matter", detail: String((err as Error).message) }] }));
  process.exit(2);
}
const c = opt("--corpus"), n = opt("--noms");
const echecs = verifierArticle(a, {
  corpus: c ? readFileSync(c, "utf8") : undefined,
  noms: n ? (JSON.parse(readFileSync(n, "utf8")) as string[]) : undefined,
});
console.log(JSON.stringify({ ok: echecs.length === 0, echecs, mots: mots(a.markdown) }, null, 1));
process.exit(echecs.length ? 1 : 0);
