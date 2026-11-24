import { buttonVariants } from "@/components/ui/button";
import { Marque } from "@/components/site/logo";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { SiteMenu } from "@/components/site/site-menu";
import { nav, type Rubrique } from "@/lib/nav";
import { DICT, type Locale } from "@/lib/i18n";
import { TEXTE_RAPPEL } from "@/lib/demande";
import { IconeTelephone, LienRappel } from "@/components/demande/lien-rappel";

/* Tête : une ligne (62 px, 68 px sur les outils, 58 px sous 820 px).
   Au-dessus de 820 px : navigation, EN (FR en anglais), thème. En dessous : EN et Menu (panneau latéral).
   `altPath` : la même page dans l'autre langue (accueil de l'autre langue par défaut).
   « Être rappelé » : partout sauf `rappel={false}` (page de remerciement) ; les formulaires ont leur propre tête. */
export function SiteHeader({ current, locale = "fr", altPath, rappel = true }: { current?: Rubrique; locale?: Locale; altPath?: string; rappel?: boolean }) {
  const t = DICT[locale];
  const autre = altPath ?? (locale === "fr" ? "/en/" : "/");
  return (
    <header className="tete">
      <div className="wrap">
        <Marque locale={locale} />
        <nav className="nav" aria-label={t.navPrincipale}>
          {nav(locale).map((l) => (
            <a key={l.id} href={l.href} aria-current={current === l.id ? "page" : undefined} aria-label={l.court ? l.label : undefined}>
              {l.court ? (
                <>
                  <span className="nav-long" aria-hidden="true">{l.label}</span>
                  <span className="nav-court" aria-hidden="true">{l.court}</span>
                </>
              ) : (
                l.label
              )}
            </a>
          ))}
        </nav>
        <div className="tete-droite">
          {rappel ? (
            <LienRappel locale={locale} emplacement="tete" className="rappel-tete" aria-label={TEXTE_RAPPEL[locale].tete}>
              <IconeTelephone size={17} />
              <span className="rappel-long" aria-hidden="true">{TEXTE_RAPPEL[locale].tete}</span>
              <span className="rappel-court" aria-hidden="true">{TEXTE_RAPPEL[locale].teteCourt}</span>
            </LienRappel>
          ) : null}
          {/* Chaque langue a sa propre mise en page racine : rechargement complet voulu */}
          <a data-slot="button" className={buttonVariants({ variant: "commande", size: "commande" })} href={autre} lang={t.autreLangue.lang} hrefLang={t.autreLangue.lang} aria-label={t.autreLangue.long}>
            {t.autreLangue.court}
          </a>
          <span className="theme-tete"><ThemeToggle lang={locale} /></span>
          <SiteMenu current={current} locale={locale} />
        </div>
      </div>
    </header>
  );
}
