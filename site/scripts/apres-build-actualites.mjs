/* Après `next build` : retire les pages factices « _ » des routes d'actualités et d'aperçu (l'export statique
   refuse une liste de paramètres vide, voir VIDE dans src/lib/actualites.ts), puis vérifie qu'aucun brouillon
   n'a fuité dans les fichiers publics (plan du site, flux, llms, liste). Échec = build en erreur. */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const OUT = path.join(process.cwd(), "out");
for (const d of ["actualites/_", "en/news/_", "apercu/_", "en/preview/_"]) fs.rmSync(path.join(OUT, d), { recursive: true, force: true });

const lire = (f) => (fs.existsSync(path.join(OUT, f)) ? fs.readFileSync(path.join(OUT, f), "utf8") : "");
const publics = ["sitemap.xml", "llms.txt", "llms-full.txt", "actualites/feed.xml", "en/news/feed.xml", "actualites/index.html", "en/news/index.html"];
const fautes = [];
for (const l of ["fr", "en"]) {
  const dir = path.join(process.cwd(), "content", l, "actualites");
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
    const { data } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
    if (data.status === "published") continue;
    const slug = f.replace(/\.md$/, "");
    const chemin = `${l === "fr" ? "/actualites/" : "/en/news/"}${slug}/`;
    if (fs.existsSync(path.join(OUT, chemin, "index.html"))) fautes.push(`page publique d'un brouillon : ${chemin}`);
    for (const p of publics) if (lire(p).includes(chemin) || lire(p).includes(String(data.title))) fautes.push(`brouillon « ${slug} » présent dans ${p}`);
  }
}
if (fautes.length) {
  console.error("Actualités : " + fautes.join(" ; "));
  process.exit(1);
}
