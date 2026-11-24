"use client";
import type { ReactNode } from "react";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cn } from "cn";
import { RadioGroupItem } from "@/components/ui/radio-group";

/* Adaptateur shadcn (base-ui) aux jetons du site : le choix à boutons (radio). Un fichier par contrôle, pour qu'une page ne charge que le code
   des contrôles qu'elle affiche (un seul fichier réunissait avant Collapsible, Checkbox, Radio et Switch).
   Le CSS d'accompagnement est dans app/styles/controles.css. */

/* Élément caché qui couvre toute l'étiquette : la puce ou la carte est le visuel, l'élément shadcn garde le rôle et le clavier. */
const CACHE = "absolute inset-0 size-full opacity-0 cursor-pointer after:hidden focus-visible:ring-0";

/* ===== Choix à boutons (radio) ===== */
export type OptionBouton<V> = { value: V; label: ReactNode; detail?: ReactNode; extra?: ReactNode; key?: string };

export function ChoixBoutons<V>({
  value,
  options,
  onChange,
  name,
  variante = "pastille",
  className,
  itemClassName,
  label,
  labelledBy,
  describedBy,
  invalid,
  disabled,
  id,
}: {
  value: V | null;
  options: readonly OptionBouton<V>[];
  onChange: (v: V) => void;
  name?: string;
  /* « pastille » : boutons serrés (.pastilles) ; « option » : cartes à repère rond (.option) ; « puce » : puces du formulaire de demande. */
  variante?: "pastille" | "option" | "puce";
  /* Classes du groupe (ex. « pastilles pastilles-2 », « choix-liste », « puces puces-pile »). */
  className?: string;
  itemClassName?: string;
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
}) {
  const cle = (o: OptionBouton<V>) => o.key ?? String(o.value);
  return (
    /* Groupe base-ui sans les classes de mise en page shadcn (grid, gap) : la disposition vient du site (.pastilles, .puces, .choix-liste). */
    <RadioGroupPrimitive
      data-slot="radio-group"
      id={id}
      name={name}
      value={value}
      disabled={disabled}
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid ? true : undefined}
      onValueChange={(v) => onChange(v as V)}
      className={className}
    >
      {options.map((o) =>
        variante === "option" ? (
          <label key={cle(o)} className={cn("option", itemClassName)}>
            <RadioGroupItem
              value={o.value}
              className="after:hidden"
            />
            <span className="libelle">
              {o.label}
              {o.detail ? <small>{o.detail}</small> : null}
            </span>
            {o.extra}
          </label>
        ) : (
          <label key={cle(o)} className={cn(variante, itemClassName)}>
            <RadioPrimitive.Root value={o.value} data-slot="radio-group-item" className={CACHE} />
            {variante === "puce" ? (
              <svg className="coche" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
            <span>
              {o.label}
              {o.detail ? <small>{o.detail}</small> : null}
            </span>
            {o.extra}
          </label>
        ),
      )}
    </RadioGroupPrimitive>
  );
}
