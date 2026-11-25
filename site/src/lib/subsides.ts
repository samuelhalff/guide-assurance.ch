/* Subsides d'assurance maladie 2027 : textes (FR, EN) et accès aux données pour la page et l'outil. Les chiffres viennent de
   src/data/subsides-2027.json (voir data/scripts/build_subsides.py) et de la prime moyenne cantonale OFSP 2027 du baromètre. */
import B from "@/data/barometre.json";
import { DONNEES as D, type Canton, type Primes } from "@/lib/engines/subsides";

export const RELEVE_LE = D.releve_le;
export const NOMS: Record<Canton, { fr: string; en: string }> = {
  GE: { fr: "Genève", en: "Geneva" },
  VD: { fr: "Vaud", en: "Vaud" },
  FR: { fr: "Fribourg", en: "Fribourg" },
  VS: { fr: "Valais", en: "Valais" },
  NE: { fr: "Neuchâtel", en: "Neuchâtel" },
  JU: { fr: "Jura", en: "Jura" },
};

/* Prime moyenne cantonale 2027 de l'OFSP par catégorie (une seule base de prix de l'outil). */
export function primesOfsp(c: Canton): Primes {
  const o = B.cantons.find((x) => x.code === c)!.officiel;
  return { adulte: o.adulte, jeuneAdulte: o.jeune ?? 0, enfant: o.enfant ?? 0 };
}
export const OFSP_LU = B.date_donnees;

type T2 = { fr: string; en: string };

/* Revenu à saisir, propre à chaque canton, et où le lire. */
export const REVENU: Record<Canton, { nom: T2; aide: T2 }> = {
  GE: {
    nom: { fr: "Revenu déterminant unifié (RDU)", en: "Unified determining income (RDU)" },
    aide: {
      fr: "Le RDU figure sur votre attestation RDU, que Genève délivre en ligne (voir la FAQ des subsides sur ge.ch). Il se fonde sur la taxation 2025. S’il y a un jeune adulte à charge qui vit chez vous, ajoutez son RDU au vôtre. Au-delà de 200 000 francs de revenu brut ou de 250 000 francs de fortune brute, le droit se calcule autrement et cet outil ne s’applique pas.",
      en: "The RDU is shown on your RDU certificate, which Geneva issues online (see the subsidies FAQ on ge.ch). It is based on the 2025 tax assessment. If a young adult who lives with you counts as a dependant, add their RDU to yours. Above CHF 200,000 gross income or CHF 250,000 gross wealth the entitlement is worked out differently and this tool does not apply.",
    },
  },
  VD: {
    nom: { fr: "Revenu déterminant unifié (RDU), avant déduction pour enfants", en: "Unified determining income (RDU), before the child deduction" },
    aide: {
      fr: "Si vous touchez déjà un subside, le RDU est sur la décision de l’OVAM. Sinon, l’OVAM le calcule à partir de votre décision de taxation (revenu net, rachats du 2e pilier au-delà de 20 000 francs, versements 3a, déduction forfaitaire pour les primes, plus 6,7 % de la fortune au-delà de 60 000 francs, ou 120 000 pour un couple, dettes non déduites) : choisissez alors « Avec ma décision de taxation ». L’outil retire lui-même la déduction pour enfants.",
      en: "If you already receive a subsidy, the RDU is on the OVAM decision. Otherwise the OVAM works it out from your tax assessment (net income, second-pillar buy-ins above CHF 20,000, pillar 3a payments, a flat deduction for premiums, plus 6.7% of wealth above CHF 60,000, or CHF 120,000 for a couple, debts not deducted): in that case choose “With my tax assessment”. The tool subtracts the child deduction itself.",
    },
  },
  FR: {
    nom: { fr: "Revenu déterminant", en: "Determining income" },
    aide: {
      fr: "La Caisse de compensation le calcule à partir de l’avis de taxation 2025, pour un salarié ou un rentier : revenu net (code 4.910), plus les primes et cotisations d’assurance (codes 4.110 à 4.140), les intérêts passifs privés au-delà de 30 000 francs (4.210), les frais d’entretien d’immeubles au-delà de 15 000 francs (4.310) et 5 % de la fortune imposable (7.910). Il figure aussi sur sa décision.",
      en: "The compensation office works it out from the 2025 tax assessment, for an employee or pensioner: net income (code 4.910), plus insurance premiums and contributions (codes 4.110 to 4.140), private interest paid above CHF 30,000 (4.210), property upkeep above CHF 15,000 (4.310) and 5% of taxable wealth (7.910). It is also on its decision.",
    },
  },
  VS: { nom: { fr: "", en: "" }, aide: { fr: "", en: "" } },
  NE: {
    nom: { fr: "Revenu déterminant", en: "Determining income" },
    aide: {
      fr: "Il figure sur votre décision de classification. À défaut, il se compose du revenu effectif de la déclaration fiscale 2026 (chiffre 5.5, sans la valeur locative privée, à quelques déductions près) plus 30 % de la fortune effective après déduction de 4 000 francs (personne seule), 8 000 francs (couple) et 2 000 francs par enfant mineur, au maximum 10 000 francs par unité économique.",
      en: "It is on your classification decision. Otherwise it is made up of the effective income on the 2026 tax return (item 5.5, without the private rental value, after a few deductions) plus 30% of effective wealth after deducting CHF 4,000 (single person), CHF 8,000 (couple) and CHF 2,000 per minor child, up to CHF 10,000 per household unit.",
    },
  },
  JU: {
    nom: { fr: "Revenu déterminant (RDU)", en: "Determining income (RDU)" },
    aide: {
      fr: "L’ECAS l’indique sur sa décision de réduction de primes. Il se calcule à partir de l’avis de taxation 2025, selon l’article 1 de l’arrêté 2027 (revenu imposable corrigé, déductions pour adultes et enfants, plus 5 % de la fortune imposable).",
      en: "The ECAS states it on its premium-reduction decision. It is worked out from the 2025 tax assessment under article 1 of the 2027 order (adjusted taxable income, deductions for adults and children, plus 5% of taxable wealth).",
    },
  },
};

