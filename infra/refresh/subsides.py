#!/usr/bin/env python3
"""Subsides d'assurance maladie 2027 : veille mensuelle, alerte seulement.

Les barèmes de site/src/data/subsides-2027.json sont lus à la main dans les textes officiels des cantons
(data/scripts/build_subsides.py, sources dans data/sources/subsides-2027/). Chaque mois, ce script relit les pages et
les PDF officiels (lecteur de data/scripts/taux_3a.py : HTTP, PDF, navigateur sans tête en secours) et compare :
  1. l'empreinte SHA-256 du texte de chaque source (normalisé) à celle du passage précédent (state/subsides.json) ;
  2. la présence des chiffres témoins (barème 2027) dans le texte ;
  3. pour le Valais : l'apparition d'une échelle 2027, qui ferait passer le canton de « information » à « calculé ».
Source modifiée, témoin disparu, échelle valaisanne 2027 publiée ou page illisible -> e-mail « données à vérifier ».
Rien n'est écrit sur le site.

  python3 infra/refresh/subsides.py [--dry-run] [--simulate-change] [--simulate-parser-failure]
"""
from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402
from taux3a import load_module  # noqa: E402

DS = "subsides"

# (identifiant, adresse, témoins) : les témoins sont des chiffres ou des mots du barème 2027 qui doivent rester dans le texte.
SOURCES = [
    ("GE barème 2027 (PDF)", "https://www.ge.ch/document/45327/telecharger", ["Catégorie des subsides 2027", "363", "30'000", "151'000", "169'000"]),
    ("GE demander un subside 2027", "https://www.ge.ch/demander-subside-assurance-maladie-2027", ["subside d'assurance-maladie 2027"]),
    ("VD arrêté 2027 (PDF)", "https://www.vd.ch/fileadmin/user_upload/themes/social/Prestations__assurance_et_soutien/Assurance_maladie/Subside/Arr%C3%AAt%C3%A9_subsides_2027_-_publi%C3%A9.pdf", ["en 2027", "331 fr", "17'000 fr", "76'000 fr", "336 fr"]),
    ("VD notice 2027 (PDF)", "https://www.vd.ch/fileadmin/user_upload/themes/social/Prestations__assurance_et_soutien/Assurance_maladie/Subside/Notice_explicative_2027.pdf", ["SUBSIDES 2027", "331", "336"]),
    ("FR mémento 2027 (PDF)", "https://assets.caisseavsfr.ch/Htdocs/Files/v/4f6bfbf50f1010b816ac65b074846a93413131691801f20d6a7859c42570fc87.pdf/memento_rpi_f_2027.pdf?download=1", ["assurance-maladie 2027", "65'000", "596", "35,71 %"]),
    ("NE page 2027", "https://www.ne.ch/themes/social/assurance-maladie/subsides-assurance-maladie-lamal-2027-classifications-et-montants-selon-le-revenu-determinant", ["Classification S15", "639", "22800", "30000"]),
    ("NE arrêté 2027 (PDF)", "https://www.ne.ch/sites/default/files/2026-11/ACE_Subsides_2027.pdf", ["année 2027", "639", "671"]),
    ("JU arrêté 2027 (PDF)", "https://www.ecasjura.ch/Htdocs/Files/v/541cd94ec24dffb7fc02171685bae264d91cd58fd7914cfc04fa4371e612e6cb.pdf/Arrete-2027-avec-annexes.pdf?download=1", ["année 2027", "225.00", "108.00", "204.00"]),
    ("JU communiqué du 23.10.2026", "https://www.jura.ch/fr/Autorites/Administration/CHA/SIC/Centre-medias/Communiques-2026/Subsides-des-primes-de-l-assurance-maladie-dans-le-canton-du-Jura-pour-2027.html", ["26 999", "52 999", "330 francs"]),
    ("VS page de la Caisse (échelle 2026 seule en ligne)", "https://www.avsvalais.ch/fr/Assurances/RIP-Reduction-individuelle-des-primes-caisse-maladie.html", ["Échelle complète 2026"]),
]
# Valais : si l'un de ces textes apparaît, l'échelle 2027 est publiée et le canton doit être repris (calcul ou fiche).
VS_URL = SOURCES[-1][1]
VS_SIGNAUX = ["Échelle complète 2027", "Primes de références 2027", "subsides 2027 est déterminé", "droit aux subsides 2027"]


