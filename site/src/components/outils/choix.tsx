"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* Menu déroulant des outils : le Select shadcn, aux dimensions des autres champs (.saisie). */
export type Option<V extends string | number> = { value: V; label: string };

export function Choix<V extends string | number>({
  id,
  name,
  value,
  options,
  onChange,
  disabled,
  describedBy,
}: {
  id: string;
  name?: string;
  value: V;
  options: readonly Option<V>[];
  onChange: (v: V) => void;
  disabled?: boolean;
  describedBy?: string;
}) {
  return (
    <Select<V>
      name={name}
      value={value}
      items={options}
      disabled={disabled}
      onValueChange={(v) => { if (v !== null) onChange(v as V); }}
    >
      <SelectTrigger id={id} aria-describedby={describedBy} className="w-full data-[size=default]:h-12 rounded-[var(--r)] border-[var(--input)] bg-[var(--champ)] dark:bg-[var(--champ)] dark:hover:bg-[var(--champ)] pl-3 pr-3 text-[17px] text-[var(--encre)] disabled:opacity-60 focus-visible:border-[var(--lac-encre)] focus-visible:ring-[var(--lac-encre)]/40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-[var(--r)]">
        {options.map((o) => (
          <SelectItem key={String(o.value)} value={o.value} className="min-h-11 py-2 pl-3 text-base">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
