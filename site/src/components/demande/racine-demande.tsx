import type { Metadata } from "next";
import { archivo, archivoLogo, archivoNarrow } from "@/components/site/fonts";
import { Marque } from "@/components/site/logo";
import { ThemeProvider } from "@/components/site/theme-provider";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { MesureDemande } from "@/components/demande/mesure-demande";
import { baseMetadata } from "@/lib/layout-metadata";

/* Mise en page racine du formulaire de demande (/demande/, /en/request/).
   Jamais de GTM ni de bandeau <Mesure> ici : PostHog seul, sans cookie (MesureDemande). */
export const metadataDemande: Metadata = { ...baseMetadata, robots: { index: false, follow: false } };

export function RacineDemande({ locale, children }: { locale: "fr" | "en"; children: React.ReactNode }) {
  return (
    <html lang={locale} className={`${archivo.variable} ${archivoLogo.variable} ${archivoNarrow.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-lg focus:bg-background focus:px-4 focus:py-3 focus:font-bold focus:text-foreground focus:ring-3 focus:ring-ring">{locale === "en" ? "Skip to content" : "Aller au contenu"}</a>
        <MesureDemande />
        <ThemeProvider>
          <div className="page-demande">
            <header className="tete tete-demande">
              <div className="wrap">
                <Marque locale={locale} />
                <ThemeToggle lang={locale} />
              </div>
            </header>
            <main id="contenu">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