/* Comment obtenir le subside : une phrase par canton, tirée des pages officielles. */
export const DEMARCHE: Record<Canton, T2> = {
  GE: {
    fr: "Le subside est en principe accordé automatiquement d’après la taxation d’il y a deux ans, et votre assureur le déduit de vos primes. Certaines personnes doivent déposer une demande au SAM avant le 30 novembre 2027, notamment les jeunes adultes nés entre 2002 et 2008 et les personnes imposées à la source.",
    en: "The subsidy is normally granted automatically from the tax assessment of two years earlier, and your insurer deducts it from your premiums. Some people must apply to the SAM before 30 November 2027, in particular young adults born between 2002 and 2008 and people taxed at source.",
  },
  VD: {
    fr: "Le subside se demande en ligne ou auprès de l’agence d’assurances sociales de votre région ; le droit naît le premier jour du deuxième mois qui suit le dépôt. L’OVAM décide, puis verse le subside à votre assureur.",
    en: "You apply online or at the social insurance agency for your region; entitlement starts on the first day of the second month after you apply. The OVAM decides, then pays the subsidy to your insurer.",
  },
  FR: {
    fr: "La demande se dépose auprès de la Caisse de compensation au plus tard le 31 août 2027 ; le droit de celles et ceux qui touchaient déjà une réduction à fin 2026 est examiné d’office. La réduction est versée à l’assureur.",
    en: "You apply to the compensation office by 31 August 2027 at the latest; the entitlement of people who already received a reduction at the end of 2026 is reviewed automatically. The reduction is paid to the insurer.",
  },
  VS: {
    fr: "Pour 2026, le droit est déterminé d’office sur les données fiscales. Le barème 2027 n’est pas encore publié.",
    en: "For 2026 the entitlement is determined automatically from tax data. The 2027 scale has not been published yet.",
  },
  NE: {
    fr: "Votre droit est calculé automatiquement d’après votre dernière taxation ; si vous avez nouvellement droit à un subside, un coupon-réponse arrive et doit être renvoyé dans les 30 jours. Les personnes de 19 à 25 ans seules et celles imposées à la source doivent s’adresser à leur guichet social régional.",
    en: "Your entitlement is calculated automatically from your latest tax assessment; if you are newly entitled, a reply slip arrives and must be returned within 30 days. Single people aged 19 to 25 and people taxed at source must contact their regional social office.",
  },
  JU: {
    fr: "Les personnes taxées définitivement pour 2025 sont informées d’office par l’ECAS ; sans information, une demande est possible jusqu’au 31 décembre 2027.",
    en: "People with a final 2025 assessment are informed automatically by the ECAS; without a notice, you can apply until 31 December 2027.",
  },
};

