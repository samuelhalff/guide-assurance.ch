import { pied } from "@/lib/nav";
import { DICT, type Locale } from "@/lib/i18n";
import { RouvrirMesure } from "@/components/site/rouvrir-mesure";

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
        {/* Crédit (décision de Sam du 23.11.2026) : logo houle.ai en ancre de marque, lien suivi */}
        <p className="credit">
          {t.credit}{" "}
          <a href="https://houle.ai/">
            {/* SVG de quelques Ko, déjà à la bonne taille : servi tel quel (unoptimized), en img ordinaire (aucun code next/image côté client). */}
            <picture>
              <img src="/credits/houle-ai.svg" alt="houle.ai" width={64} height={15} loading="lazy" decoding="async" />
            </picture>
          </a>
        </p>
      </div>
    </footer>
  );
}
