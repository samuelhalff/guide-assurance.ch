import { pied } from "@/lib/nav";
import { DICT, type Locale } from "@/lib/i18n";
import { RouvrirMesure } from "@/components/site/mesure";

/* Pied de page : seul endroit où l'éditeur (West Bay SA) apparaît. Bande sombre dans les deux thèmes.
   `note` ajoute la mention propre à la page (source des primes, portée de l'outil).
   `altPath` : la même page dans l'autre langue (accueil de l'autre langue par défaut). */
export function SiteFooter({ note, locale = "fr", altPath }: { note?: string; locale?: Locale; altPath?: string }) {
  const t = DICT[locale];
  const autre = altPath ?? (locale === "fr" ? "/en/" : "/");
  return (
    <footer className="marge">
      <div className="wrap">
        <span>{`${t.editeur}${note ? ` ${note}` : ""}`}</span>
        <nav aria-label={t.piedNav}>
          {pied(locale).map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
          <RouvrirMesure />
          {/* Chaque langue a sa propre mise en page racine : rechargement complet voulu */}
          <a href={autre} lang={t.autreLangue.lang} hrefLang={t.autreLangue.lang}>
            {t.autreLangue.long}
          </a>
        </nav>
      </div>
    </footer>
  );
}
