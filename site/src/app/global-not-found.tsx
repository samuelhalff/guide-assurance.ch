import "./globals.css";
import type { Metadata } from "next";
import { archivo, archivoNarrow } from "@/components/site/fonts";
import { Mesure } from "@/components/site/mesure";
import { ThemeProvider } from "@/components/site/theme-provider";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { IconeTelephone } from "@/components/demande/lien-rappel";
import { amorceGTM } from "@/lib/analytics";
import { baseViewport } from "@/lib/layout-metadata";
import { RAPPEL } from "@/lib/demande";
import { OUTILS, OUTILS_EN } from "@/lib/nav";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/* Page 404 unique (out/404.html), servie par nginx pour toute adresse inconnue, en français comme sous /en/ :
   texte français, bloc anglais à la fin. Le site a deux mises en page racines (fr, en), d'où global-not-found
   (experimental.globalNotFound) plutôt que not-found. Jamais indexée. */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `Page introuvable | ${SITE_NAME}`,
  description: "Cette adresse ne correspond à aucune page de Guide Assurance.",
  robots: { index: false, follow: true },
};
export const viewport = baseViewport;

const LIENS: { href: string; titre: string; detail: string }[] = [
  { href: OUTILS.comparateur, titre: "Comparer les primes LAMal 2027", detail: "Outil" },
  { href: OUTILS.lettre, titre: "Lettre de résiliation d’assurance maladie", detail: "Outil" },
  { href: OUTILS.taux3a, titre: "Taux des comptes 3a", detail: "3e pilier" },
  { href: OUTILS.impot3a, titre: "Économie d’impôt 3a", detail: "3e pilier" },
  { href: "/guides/", titre: "Tous les guides", detail: "Guides" },
];

/* Liens <a> voulus : la 404 n'appartient à aucune des deux mises en page racines, le rechargement complet est normal. */
/* eslint-disable @next/next/no-html-link-for-pages */
export default function GlobalNotFound() {
  const gtm = amorceGTM();
  return (
    <html lang="fr" className={`${archivo.variable} ${archivoNarrow.variable}`} suppressHydrationWarning>
      <head>{gtm ? <script dangerouslySetInnerHTML={{ __html: gtm }} /> : null}</head>
      <body className="antialiased">
        <ThemeProvider>
          <div className="page-outil page-404">
            <SiteHeader />
            <main>
              <div className="wrap">
                <h1>Cette page n’existe pas ou a changé d’adresse</h1>
                <p className="intro">
                  Le lien est peut-être ancien, ou l’adresse contient une faute de frappe. Vous trouverez ci-dessous les outils et les guides du site.
                </p>
                <section className="liste-guides" aria-label="Pages du site">
                  <ul>
                    {LIENS.map((l) => (
                      <li key={l.href}>
                        <a href={l.href}>{l.titre}</a> <small>{l.detail}</small>
                      </li>
                    ))}
                  </ul>
                </section>
                <p className="rappel-liste">
                  Vous préférez en parler à quelqu’un{" "}?{" "}
                  <a href={RAPPEL.fr}>
                    <IconeTelephone size={16} />
                    Être rappelé par un conseiller
                  </a>
                </p>
                <p className="retour-accueil">
                  <a href="/">Retour à l’accueil</a>
                </p>
                <section className="en-404" lang="en" aria-labelledby="t-en-404">
                  <h2 id="t-en-404">Page not found</h2>
                  <p>
                    This page does not exist or has moved. You can go to the <a href="/en/">English home page</a>, <a href={OUTILS_EN.comparateur}>compare 2027 premiums</a>, browse <a href="/en/guides/">all guides</a> or <a href={RAPPEL.en}>ask for a call back</a>.
                  </p>
                </section>
              </div>
            </main>
            <SiteFooter />
          </div>
        </ThemeProvider>
        <Mesure locale="fr" />
      </body>
    </html>
  );
}
