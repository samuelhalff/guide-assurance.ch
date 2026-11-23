"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* Menu déroulant des outils : le Select shadcn (dimensions des champs réglées dans ui/select.tsx). */
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
