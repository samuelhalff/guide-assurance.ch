"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ChoixProps } from "@/components/outils/choix";

/* Le Select shadcn (Base UI) lui-même. Chargé par choix.tsx une fois la page affichée, ou dès que le visiteur
   approche du déclencheur ; `ouvert` : il avait déjà appuyé, la liste s'ouvre dès l'arrivée du code. */
export function ChoixReel<V extends string | number>({ id, name, value, options, onChange, disabled, describedBy, ouvert }: ChoixProps<V> & { ouvert?: boolean }) {
  /* Ouverture commandée : le Select monte fermé, puis s'ouvre dans un effet (le chemin normal de Base UI). */
  const [ouverte, setOuverte] = useState(false);
  useEffect(() => {
    if (ouvert) setOuverte(true);
  }, [ouvert]);
  return (
    <Select<V>
      name={name}
      value={value}
      items={options}
      disabled={disabled}
      open={ouverte}
      onOpenChange={setOuverte}
      onValueChange={(v) => { if (v !== null) onChange(v as V); }}
    >
      <SelectTrigger id={id} aria-describedby={describedBy} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={String(o.value)} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
