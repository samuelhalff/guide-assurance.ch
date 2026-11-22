---
slug: /methodologie/
title: "Méthodologie : sources, dates et limites des outils"
description: "Nos chiffres viennent de l’OFSP, de Fedlex et de la formule publique de l’Urssaf. Cette page explique comment nous les datons et les vérifions."
h1: "Méthodologie : d’où viennent nos chiffres"
rubrique: legal
updated: 2026-11-22
sources:
  - { label: "Priminfo, primes LAMal (OFSP)", url: "https://www.priminfo.admin.ch" }
  - { label: "OFSP, primes 2027 (communiqué du 29.09.2026)", url: "https://www.bag.admin.ch/fr/newnsb/BfuGvedj0OOX" }
  - { label: "Fedlex, recueil systématique du droit fédéral", url: "https://www.fedlex.admin.ch" }
  - { label: "Urssaf, simulateur mon-entreprise (code source ouvert)", url: "https://mon-entreprise.urssaf.fr" }
outils: [simulateur-frontalier, lettre-resiliation]
faq:
  - q: "D’où viennent les primes affichées sur Guide Assurance ?"
    a: "Elles viennent des tableaux de primes publiés par l’Office fédéral de la santé publique (OFSP). Les primes 2027 ont été approuvées et publiées le 29.09.2026."
  - q: "Les listes d’assureurs sont-elles complètes ?"
    a: "Oui. Quand un outil affiche des assureurs, il les affiche tous, triés selon un critère indiqué à l’écran, par exemple la prime du foyer. Aucun assureur n’est mis en avant."
  - q: "Comment savoir si un chiffre est à jour ?"
    a: "Chaque page indique sa date de mise à jour, et chaque chiffre son année et sa source. Un montant pas encore publié officiellement est signalé comme provisoire."
---

Les primes publiées sur Guide Assurance viennent de l’OFSP, les règles légales de Fedlex et la cotisation française des frontaliers de la formule de l’Urssaf. Chaque chiffre porte son année et sa source ; les limites des outils sont détaillées plus bas.

## D’où viennent les chiffres ?

- Les primes de l’assurance maladie proviennent des tableaux de l’OFSP (Office fédéral de la santé publique), publiés sur priminfo.admin.ch et opendata.swiss. Les primes 2027 ont été approuvées et publiées le 29.09.2026. Pour les frontaliers, nous utilisons les tableaux de primes des résidents de l’UE.
- Les règles légales sont tirées des textes consolidés de Fedlex, le recueil officiel du droit fédéral (LAMal, OAMal, LCA, LAA, OLAA, LPP, OPP 3, CO, LCR, OAV, OS). Chaque article cité renvoie au texte.
- Les montants annuels, comme les plafonds 3a, les seuils LPP ou la rente AVS, sont repris des communiqués du Conseil fédéral et de l’OFAS.
- La cotisation française des frontaliers suit la formule du simulateur public de l’Urssaf (mon-entreprise.urssaf.fr), publiée en code source ouvert. Nous avons lu cette logique directement et repris ses cas de test.
- Les règles cantonales viennent des sites officiels des cantons et des établissements cantonaux d’assurance.

Nous n’utilisons pas de sources privées pour une règle ou un chiffre publié comme acquis. Quand une information ne vient que d’une source secondaire, la page le dit.

## Comment les chiffres sont-ils datés et vérifiés ?

- Chaque page porte une date de mise à jour, et les chiffres sont ceux connus à cette date.
- Chaque chiffre est donné avec son année et sa source.
- Un montant calculé par nous, ou pas encore publié officiellement, est signalé comme tel (par exemple « montant calculé selon l’art. 8 LPP, publication officielle attendue »).
- Une règle que nous n’avons pas encore pu vérifier dans un texte officiel est soit omise, soit présentée avec cette réserve.
- Nous revoyons les pages quand les primes ou la loi changent, en particulier à la publication des primes chaque automne et au 1er janvier de chaque année.

## Les listes sont-elles complètes et comment sont-elles triées ?

Quand un outil affiche des assureurs, la liste est complète pour la situation saisie et triée selon un critère affiché (par exemple la prime annuelle du foyer). Il n’y a ni badge, ni recommandation, ni place payée. Guide Assurance compare des chiffres et ne recommande aucun contrat (art. 182a OS).

## Ce que les outils ne prennent pas en compte

### Lettre de résiliation

- Elle applique les délais légaux. Vos conditions générales peuvent prévoir des délais plus favorables, et votre contrat fait foi.
- Elle ne vérifie pas si vous avez des primes impayées, qui bloquent un changement d’assureur de base.
- Elle n’envoie rien : c’est à vous d’imprimer, de signer et d’envoyer la lettre.

### Simulateur frontalier

- Le PASS 2027 (plafond de la sécurité sociale française) n’est pas encore publié, si bien que les cotisations 2027 sont des estimations.
- Le taux de change est une hypothèse que vous pouvez modifier.
- La prime sans accident suppose que vous en fassiez la demande à l’assureur, avec une attestation de l’employeur.
- Le simulateur ne calcule pas le cas d’un conjoint qui travaille à son compte, est au chômage ou à la retraite ; la page affiche alors un avertissement.
- Si votre conjoint est aussi frontalier, le simulateur compare seulement les cas où vous faites tous deux le même choix.
- Le prix n’est qu’un des critères. L’accès aux soins dans chaque pays, la participation aux coûts et le caractère irrévocable du choix comptent aussi.

### Tous les outils

Le calcul se fait dans votre navigateur et nous ne recevons pas vos données (voir [Confidentialité](/confidentialite/)).

## Comment signaler une erreur ?

Si vous voyez une erreur ou un chiffre dépassé, écrivez à {{CONTACT_EMAIL}} en indiquant la page. Nous corrigeons la page et changeons sa date de mise à jour.

## Ce que cette page ne couvre pas

Cette page ne détaille pas chaque calcul ligne par ligne. Les données de primes de référence sont celles de l’OFSP sur [priminfo.admin.ch](https://www.priminfo.admin.ch) ; les textes de loi sont sur [Fedlex](https://www.fedlex.admin.ch).
