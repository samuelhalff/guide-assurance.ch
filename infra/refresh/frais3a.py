#!/usr/bin/env python3
"""Frais du 3e pilier (comptes 3a et solutions 3a en titres) : veille mensuelle, alerte seulement.

Les frais sont relevés à la main dans site/src/data/frais-3a.json, avec l'adresse de la page ou de la grille tarifaire
du fournisseur et des « témoins » (chiffres ou mots qui doivent rester sur la page). Aucun fournisseur ne publie ces
frais sous une forme lisible de façon fiable par un script (pages rédigées, PDF, modules JavaScript) : on ne les
réécrit donc jamais automatiquement. Chaque mois, le script relit chaque source (lecteur de data/scripts/taux_3a.py :
HTTP, PDF, navigateur sans tête en secours) et compare :
  1. l'empreinte SHA-256 du texte de la page (normalisé) à celle du passage précédent (state/frais3a.json) ;
  2. la présence de chaque témoin dans le texte.
Page modifiée, témoin disparu ou page illisible -> e-mail « données à vérifier ». Rien n'est écrit sur le site.

  python3 infra/refresh/frais3a.py [--dry-run] [--simulate-change] [--simulate-parser-failure]
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402
from taux3a import load_module  # noqa: E402

DS = "frais3a"
DATA = C.SITE / "src" / "data" / "frais-3a.json"


def sources(data: dict) -> list[dict]:
    out = [{"id": f"compte:{k}", "url": v["url"], "temoins": v.get("temoins") or []} for k, v in data["comptes"].items()]
    out += [{"id": f"titres:{t['id']}", "url": t["url"], "temoins": t.get("temoins") or []} for t in data["titres"]]
    return out


def lire(T, url: str) -> str:
    """Texte normalisé d'une page ou d'un PDF (mêmes fonctions que le relevé des taux 3a)."""
    try:
        raw, _, ctype = T.http_get(url)
        lines = T.pdf_to_lines(raw) if raw.startswith(b"%PDF") else T.html_to_lines(T.decode(raw, ctype))
    except RuntimeError:
        lines = T.html_to_lines(T.render(url))
    return " ".join(lines)


def empreinte(texte: str) -> str:
    # Chiffres de date et d'heure retirés : un horodatage dans la page ne doit pas déclencher d'alerte.
    t = re.sub(r"\d{1,2}[.:/]\d{2}([.:/]\d{2,4})?", "", texte.lower())
    return hashlib.sha256(re.sub(r"\s+", " ", t).strip().encode()).hexdigest()


def run(log: C.Log, a) -> int:
    T = load_module()
    data = json.loads(DATA.read_text())
    avant = (C.load_state(DS).get("empreintes") or {})
    apres: dict[str, str] = {}
    changees, temoins, illisibles = [], [], []
    for s in sources(data):
        url = s["url"]
        try:
            texte = lire(T, url)
        except Exception as e:  # noqa: BLE001
            illisibles.append(f"{s['id']} ({url}) : {e}")
            continue
        if a.simulate_parser_failure and s is sources(data)[0]:
            texte = ""
            log("[simulation] première source illisible")
        if len(texte) < 200:
            illisibles.append(f"{s['id']} ({url}) : texte vide ou presque")
            continue
        h = empreinte(texte)
        if a.simulate_change and not changees:
            h = "0" * 64
            log(f"[simulation] page de {s['id']} modifiée")
        apres[url] = h
        if url in avant and avant[url] != h:
            changees.append(f"{s['id']} : <a href='{url}'>{url}</a>")
        manquants = [w for w in s["temoins"] if w.lower() not in texte.lower()]
        if manquants:
            temoins.append(f"{s['id']} : « {' », « '.join(manquants)} » introuvable sur <a href='{url}'>la page</a>")
        log(f"  {s['id']} : {'nouvelle' if url not in avant else ('modifiée' if avant[url] != h else 'identique')}"
            + (f", témoins absents : {manquants}" if manquants else ""))

    # Les empreintes des pages lues sont gardées ; celles des pages illisibles restent celles du passage précédent.
    C.save_state(DS, empreintes={**avant, **apres})
    n = len(sources(data))
    if len(illisibles) > n / 2:
        C.record_run(DS, "echec", f"{len(illisibles)} sources sur {n} illisibles", success=False)
        C.alert(log, DS, "données à vérifier", [f"Veille des frais 3a : {len(illisibles)} sources sur {n} illisibles.", "<br>".join(illisibles)], a.dry_run)
        return 1
    if changees or temoins or illisibles:
        p = [f"Veille des frais 3a (relevé manuel du {'.'.join(reversed(data['verifie_le'].split('-')))}, site/src/data/frais-3a.json)."]
        if temoins:
            p.append("Chiffres témoins absents, frais probablement modifiés :<br>" + "<br>".join(temoins))
        if changees:
            p.append("Pages modifiées depuis le dernier passage (à relire) :<br>" + "<br>".join(changees))
        if illisibles:
            p.append("Pages illisibles ce mois :<br>" + "<br>".join(illisibles))
        p.append("Rien n'a été modifié sur le site : les frais passent par une mise à jour vérifiée du fichier de données.")
        C.record_run(DS, "alerte", f"{len(temoins)} témoins absents, {len(changees)} pages modifiées, {len(illisibles)} illisibles", success=True)
        C.alert(log, DS, "données à vérifier", p, a.dry_run, dedupe_days=30)
        return 1
    C.record_run(DS, "ok", f"{n} sources identiques, témoins présents", success=True)
    return 0


if __name__ == "__main__":
    sys.exit(C.run_main(DS, run, C.base_args(__doc__).parse_args()))