def lire(T, url: str) -> str:
    try:
        raw, _, ctype = T.http_get(url)
        lines = T.pdf_to_lines(raw) if raw.startswith(b"%PDF") else T.html_to_lines(T.decode(raw, ctype))
    except RuntimeError:
        lines = T.html_to_lines(T.render(url))
    return " ".join(lines)


def norm(texte: str) -> str:
    return re.sub(r"[\s  ]+", " ", texte).strip()


def empreinte(texte: str) -> str:
    # Chiffres de date et d'heure retirés : un horodatage dans la page ne doit pas déclencher d'alerte.
    t = re.sub(r"\d{1,2}[.:/]\d{2}([.:/]\d{2,4})?", "", norm(texte).lower())
    return hashlib.sha256(t.encode()).hexdigest()


def run(log: C.Log, a) -> int:
    T = load_module()
    avant = C.load_state(DS).get("empreintes") or {}
    apres: dict[str, str] = {}
    changees, temoins, illisibles, signaux = [], [], [], []
    for i, (sid, url, ws) in enumerate(SOURCES):
        try:
            texte = norm(lire(T, url))
        except Exception as e:  # noqa: BLE001
            illisibles.append(f"{sid} ({url}) : {e}")
            continue
        if a.simulate_parser_failure and i == 0:
            texte = ""
            log("[simulation] première source illisible")
        if len(texte) < 200:
            illisibles.append(f"{sid} ({url}) : texte vide ou presque")
            continue
        h = empreinte(texte)
        if a.simulate_change and not changees:
            h = "0" * 64
            log(f"[simulation] source modifiée : {sid}")
        apres[url] = h
        if url in avant and avant[url] != h:
            changees.append(f"{sid} : <a href='{url}'>{url}</a>")
        manquants = [w for w in ws if norm(w).lower() not in texte.lower()]
        if manquants:
            temoins.append(f"{sid} : « {' », « '.join(manquants)} » introuvable sur <a href='{url}'>la source</a>")
        if url == VS_URL:
            signaux = [s for s in VS_SIGNAUX if s.lower() in texte.lower()]
        log(f"  {sid} : {'nouvelle' if url not in avant else ('modifiée' if avant[url] != h else 'identique')}" + (f", témoins absents : {manquants}" if manquants else ""))
    C.save_state(DS, empreintes={**avant, **apres})
    n = len(SOURCES)
    if len(illisibles) > n / 2:
        C.record_run(DS, "echec", f"{len(illisibles)} sources sur {n} illisibles", success=False)
        C.alert(log, DS, "données à vérifier", [f"Veille des subsides : {len(illisibles)} sources sur {n} illisibles.", "<br>".join(illisibles)], a.dry_run)
        return 1
    if changees or temoins or illisibles or signaux:
        p = ["Veille des subsides d'assurance maladie 2027 (barèmes lus le 24.11.2026, site/src/data/subsides-2027.json)."]
        if signaux:
            p.append("Valais : l'échelle 2027 semble publiée (" + ", ".join(signaux) + "). Reprendre le canton dans data/scripts/build_subsides.py.")
        if temoins:
            p.append("Chiffres témoins absents, barème probablement modifié :<br>" + "<br>".join(temoins))
        if changees:
            p.append("Sources modifiées depuis le dernier passage (à relire) :<br>" + "<br>".join(changees))
        if illisibles:
            p.append("Sources illisibles ce mois :<br>" + "<br>".join(illisibles))
        p.append("Rien n'a été modifié sur le site : les barèmes passent par une mise à jour vérifiée du fichier de données.")
        C.record_run(DS, "alerte", f"{len(temoins)} témoins absents, {len(changees)} sources modifiées, {len(illisibles)} illisibles, Valais 2027 : {'oui' if signaux else 'non'}", success=True)
        C.alert(log, DS, "données à vérifier", p, a.dry_run, dedupe_days=30)
        return 1
    C.record_run(DS, "ok", f"{n} sources identiques, témoins présents, Valais 2027 non publié", success=True)
    return 0


if __name__ == "__main__":
    sys.exit(C.run_main(DS, run, C.base_args(__doc__).parse_args()))
