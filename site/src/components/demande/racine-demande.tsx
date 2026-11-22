import type { Metadata } from "next";
import { archivo, archivoNarrow } from "@/components/site/fonts";
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
    <html lang={locale} className={`${archivo.variable} ${archivoNarrow.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <MesureDemande />
        <ThemeProvider>
          <div className="page-demande">
            <header className="tete tete-demande">
              <div className="wrap">
                <Marque locale={locale} />
                <ThemeToggle lang={locale} />
              </div>
            </header>
            <main>{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
