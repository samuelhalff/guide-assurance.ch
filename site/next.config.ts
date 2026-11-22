import type { NextConfig } from "next";

/* Export statique servi par nginx (infra : /etc/episto/proxy-extra/guide-assurance.conf).
   Les en-têtes de sécurité et la CSP sont posés par nginx, pas par Next. */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  /* Le formulaire de demande importe ../shared/demande (libellés, consentements, NPA) : hors du dossier du site. */
  experimental: { externalDir: true },
};

export default nextConfig;
