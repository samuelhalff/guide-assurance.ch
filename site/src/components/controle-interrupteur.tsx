"use client";
import type { ReactNode } from "react";
import { cn } from "cn";
import { Switch } from "@/components/ui/switch";

/* Adaptateur shadcn (base-ui) aux jetons du site : l'interrupteur. Un fichier par contrôle, pour qu'une page ne charge que le code
   des contrôles qu'elle affiche (un seul fichier réunissait avant Collapsible, Checkbox, Radio et Switch).
   Le CSS d'accompagnement est dans app/styles/controles.css. */


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
