"use client";
import { ThemeProvider as NextThemes } from "next-themes";

/* Suit le réglage de l'appareil ; le bouton de la tête de page peut forcer clair ou sombre (gardé dans localStorage). */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}
