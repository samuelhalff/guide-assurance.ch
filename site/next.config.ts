import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

/* Nombre d'actualités publiées (content/{fr,en}/actualites, status: published) : le lien « Actualités » du pied
   de page n'apparaît qu'à partir de la première publication (lib/nav.ts). */
const publiees = (l: string) => {
  const dir = path.join(process.cwd(), "content", l, "actualites");
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md") && /^status:\s*published\s*$/m.test(fs.readFileSync(path.join(dir, f), "utf8"))).length;
};

/* Export statique servi par nginx (infra : /etc/episto/proxy-extra/guide-assurance.conf).
   Les en-têtes de sécurité et la CSP sont posés par nginx, pas par Next. */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  /* next/image sans serveur d'optimisation : chargeur qui sert les variantes de public/ (src/lib/chargeur-images.ts). */
  images: { loader: "custom", loaderFile: "./src/lib/chargeur-images.ts", deviceSizes: [720, 1080, 1448], imageSizes: [],
    /* Dossiers d'images locales ; le ?v= (cache) est permis. */
    localPatterns: [{ pathname: "/brand/**" }, { pathname: "/credits/**" }, { pathname: "/kit-rh/**" }] },
  env: { NEXT_PUBLIC_ACTUALITES_FR: String(publiees("fr")), NEXT_PUBLIC_ACTUALITES_EN: String(publiees("en")) },
  /* Le formulaire de demande importe ../shared/demande (libellés, consentements, NPA) : hors du dossier du site. */
  /* globalNotFound : page 404 unique (src/app/global-not-found.tsx), le site ayant deux mises en page racines. */
  experimental: { externalDir: true, globalNotFound: true },
};

export default nextConfig;
