"use client";
import type { RefObject } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { nav, type Rubrique } from "@/lib/nav";
import { DICT, type Locale } from "@/lib/i18n";

/* Panneau latéral du menu mobile (≤ 820 px), 340 px au plus : chargé après l'affichage de la page par site-menu.tsx
   (voir là). Base UI Dialog piège le focus, Échap ferme ; le focus revient au bouton Menu (finalFocus, le bouton n'étant pas un
   SheetTrigger). */
export function SiteMenuPanneau({ current, locale = "fr", ouvert, onOuvert, retour }: { current?: Rubrique; locale?: Locale; ouvert: boolean; onOuvert: (o: boolean) => void; retour: RefObject<HTMLButtonElement | null> }) {
  const t = DICT[locale];
  return (
    <Sheet open={ouvert} onOpenChange={onOuvert}>
      <SheetContent
        side="right"
        showCloseButton={false}
        finalFocus={retour}
        className="menu-panneau w-full gap-0 border-l border-filet bg-papier px-4 pt-2 pb-4 text-encre data-[side=right]:w-full data-[side=right]:max-w-[340px] data-[side=right]:sm:max-w-[340px]"
      >
        <div className="flex min-h-[58px] items-center justify-between">
          <SheetTitle className="font-narrow text-base font-semibold text-encre-2">{t.menu}</SheetTitle>
          <SheetClose className={buttonVariants({ variant: "commande", size: "commande" })} aria-label={t.fermerMenu}>
            <svg className="size-[18px]" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </SheetClose>
        </div>
        <nav aria-label={t.navPrincipale}>
          {nav(locale).map((l) => (
            <a key={l.id} href={l.href} aria-current={current === l.id ? "page" : undefined} onClick={() => onOuvert(false)}>
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
