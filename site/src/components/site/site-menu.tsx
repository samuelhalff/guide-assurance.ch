"use client";
import { useCallback, useEffect, useRef, useState, type ComponentType, type RefObject } from "react";
import { buttonVariants } from "@/components/ui/button";
import { apresChargement } from "@/lib/charge-differee";
import { DICT, type Locale } from "@/lib/i18n";
import type { Rubrique } from "@/lib/nav";

type Panneau = ComponentType<{ current?: Rubrique; locale?: Locale; ouvert: boolean; onOuvert: (o: boolean) => void; retour: RefObject<HTMLButtonElement | null> }>;

/* Menu mobile (≤ 820 px). Le bouton est dans le HTML initial et réagit tout de suite ; le panneau (Base UI Dialog,
   piège à focus, positionnement : une vingtaine de Ko compressés) se charge une fois la page affichée, ou dès que
   le doigt ou le pointeur approche du bouton. Un appui avant la fin du chargement ouvre le panneau dès son arrivée. */
export function SiteMenu({ current, locale = "fr" }: { current?: Rubrique; locale?: Locale }) {
  const [ouvert, setOuvert] = useState(false);
  const [Panneau, setPanneau] = useState<Panneau | null>(null);
  /* Le bouton n'est pas un SheetTrigger (le panneau arrive après lui) : le panneau lui rend le focus à la fermeture
     (finalFocus), même sur Safari où un appui ne donne pas le focus au bouton. */
  const bouton = useRef<HTMLButtonElement>(null);
  const t = DICT[locale];
  const charger = useCallback(() => {
    void import("@/components/site/site-menu-panneau").then((m) => setPanneau(() => m.SiteMenuPanneau));
  }, []);
  useEffect(() => apresChargement(charger), [charger]);
  return (
    <>
      <span className="menu-btn">
        <button
          ref={bouton}
          type="button"
          data-slot="sheet-trigger"
          aria-haspopup="dialog"
          aria-expanded={ouvert}
          className={buttonVariants({ variant: "commande", size: "commande", className: "max-[479px]:gap-0" })}
          onPointerEnter={charger}
          onFocus={charger}
          onClick={() => {
            charger();
            setOuvert(true);
          }}
        >
          <svg className="size-[22px] h-3" width="22" height="12" viewBox="0 0 22 12" aria-hidden="true">
            <path d="M1 2h20M8 10h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="menu-mot">{t.menu}</span>
        </button>
      </span>
      {Panneau ? <Panneau current={current} locale={locale} ouvert={ouvert} onOuvert={setOuvert} retour={bouton} /> : null}
    </>
  );
}
