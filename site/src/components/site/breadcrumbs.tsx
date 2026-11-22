import type { Miette } from "@/lib/jsonld";
import { DICT, type Locale } from "@/lib/i18n";

/* Fil d'Ariane : liste ordonnée, la page courante sans lien (aria-current). Données structurées : breadcrumbLd(). */
export function Breadcrumbs({ items, locale = "fr" }: { items: Miette[]; locale?: Locale }) {
  return (
    <nav className="fil" aria-label={DICT[locale].filAriane}>
      <ol>
        {items.map((m, i) => (
          <li key={i}>{m.href && i < items.length - 1 ? <a href={m.href}>{m.name}</a> : <span aria-current="page">{m.name}</span>}</li>
        ))}
      </ol>
    </nav>
  );
}
