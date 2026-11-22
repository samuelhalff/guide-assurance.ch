"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const t = {
  fr: { clair: "Passer au thème clair", sombre: "Passer au thème sombre" },
  en: { clair: "Switch to light theme", sombre: "Switch to dark theme" },
};

/* Soleil et lune, 44 px, sans cadre comme les autres commandes de la tête. Le choix est gardé par next-themes. */
export function ThemeToggle({ lang = "fr", className }: { lang?: "fr" | "en"; className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [pret, setPret] = useState(false);
  useEffect(() => setPret(true), []);
  const sombre = pret && resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(sombre ? "light" : "dark")}
      aria-label={sombre ? t[lang].clair : t[lang].sombre}
      className={cn("commande", className)}
    >
      {/* Lune en thème clair, soleil en sombre ; rien avant l'hydratation pour éviter une mauvaise icône */}
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" style={{ visibility: pret ? "visible" : "hidden" }}>
        {sombre ? (
          <>
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
          </>
        ) : (
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
        )}
      </svg>
    </button>
  );
}
