import type { FaqOutil } from "@/components/site/faq-sections";
import type { Locale } from "@/lib/i18n";

/* Questions de la page « Protection juridique : ce que couvrent les contrats ». Le même tableau alimente le JSON-LD
   FAQPage. Faits tirés des CGA lues le 23.11.2026 (src/data/garanties-pj.json) et des art. 161 et 167 OS. */
export const OS_URL = "https://www.fedlex.admin.ch/eli/cc/2005/735/fr#art_167";
const OS_161 = "https://www.fedlex.admin.ch/eli/cc/2005/735/fr#art_161";
export const OS_167: Record<Locale, string> = {
  fr: "art. 161 à 170 de l’ordonnance sur la surveillance (OS, RS 961.011), art. 167 : choix d’un mandataire",
  en: "art. 161 to 170 of the Insurance Supervision Ordinance (OS, SR 961.011), art. 167: choice of a representative",
};

export const FAQ_PJ: Record<Locale, FaqOutil[]> = {
  fr: [
    {
      q: "Que couvre une assurance protection juridique ?",
      a: [
        "L’assureur prend en charge les frais d’un litige, ou le traite lui-même avec son service juridique (art. 161 OS). Il paie en général les honoraires d’avocat, les frais de justice et d’expertise et les dépens dus à la partie adverse, jusqu’au plafond prévu par cas.",
        "Les domaines couverts dépendent du contrat. Une protection juridique privée vise la vie courante : travail, bail, achats, litiges avec une assurance. Une protection juridique circulation vous suit comme conducteur ou détenteur d’un véhicule : accident, retrait de permis, achat ou réparation du véhicule.",
      ],
      src: <>Texte : <a href={OS_161}>art. 161 OS (Fedlex)</a>.</>,
    },
    {
      q: "Qu’est-ce que le délai de carence ?",
      a: [
        "C’est la période qui suit la conclusion du contrat pendant laquelle certains litiges ne sont pas couverts. Dans les CGA lues, il va de zéro (Generali Top, Orion circulation) à trois mois (Coop, Helvetia, smile), et monte à un an pour quelques domaines, comme le divorce chez CAP ou la succession chez Orion.",
        "La plupart des contrats renoncent à ce délai si vous passez d’une autre protection juridique sans interruption. Mieux vaut donc résilier l’ancien contrat seulement quand le nouveau est signé.",
      ],
    },
    {
      q: "Peut-on choisir son avocat ?",
      a: [
        "Oui, dans deux cas fixés par la loi : quand un avocat doit intervenir dans une procédure judiciaire ou administrative, et en cas de conflit d’intérêts. L’assureur peut refuser l’avocat choisi ; vous pouvez alors en proposer trois autres, et il doit en accepter un (art. 167 OS).",
        "En dehors de ces cas, l’assureur traite souvent le dossier lui-même ou désigne un avocat. Le TCS, par exemple, passe d’abord par un avocat du réseau d’Assista.",
      ],
      src: <>Texte : <a href={OS_URL}>art. 167 OS (Fedlex)</a>.</>,
    },
    {
      q: "Protection juridique privée ou circulation : quelle différence ?",
      a: [
        "La protection privée couvre la vie de tous les jours, mais plusieurs contrats excluent les véhicules à moteur ; celui du TCS ne vous couvre que comme piéton, cycliste ou passager. La protection circulation couvre les litiges liés à la conduite et au véhicule, sans le travail ni le bail.",
        "AXA, Coop et d’autres vendent les deux ensemble, en paquet ou en modules. Si vous conduisez, vérifiez que la circulation figure bien dans le contrat ou dans un module ajouté.",
      ],
    },
    {
      q: "Pourquoi les primes ne sont-elles pas affichées ?",
      a: [
        "La page décrit ce que disent les conditions générales, sans juger quel contrat est le meilleur. Les primes dépendent de votre situation et de la variante choisie, et les assureurs ne publient pas de tarif complet. Les contrats sont listés par ordre alphabétique, sans note ni classement.",
        "Pour connaître le prix d’un contrat qui correspond à vos besoins, vous pouvez demander des offres : un conseiller d’un courtier partenaire vous recontacte, gratuitement.",
      ],
    },
    {
      q: "Pourquoi certains assureurs ne figurent-ils pas dans le tableau ?",
      a: [
        "Seuls figurent les contrats dont nous avons pu télécharger et lire les conditions générales le 23 novembre 2026. Celles de Groupe Mutuel, Baloise, Emmental et Simpego n’étaient pas accessibles en ligne. Celles de Protekta (Mobilière) et de Dextra n’étaient publiques que dans une ancienne édition ou une édition réservée à un distributeur.",
        "La marque n’est pas toujours l’assureur : les contrats Helvetia et smile sont assurés par Coop Protection Juridique, ceux de Generali par Fortuna, ceux du TCS par Assista, et Zurich vend les contrats d’Orion. Le tableau indique l’assureur de chaque contrat.",
      ],
    },
  ],
  en: [
    {
      q: "What does legal protection insurance cover?",
      a: [
        "The insurer pays the costs of a dispute, or handles it itself through its legal department (art. 161 OS). It usually pays lawyer’s fees, court and expert costs and the costs awarded to the other side, up to the limit per case.",
        "The areas covered depend on the policy. Private legal protection covers everyday life: employment, tenancy, purchases, disputes with an insurer. Traffic legal protection covers you as the driver or keeper of a vehicle: accidents, licence withdrawal, buying or repairing the vehicle.",
      ],
      src: <>Text: <a href={OS_161}>art. 161 OS (Fedlex)</a>.</>,
    },
    {
      q: "What is the waiting period?",
      a: [
        "It is the period after the policy starts during which some disputes are not covered. In the terms we read, it ranges from none (Generali Top, Orion traffic) to three months (Coop, Helvetia, smile), and reaches one year for a few areas, such as divorce at CAP or inheritance at Orion.",
        "Most policies waive it if you switch from another legal protection policy without a gap. So it is best to cancel the old policy only once the new one is signed.",
      ],
    },
    {
      q: "Can you choose your own lawyer?",
      a: [
        "Yes, in two cases set by law: when a lawyer is needed for court or administrative proceedings, and in a conflict of interest. The insurer may refuse the lawyer you chose; you can then propose three others, and it must accept one of them (art. 167 OS).",
        "Outside these cases, the insurer often handles the case itself or appoints a lawyer. TCS, for example, first uses a lawyer from Assista’s network.",
      ],
      src: <>Text: <a href={OS_URL}>art. 167 OS (Fedlex)</a>.</>,
    },
    {
      q: "Private or traffic legal protection: what is the difference?",
      a: [
        "Private cover deals with everyday life, but several policies exclude motor vehicles; the TCS policy only covers you as a pedestrian, cyclist or passenger. Traffic cover deals with disputes about driving and the vehicle, without employment or tenancy.",
        "AXA, Coop and others sell both together, as a package or as modules. If you drive, check that traffic is in the policy or in an added module.",
      ],
    },
    {
      q: "Why are premiums not shown?",
      a: [
        "This page describes what the general terms say, without judging which policy is best. Premiums depend on your situation and the variant chosen, and insurers do not publish full price lists. Policies are listed in alphabetical order, with no score or ranking.",
        "To find out the price of a policy that fits your needs, you can ask for quotes: an adviser from a partner broker gets back to you, free of charge.",
      ],
    },
    {
      q: "Why are some insurers missing from the table?",
      a: [
        "The table only includes policies whose general terms we could download and read on 23 November 2026. Those of Groupe Mutuel, Baloise, Emmental and Simpego were not available online. Those of Protekta (Mobiliar) and Dextra were only public in an older edition or an edition for one distributor.",
        "The brand is not always the insurer: Helvetia and smile policies are underwritten by Coop Legal Protection, Generali’s by Fortuna, TCS’s by Assista, and Zurich sells Orion’s policies. The table shows the insurer of each policy.",
      ],
    },
  ],
};
