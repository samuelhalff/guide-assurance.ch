"use client";
import type { ReactNode } from "react";
import { cn } from "cn";
import { Checkbox } from "@/components/ui/checkbox";

/* Adaptateur shadcn (base-ui) aux jetons du site : la case à cocher. Un fichier par contrôle, pour qu'une page ne charge que le code
   des contrôles qu'elle affiche (un seul fichier réunissait avant Collapsible, Checkbox, Radio et Switch).
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
            : "mt-0.5",
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
