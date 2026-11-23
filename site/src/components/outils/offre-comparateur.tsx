"use client";
import { forwardRef } from "react";
import { CaptureRappel, type CaptureRappelHandle } from "@/components/demande/capture-rappel";
import { ecrireProfilPrime, type ProfilPrime } from "@shared/demande/details";
import { ecrirePreremplissage, lienDemande } from "@/lib/demande";

/* Bloc « Recevoir des offres pour ce profil », sous le résumé du comparateur de primes.
   Le résultat reste entièrement visible sans rien donner : ce bloc est une option, jamais une condition.
   Porte « sante » : le profil saisi dans le comparateur part avec la demande (NPA, années, franchises, accident,
   taille du foyer). Promesse tirée des données (écart réel entre la prime la plus haute et la plus basse), sans
   conseil ni classement. */

type Locale = "fr" | "en";
const NNBSP = " ";

const T = {
  fr: {
    titre: "Recevoir des offres pour ce profil",
    ecart: (x: string) => `Pour ce profil, la prime la plus haute dépasse la plus basse de ${x} par an, redistribution déduite.`,
    suite: "Laissez votre nom et votre numéro. Un conseiller d’un courtier partenaire vous rappelle avec des offres calculées pour ce profil, sans que vous ayez à le décrire une deuxième fois.",
    envoyer: "Recevoir des offres",
    merciPlus: "Il reçoit le profil saisi ici, vous n’aurez pas à le redonner.",
    complet: `Vous préférez tout décrire vous-même${NNBSP}?`,
    completLien: "Remplir la demande complète",
  },
  en: {
    titre: "Get offers for this profile",
    ecart: (x: string) => `For this profile, the highest premium is ${x} a year above the lowest, after the redistribution.`,
    suite: "Leave your name and number. An adviser from a partner broker will call you back with offers worked out for this profile, so you will not have to describe it again.",
    envoyer: "Get offers",
    merciPlus: "They receive the profile you entered here, so you will not have to give it again.",
    complet: "Would you rather describe everything yourself?",
    completLien: "Fill in the full request",
  },
} as const;

export type ProfilComparateur = { npa: string; personnes: ProfilPrime[] };
export type OffreComparateurHandle = CaptureRappelHandle;

export const OffreComparateur = forwardRef<
  OffreComparateurHandle,
  {
    locale: Locale;
    profil: ProfilComparateur;
    /** Écart annuel entre la prime la plus haute et la plus basse, déjà formaté (null s'il n'y a qu'une offre). */
    ecartAn: string | null;
    onEnvoyee?: () => void;
  }
>(function OffreComparateur({ locale, profil, ecartAn, onEnvoyee }, ref) {
  const t = T[locale];
  const p1 = profil.personnes[0];
  const foyer = Math.min(4, profil.personnes.length);
  return (
    <CaptureRappel
      ref={ref}
      locale={locale}
      idBase="offre-comparateur"
      className="offre-comparateur"
      titre={t.titre}
      intro={
        <>
          {ecartAn ? <p className="capture-promesse">{t.ecart(ecartAn)}</p> : null}
          <p>{t.suite}</p>
        </>
      }
      bouton={t.envoyer}
      demande={() => ({
        porte: "sante",
        besoin: ["lamal"],
        residence: { livesInSwitzerland: true, npa: profil.npa, birthYear: p1.annee, householdSize: foyer },
        details: { comparateur: profil.personnes.map(ecrireProfilPrime) },
      })}
      merciPlus={t.merciPlus}
      evenements={{ vue: "offre_comparateur_vue", envoyee: "offre_comparateur_envoyee" }}
      complet={{
        question: t.complet,
        texte: t.completLien,
        href: lienDemande(locale, "sante"),
        onClick: () => ecrirePreremplissage({ porte: "sante", besoin: ["lamal"], npa: profil.npa, birthYear: p1.annee, householdSize: foyer }),
      }}
      onFin={(envoyee) => envoyee && onEnvoyee?.()}
    />
  );
});