/* Ce que l'outil ne couvre pas, par canton. */
export const LIMITES_OUTIL: Record<Canton, T2> = {
  GE: { fr: "Jusqu’à quatre charges légales (enfants et jeunes adultes à charge), comme le barème publié.", en: "Up to four legal dependants (children and young adult dependants), as in the published scale." },
  VD: { fr: "Adultes de 26 ans et plus et enfants. Les jeunes adultes de 19 à 25 ans ont des règles propres. L’OVAM refuse le subside si la fortune mobilière dépasse 130 000 francs (260 000 pour un couple) : ce seuil est vérifié avec la décision de taxation, pas quand vous saisissez directement votre RDU. Un taux d’activité trop bas peut aussi entraîner un refus : ce n’est pas vérifié ici.", en: "Adults aged 26 and over and children. Young adults aged 19 to 25 follow separate rules. The OVAM refuses the subsidy if movable wealth exceeds CHF 130,000 (CHF 260,000 for a couple): this threshold is checked with the tax assessment, not when you enter your RDU directly. An activity rate that is too low can also lead to a refusal: this is not checked here." },
  FR: { fr: "Jusqu’à six enfants à charge (jeunes adultes en formation compris). Le droit est refusé au-delà de 150 000 francs de revenu net ou de 250 000 francs de fortune imposable, et en cas de taxation d’office.", en: "Up to six dependent children (young adults in training included). The entitlement is refused above CHF 150,000 net income or CHF 250,000 taxable wealth, and after an estimated assessment." },
  VS: { fr: "", en: "" },
  NE: { fr: "Adultes de 26 ans et plus et jusqu’à trois enfants mineurs. Les montants sont ceux de la franchise ordinaire : ils baissent dans la même mesure que les rabais des assureurs pour une franchise à option ou un modèle alternatif.", en: "Adults aged 26 and over and up to three minor children. The amounts are those for the standard deductible: they fall by the same amount as the insurers’ discounts for a higher deductible or an alternative model." },
  JU: { fr: "Adultes, enfants de moins de 18 ans et jeunes adultes en formation de moins de 25 ans. La fortune disponible doit rester sous 150 000 francs ; les enfants de 16 à 18 ans hors formation ont des montants distincts, non repris ici.", en: "Adults, children under 18 and young adults in training under 25. Available wealth must stay below CHF 150,000; children aged 16 to 18 who are not in training have separate amounts, not covered here." },
};

/* Vaud : ce que l'estimation applique et ce qui n'a pas pu être comparé (dite une fois par endroit où l'estimation paraît). */
export const TRANSPARENCE_VD: T2 = {
  fr: "Cette estimation applique les formules du règlement cantonal (art. 21 RLVLAMal) avec les paramètres 2027 de l’arrêté du 7 octobre 2026. Elle reproduit les exemples de la notice officielle 2027 et donne les mêmes montants que l’estimateur en ligne du canton (version 2026, dont les paramètres pour les adultes sont les mêmes) sur les cas que nous avons vérifiés le 24 novembre 2026. Le RDU est reconstitué comme l’estimateur le fait, d’après l’article 4 du règlement d’application de la loi sur l’harmonisation (RLHPS) et la notice 2027.",
  en: "This estimate applies the formulas of the cantonal regulation (art. 21 RLVLAMal) with the 2027 parameters of the order of 7 October 2026. It reproduces the examples in the official 2027 notice and gives the same amounts as the canton’s online estimator (2026 version, whose adult parameters are the same) on the cases we checked on 24 November 2026. The RDU is built the way the estimator builds it, following article 4 of the implementing regulation of the harmonisation act (RLHPS) and the 2027 notice.",
};
