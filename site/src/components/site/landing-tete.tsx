import { FormulaireComparer } from "@/components/site/formulaire-comparer";
import { IconeTelephone, LienRappel } from "@/components/demande/lien-rappel";
import { TEXTE_LANDING, typoFr, type Landing } from "@/lib/landing";
import { outils } from "@/lib/nav";
import type { Locale } from "@/lib/i18n";
import type { Porte } from "@shared/demande/portes";
import { lienDemande } from "@/lib/demande";
import { buttonVariants } from "@/components/ui/button";

const FLECHE = (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

/* Tête des pages produit en landing : H1 (intention), réponse en une ligne, action principale (outil public ou rappel),
   ligne d'intégrité, puis ce qu'on vous demandera et ce qui fait varier la prime. Le guide suit, inchangé. */
/* `porte` : page d'une porte d'offre directe (ménage et RC, protection juridique, auto) ; l'action principale ouvre son formulaire. */
export function LandingTete({ h1, landing, locale = "fr", porte }: { h1: string; landing: Landing; locale?: Locale; porte?: Porte }) {
  const t = TEXTE_LANDING[locale];
  const ty = (s: string) => (locale === "fr" ? typoFr(s) : s);
  const o = outils(locale);
  const { action, sujet } = landing;

  const rappelSecond = (
    <p className="landing-second">
      <IconeTelephone size={16} />
      <span>
        {t.rappelSecond}{" "}
        <LienRappel locale={locale} emplacement="produit" sujet={sujet}>{t.rappelSecondLien}</LienRappel>
      </span>
    </p>
  );

  return (
    <section className="landing-tete" aria-labelledby="landing-h1">
      <div className="landing-texte">
        <h1 id="landing-h1">{ty(h1)}</h1>
        <p className="landing-reponse">{ty(landing.reponse)}</p>
      </div>

      <div className="landing-action">
        {action === "comparateur" ? (
          <>
            <p className="landing-action-titre">{t.comparerTitre}</p>
            <FormulaireComparer locale={locale} />
            {rappelSecond}
          </>
        ) : action === "simulateur" || action === "lettre" ? (
          <>
            {action === "simulateur" ? (
              <>
                <p className="landing-action-titre">{t.simulateurTitre}</p>
                <p className="landing-action-texte">{t.simulateurTexte}</p>
              </>
            ) : null}
            <a className={buttonVariants({ className: "mt-4 w-full" })} href={action === "simulateur" ? o.simulateur : o.lettre}>
              {action === "simulateur" ? t.simulateurBouton : t.lettreBouton}
              {FLECHE}
            </a>
            {rappelSecond}
          </>
        ) : porte ? (
          <>
            <p className="landing-action-titre">{ty(t.offresTitre(landing.objet))}</p>
            <a className={buttonVariants({ className: "mt-4 w-full" })} href={lienDemande(locale, porte)}>
              {t.offresBouton}
              {FLECHE}
            </a>
            <p className="landing-action-texte">{t.offresDetail}</p>
            {rappelSecond}
          </>
        ) : (
          <>
            <p className="landing-action-titre">{ty(t.rappelTitre(landing.objet))}</p>
            <LienRappel locale={locale} emplacement="produit" sujet={sujet} className={buttonVariants({ className: "mt-4 w-full" })}>
              <IconeTelephone />
              {t.rappelBouton}
            </LienRappel>
            <p className="landing-action-texte">{t.rappelDetail}</p>
            {sujet === "sante" ? (
              <p className="landing-second">
                <a href={o.comparateur}>{t.lamalLien}</a>
              </p>
            ) : null}
          </>
        )}
        <p className="landing-integrite">
          {t.integrite} <a href={t.integriteHref}>{t.integriteLien}</a>
        </p>
      </div>

      {landing.demande.length || landing.varie.length ? (
        <div className="landing-faits">
          {landing.demande.length ? (
            <section aria-labelledby="landing-demande">
              <h2 id="landing-demande">{ty(landing.demandeTitre ?? t.demandeTitre)}</h2>
              <ul>
                {landing.demande.map((d) => (
                  <li key={d}>{ty(d)}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {landing.varie.length ? (
            <section aria-labelledby="landing-varie">
              <h2 id="landing-varie">{ty(landing.varieTitre ?? t.varieTitre)}</h2>
              <ul>
                {landing.varie.map((d) => (
                  <li key={d}>{ty(d)}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
