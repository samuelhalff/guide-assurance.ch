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
        <ThemeProvider>{children}</ThemeProvider>
        <Mesure locale="fr" />
        <Assistant locale="fr" />
      </body>
    </html>
  );
}
