"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "cn";
import { selectIconClasses, selectTriggerClasses, selectValueClasses } from "@/components/ui/select-styles";
import { chargerApresAffichage } from "@/lib/charge-differee";

/* Menu déroulant des outils : le Select shadcn (dimensions des champs réglées dans ui/select.tsx).
   Le code de Base UI (liste, positionnement, focus : une quarantaine de Ko compressés) n'est pas nécessaire au premier
   écran. Le HTML initial et l'hydratation portent donc un déclencheur léger, au même balisage, aux mêmes classes et à
   la même taille que celui de Base UI, avec la valeur courante. Le vrai Select se charge une fois la page affichée, ou
   dès que le pointeur, le doigt ou le clavier approche du déclencheur, et le remplace sur place. Un appui (ou une touche
   d'ouverture) avant la fin du chargement ouvre la liste dès l'arrivée du code, sauf si Échap ou la sortie du champ l'a
   annulé entre-temps. */
export type Option<V extends string | number> = { value: V; label: string };
export type ChoixProps<V extends string | number> = {
  id: string;
  name?: string;
  value: V;
  options: readonly Option<V>[];
  onChange: (v: V) => void;
  disabled?: boolean;
  describedBy?: string;
};

type Reel = ComponentType<ChoixProps<string | number> & { ouvert?: boolean }>;
let reel: Reel | null = null;
let chargement: Promise<Reel> | null = null;
function charger(): Promise<Reel> {
  chargement ??= import("@/components/outils/choix-reel").then((m) => (reel = m.ChoixReel as Reel));
  return chargement;
}

const MASQUE = { clipPath: "inset(50%)", overflow: "hidden", whiteSpace: "nowrap", border: 0, padding: 0, width: 1, height: 1, margin: -1, position: "absolute" } as const;

export function Choix<V extends string | number>(props: ChoixProps<V>) {
  const { id, name, value, options, disabled, describedBy } = props;
  const [Reel, setReel] = useState<Reel | null>(() => reel);
  const ouvrir = useRef(false);
  const focus = useRef(false);
  useLayoutEffect(() => {
    if (Reel && focus.current) document.getElementById(id)?.focus({ preventScroll: true });
    focus.current = false;
  }, [Reel, id]);
  const monter = useCallback(() => {
    void charger().then((R) => {
      focus.current = document.activeElement?.id === id;
      setReel(() => R);
    });
  }, [id]);
  useLayoutEffect(() => (Reel ? undefined : chargerApresAffichage(monter)), [Reel, monter]);
  if (Reel) return <Reel {...(props as unknown as ChoixProps<string | number>)} ouvert={ouvrir.current || undefined} />;
  const libelle = options.find((o) => o.value === value)?.label ?? "";
  /* Échap ou sortie du champ avant l'arrivée du code : l'ouverture demandée est annulée (sinon la liste s'ouvrirait plus
     tard et reprendrait le focus au champ suivant). */
  const ouvreAuClavier = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      ouvrir.current = true;
      monter();
    } else if (e.key === "Escape" || e.key === "Tab") ouvrir.current = false;
  };
  return (
    <>
      <button
        type="button"
        tabIndex={disabled ? -1 : 0}
        disabled={disabled}
        data-disabled={disabled ? "" : undefined}
        data-placeholder={value === "" ? "" : undefined}
        id={id}
        role="combobox"
        aria-expanded="false"
        aria-haspopup="listbox"
        aria-controls={`${id}-liste`}
        aria-describedby={describedBy}
        data-slot="select-trigger"
        data-ph-mask=""
        data-size="default"
        className={cn(selectTriggerClasses, "w-full")}
        onPointerEnter={disabled ? undefined : () => void charger()}
        onTouchStart={disabled ? undefined : () => void charger()}
        onFocus={disabled ? undefined : () => void charger()}
        onBlur={() => {
          ouvrir.current = false;
        }}
        onKeyDown={disabled ? undefined : ouvreAuClavier}
        onClick={() => {
          ouvrir.current = true;
          monter();
        }}
      >
        <span data-slot="select-value" className={selectValueClasses}>{libelle}</span>
        <ChevronDownIcon className={selectIconClasses} aria-hidden="true">▼</ChevronDownIcon>
      </button>
      {name ? <input style={MASQUE} tabIndex={-1} aria-hidden="true" name={name} defaultValue={String(value)} /> : null}
    </>
  );
}
