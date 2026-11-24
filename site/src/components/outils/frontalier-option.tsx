import type { Locale } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { ESPACE_FINE as T } from "@/lib/nombres";

/* Sous le simulateur frontalier : le droit d'option (choix en principe irréversible) et ce que le prix ne dit pas.
   Rendu côté serveur, lisible sans JavaScript. Sources officielles citées en lien, vérifiées le 23.11.2026 (research : CLEISS, ge.ch du 10.11.2026, OFSP, OAMal consolidée au 22.10.2026). */

export const SOURCES_OPTION = {
  ofsp: "https://www.bag.admin.ch/fr/assurance-maladie-travailleurs-frontaliers-en-suisse",
  cleiss: "https://www.cleiss.fr/faq/droit_d_option_des_frontaliers_france-suisse.html",
  oamal: "https://www.fedlex.admin.ch/eli/cc/1995/3867_3867_3867/fr#art_2",
  urssaf: "https://www.urssaf.fr/accueil/particulier/travailleur-frontalier-suisse/travail-suisse-declarer-revenus.html",
  ge: "https://www.ge.ch/assurance-maladie-frontaliers-residant-france",
};

const TXT = {
  fr: {
    titre: `Pourquoi le choix est-il en principe définitif${T}?`,
    chapo:
      "Le droit d’option vient de l’accord sur la libre circulation des personnes entre la Suisse et l’Union européenne (annexe II). Vous l’exercez une fois, pour vous et pour vos proches sans activité, et il ne se refait pas quand votre situation change.",
    points: [
      ["Trois mois pour choisir", "Le délai court dès le début de votre travail en Suisse, ou dès votre installation en France si vous y travaillez déjà. Le formulaire « Choix du système » tamponné par votre CPAM s’envoie au service de l’assurance maladie du canton de travail (à Genève, le service de l’assurance maladie ; dans le canton de Vaud, l’OVAM)."],
      ["Sans choix, la LAMal", "Un choix tacite n’est pas valable. Sans formulaire reçu à temps, vous êtes affilié d’office à la LAMal, et un retard sans excuse valable peut entraîner un supplément de prime."],
      ["Ce qui rouvre le choix", "Une nouvelle première activité en Suisse après une interruption, une reprise de travail après un régime étranger (par exemple le chômage en France), une installation en France ou le passage à la retraite."],
      ["Ce qui ne le rouvre pas", "Un nouveau contrat sans interruption, un changement d’employeur ou de canton, un mariage, un divorce ou une naissance."],
    ] as [string, string][],
    sourcesTitre: "Sources officielles",
    sources: [
      ["OFSP, assurance maladie des frontaliers", SOURCES_OPTION.ofsp],
      ["CLEISS, droit d’option des frontaliers France-Suisse", SOURCES_OPTION.cleiss],
      ["État de Genève, assurance maladie des frontaliers résidant en France (page mise à jour le 10.11.2026)", SOURCES_OPTION.ge],
      ["OAMal, art. 2, al. 6 (droit d’option prévu par l’ALCP), Fedlex", SOURCES_OPTION.oamal],
      ["Urssaf, travail en Suisse : déclarer vos revenus", SOURCES_OPTION.urssaf],
    ] as [string, string][],
    nuancesTitre: "Ce que le prix ne dit pas",
    nuances: [
      ["Où se faire soigner", "Avec la LAMal, en Suisse et en France (formulaire S1 auprès de la CPAM). Avec l’assurance française, en France ; en Suisse, les urgences sont prises en charge, et les soins non urgents au tarif français ou avec un accord préalable (S2)."],
      ["Ce qui reste à votre charge", "Avec la LAMal, vous payez la franchise de 300 CHF par adulte, puis 10 % des frais jusqu’à 700 CHF par an (350 CHF par enfant). En France, il s’agit du ticket modérateur, souvent couvert par une mutuelle. Une assurance complémentaire reste facultative dans les deux cas."],
      ["La famille", "Avec la LAMal, chaque membre paie sa prime, chez le même assureur. En France, le conjoint sans activité et les enfants sont rattachés sans cotisation supplémentaire."],
      ["Le revenu qui évolue", "La cotisation française suit vos revenus de l’avant-dernière année : elle augmente avec votre salaire. La prime LAMal ne dépend pas du revenu, mais de l’âge et de l’assureur, et change chaque année."],
    ] as [string, string][],
  },
  en: {
    titre: "Why is the choice final in principle?",
    chapo:
      "The right of option comes from the agreement on the free movement of persons between Switzerland and the European Union (Annex II). You use it once, for yourself and your relatives who are not in paid work, and it is not reopened when your situation changes.",
    points: [
      ["Three months to choose", "The period starts when you begin working in Switzerland, or when you move to France if you already work in Switzerland. The “Choix du système” form, stamped by your CPAM, goes to the health insurance office of the canton where you work (in Geneva, the health insurance service; in Vaud, the OVAM)."],
      ["No choice means LAMal", "A tacit choice is not valid. If no form arrives in time, you are automatically enrolled in LAMal, and a late choice without a valid excuse can lead to a premium surcharge."],
      ["What reopens the choice", "A new first job in Switzerland after a break, a return to work after a foreign scheme (for example unemployment in France), a move to France, or retirement."],
      ["What does not reopen it", "A new contract with no break, a change of employer or canton, a marriage, a divorce or a birth."],
    ] as [string, string][],
    sourcesTitre: "Official sources",
    sources: [
      ["FOPH (OFSP), health insurance for cross-border workers", SOURCES_OPTION.ofsp],
      ["CLEISS, right of option for France-Switzerland cross-border workers", SOURCES_OPTION.cleiss],
      ["State of Geneva, health insurance for cross-border workers living in France (page updated on 10.11.2026)", SOURCES_OPTION.ge],
      ["OAMal (Health Insurance Ordinance), art. 2 para. 6 (right of option under the AFMP), Fedlex", SOURCES_OPTION.oamal],
      ["Urssaf, working in Switzerland: declaring your income", SOURCES_OPTION.urssaf],
    ] as [string, string][],
    nuancesTitre: "What the price does not tell you",
    nuances: [
      ["Where to get treatment", "With LAMal, in Switzerland and in France (form S1 from the CPAM, the French local health insurance fund). With French health insurance, in France; in Switzerland, emergencies are covered, and non-urgent care at the French rate or with prior approval (S2)."],
      ["What you still pay yourself", "With LAMal, you pay the CHF 300 deductible per adult, then 10% of costs up to CHF 700 per year (CHF 350 per child). In France, you pay the patient co-payment (ticket modérateur), which a top-up policy (mutuelle) often covers. Top-up cover is optional in both cases."],
      ["The family", "With LAMal, each member pays their own premium, with the same insurer. In France, a spouse or partner not in paid work and the children are attached with no extra contribution."],
      ["Income that changes", "The French contribution follows your income from the year before last, so it rises with your salary. The LAMal premium does not depend on income, only on age and insurer, and changes every year."],
    ] as [string, string][],
  },
};

export function FrontalierOption({ locale }: { locale: Locale }) {
  const t = TXT[locale];
  return (
    <>
      <section className="droit-option" aria-labelledby="droit-option-titre">
        <Card><CardContent>
        <h2 id="droit-option-titre">{t.titre}</h2>
        <p>{t.chapo}</p>
        <dl>
          {t.points.map(([dt, dd]) => (
            <div key={dt}><dt>{dt}</dt><dd>{dd}</dd></div>
          ))}
        </dl>
        <p className="source-outil">
          {t.sourcesTitre}
          {locale === "fr" ? `${T}: ` : ": "}
          {t.sources.map(([l, u], i) => (
            <span key={u}>{i ? (locale === "fr" ? ` ;${" "}` : "; ") : ""}<a href={u} rel="noopener">{l}</a></span>
          ))}
          .
        </p>
        </CardContent></Card>
      </section>
      <section className="nuances">
        <h2>{t.nuancesTitre}</h2>
        <dl>
          {t.nuances.map(([dt, dd]) => (
            <div key={dt}><dt>{dt}</dt><dd>{dd}</dd></div>
          ))}
        </dl>
      </section>
    </>
  );
}
