"use client";

import type { ReactNode } from "react";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { ChevronDown } from "lucide-react";
import { cn } from "cn";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";

/* Adaptateurs des contrôles shadcn (base-ui) aux jetons du site (--r, --champ, --input, --lac-encre, --sentier, --encre).
   Même principe que outils/choix.tsx : le composant shadcn, habillé aux dimensions des champs du site.
   Le CSS d'accompagnement est dans app/styles/controles.css. */

/* Élément caché qui couvre toute l'étiquette : la puce ou la carte est le visuel, l'élément shadcn garde le rôle et le clavier. */
const CACHE = "absolute inset-0 size-full opacity-0 cursor-pointer after:hidden focus-visible:ring-0";

/* ===== Case à cocher ===== */
export function Case({
  checked,
  onChange,
  children,
  id,
  name,
  value,
  disabled,
  required,
  invalid,
  describedBy,
  variante = "case",
  className,
  caseClassName,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  id?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /* « case » : carré visible à gauche du texte ; « puce » : bouton-puce (formulaire de demande), carré caché.
     className remplace la classe « case » (ex. « case caisse-case », « case-demande »). */
  variante?: "case" | "puce";
  className?: string;
  caseClassName?: string;
}) {
  const puce = variante === "puce";
  return (
    <label className={puce ? cn("puce", className) : (className ?? "case")}>
      <Checkbox
        id={id}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        required={required}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        onCheckedChange={(c) => onChange(c)}
        className={cn(
          puce
            ? CACHE
            : "mt-0.5 size-5",
          caseClassName,
        )}
      />
      {puce ? (
        <svg className="coche" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
      <span>{children}</span>
    </label>
  );
}

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
              className="size-5 after:hidden"
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

/* ===== Interrupteur ===== */
export function Interrupteur({
  checked,
  onChange,
  labelledBy,
  label,
  texteOui,
  texteNon,
  id,
  name,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelledBy?: string;
  label?: string;
  /* Texte affiché à côté de la piste (Oui / Non) ; décoratif, l'état est porté par le rôle switch. */
  texteOui?: ReactNode;
  texteNon?: ReactNode;
  id?: string;
  name?: string;
  className?: string;
}) {
  return (
    <label className={cn("bascule", className)}>
      <Switch
        id={id}
        name={name}
        checked={checked}
        aria-labelledby={labelledBy}
        aria-label={label}
        onCheckedChange={(c) => onChange(c)}
        size="lg"
      />
      {texteOui !== undefined || texteNon !== undefined ? (
        <span className="bascule-texte" aria-hidden="true">{checked ? texteOui : texteNon}</span>
      ) : null}
    </label>
  );
}

/* ===== Bloc dépliable =====
   Le contenu reste dans le HTML statique (hidden="until-found") : lisible par les moteurs et trouvable avec Ctrl+F. */
export function Depliable({
  titre,
  children,
  defaultOpen,
  open,
  onOpenChange,
  id,
  className,
  titreClassName,
  contenuClassName,
  chevron = true,
}: {
  titre: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  id?: string;
  /* Classe du bloc (ex. « affiner », « precis ») : l'état ouvert est [data-open]. */
  className?: string;
  titreClassName?: string;
  contenuClassName?: string;
  chevron?: boolean;
}) {
  return (
    <Collapsible
      id={id}
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange ? (o) => onOpenChange(o) : undefined}
      className={cn("depliable", className)}
    >
      <CollapsibleTrigger className={cn("depliable-titre", titreClassName)}>
        <span className="depliable-libelle">{titre}</span>
        {chevron ? <ChevronDown className="depliable-chevron" aria-hidden="true" /> : null}
      </CollapsibleTrigger>
      <CollapsibleContent hiddenUntilFound className={cn("depliable-contenu", contenuClassName)}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
