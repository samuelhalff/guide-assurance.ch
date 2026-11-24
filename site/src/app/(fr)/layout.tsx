import "../globals.css";
import { archivo, archivoNarrow } from "@/components/site/fonts";
import { Mesure } from "@/components/site/mesure";
import { Assistant } from "@/components/assistant/assistant";
import { amorceGTM } from "@/lib/analytics";
import { ThemeProvider } from "@/components/site/theme-provider";
import { baseMetadata, baseViewport } from "@/lib/layout-metadata";

export const metadata = baseMetadata;
export const viewport = baseViewport;

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${archivo.variable} ${archivoNarrow.variable}`} suppressHydrationWarning>
      <head>{amorceGTM() ? <script dangerouslySetInnerHTML={{ __html: amorceGTM() }} /> : null}</head>
      <body className="antialiased">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-lg focus:bg-background focus:px-4 focus:py-3 focus:font-bold focus:text-foreground focus:ring-3 focus:ring-ring">Aller au contenu</a>
        <ThemeProvider>{children}</ThemeProvider>
        <Mesure locale="fr" />
        <Assistant locale="fr" />
      </body>
    </html>
  );
}
