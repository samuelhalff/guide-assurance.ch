"use client";
import { useState } from "react";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { nav, type Rubrique } from "@/lib/nav";
import { DICT, type Locale } from "@/lib/i18n";

/* Menu mobile (≤ 820 px) : panneau latéral de 340 px au plus. Base UI Dialog piège le focus, Échap ferme
   et rend le focus au bouton Menu. */
export function SiteMenu({ current, locale = "fr" }: { current?: Rubrique; locale?: Locale }) {
  const [ouvert, setOuvert] = useState(false);
  const t = DICT[locale];
  return (
    <Sheet open={ouvert} onOpenChange={setOuvert}>
      <SheetTrigger className="commande menu-btn">
        <svg width="22" height="12" viewBox="0 0 22 12" aria-hidden="true">
          <path d="M1 2h20M8 10h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="menu-mot">{t.menu}</span>
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="menu-panneau w-full gap-0 border-l border-filet bg-papier px-4 pt-2 pb-4 text-encre data-[side=right]:w-full data-[side=right]:max-w-[340px] data-[side=right]:sm:max-w-[340px]"
      >
        <div className="flex min-h-[58px] items-center justify-between">
          <SheetTitle className="font-narrow text-[15px] font-semibold text-encre-2">{t.menu}</SheetTitle>
          <SheetClose className="commande" aria-label={t.fermerMenu}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </SheetClose>
        </div>
        <nav aria-label={t.navPrincipale}>
          {nav(locale).map((l) => (
            <a key={l.id} href={l.href} aria-current={current === l.id ? "page" : undefined} onClick={() => setOuvert(false)}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="menu-pied">
          {t.theme}
          <ThemeToggle lang={locale} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
