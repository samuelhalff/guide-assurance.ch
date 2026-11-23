# Données ouvertes de l'OFSP (primes par région)

Fichiers listés sur opendata.swiss (jeu « Prämien der obligatorischen Krankenpflegeversicherung ») :

- Archiv_Praemien_2026.zip : https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL0FyY2hpdl9QcmFlbWllbl8yMDI2LnppcA%3D%3D
- Prämien_CH.csv (2027) : https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL1Byw6RtaWVuX0NILmNzdg%3D%3D

Les 22 et 23.11.2026, le serveur opendata.bagnet.ch répondait HTTP 500 à toutes les requêtes (page d'accueil comprise),
avec ou sans cookie de session ; ni la Wayback Machine ni Priminfo n'ont les primes 2026 par région.
Le baromètre 2027 (data/scripts/build_barometre.py) s'appuie donc sur les moyennes cantonales officielles
(data/primes-2027-romandie.json) pour la hausse, et sur les primes 2027 relevées sur Priminfo pour les écarts par région.
Si le téléchargement fonctionne de nouveau, placer l'archive ici ; le script n'en a pas besoin pour 2028
(il compare aux fichiers site/public/data/primes-2027 conservés).
