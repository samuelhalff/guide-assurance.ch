#!/usr/bin/env python3
"""Historique des taux des comptes 3a : un relevé par date, jamais réécrit après coup.

Fichier : data/taux-3a-historique.json (copié dans site/src/data/ pour le site, et exporté en CSV par la page
/data/taux-3a-historique.csv et par infra/public-repo/export.sh).

  releves   : [{date, source, comptes: [{id, banque, taux, taux_valable_des}]}], trié par date
  notes_bns : [{date, decision_fr, decision_en, avant, apres}] ; une note n'est écrite que si un relevé existe
              avant ET après la décision de la Banque nationale (dates des relevés retenus dans avant / apres).

Le relevé hebdomadaire (infra/refresh/taux3a.py) appelle ajouter() après chaque lecture valide des 17 banques,
qu'un taux ait changé ou non. Une date déjà présente est remplacée (relance le même jour).

  python3 data/scripts/taux_3a_historique.py show
  python3 data/scripts/taux_3a_historique.py seed      # amorçage : relevé du 22.11.2026 et du 23.11.2026
"""
from __future__ import annotations

import importlib.util
import json
import re
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]          # .../courtier/data
HIST_FILE = ROOT / "taux-3a-historique.json"
SITE_HIST_FILE = ROOT.parent / "site" / "src" / "data" / "taux-3a-historique.json"

DESCRIPTION = (
    "Taux de base des comptes 3a (en % par an, adulte, premier franc) relevés sur les pages officielles des banques "
    "ou leurs fiches de taux PDF, jamais sur un comparateur. Un relevé par date ; les valeurs passées ne sont jamais "
    "corrigées. Relevé automatique chaque lundi (infra/refresh/taux3a.py)."
)


def charger() -> dict:
    if HIST_FILE.exists():
        return json.loads(HIST_FILE.read_text(encoding="utf-8"))
    return {"description": DESCRIPTION, "releves": [], "notes_bns": []}


def ecrire(h: dict) -> list[Path]:
    h["releves"].sort(key=lambda r: r["date"])
    txt = json.dumps(h, ensure_ascii=False, indent=1) + "\n"
    HIST_FILE.write_text(txt, encoding="utf-8")
    SITE_HIST_FILE.write_text(txt, encoding="utf-8")
    return [HIST_FILE, SITE_HIST_FILE]


def releve_depuis(data: dict, date: str, source: str) -> dict:
    """Relevé tiré de data/taux-3a.json (ou de sa version mise à jour par taux_3a.apply)."""
    comptes = [
        {"id": c["id"], "banque": c["banque"], "taux": c["taux"], "taux_valable_des": c.get("taux_valable_des")}
        for c in data["comptes"]
        if isinstance(c.get("taux"), (int, float))
    ]
    comptes.sort(key=lambda c: c["id"])
    return {"date": date, "source": source, "comptes": comptes}


def ajouter(h: dict, releve: dict) -> dict:
    h = json.loads(json.dumps(h))
    h["releves"] = [r for r in h["releves"] if r["date"] != releve["date"]] + [releve]
    h["releves"].sort(key=lambda r: r["date"])
    return h


def stats(releve: dict) -> tuple[float, float, int]:
    t = [c["taux"] for c in releve["comptes"]]
    return round(statistics.fmean(t), 4), statistics.median(t), len(t)


def _module_taux():
    spec = importlib.util.spec_from_file_location("taux_3a", Path(__file__).resolve().parent / "taux_3a.py")
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def seed() -> int:
    """Amorçage avec les seuls relevés réels disponibles sur le disque :
    - 22.11.2026 : data/taux-3a.json (relevé initial, releve_le) ;
    - 23.11.2026 : instantanés data/sources/3a-taux/*.txt du relevé automatique de 06:30 (journal
      infra/refresh/logs/taux3a.log : 17/17 banques lues, aucun changement). Chaque taux est relu dans
      « Extrait retenu » avec la règle de la banque et doit égaler la valeur en base, sinon rien n'est écrit."""
    T = _module_taux()
    data = T.load_data()
    h = charger()
    h = ajouter(h, releve_depuis(data, data["releve_le"], "relevé initial (data/taux-3a.json)"))

    by_id = {c["id"]: c for c in data["comptes"]}
    dates, ecarts = set(), []
    for cfg in T.BANKS:
        txt = (T.SOURCES / f"{cfg['id']}.txt").read_text(encoding="utf-8")
        rel = re.search(r"^Relevé: (\S+)", txt, re.M).group(1)
        ext = re.search(r"^Extrait retenu: (.*)$", txt, re.M).group(1)
        m = re.search(cfg["rule"], ext, re.I)
        if not m:
            ecarts.append(f"{cfg['id']} : règle sans résultat sur l'extrait")
            continue
        taux = T.parse_num(m.group("taux"))
        dates.add(rel[:10])
        if taux != by_id[cfg["id"]]["taux"]:
            ecarts.append(f"{cfg['id']} : {taux} lu le {rel}, {by_id[cfg['id']]['taux']} en base")
    if ecarts or len(dates) != 1:
        print("Instantanés non retenus :", ecarts or dates, file=sys.stderr)
    else:
        d = dates.pop()
        if d != data["releve_le"]:
            h = ajouter(h, releve_depuis(data, d, "relevé automatique, aucun changement (infra/refresh/taux3a.py)"))
    ecrire(h)
    show(h)
    return 0


def show(h: dict | None = None) -> None:
    h = h or charger()
    for r in h["releves"]:
        moy, med, n = stats(r)
        print(f"{r['date']}  {n} comptes  moyenne {moy:.3f} %  médiane {med:.3f} %  ({r['source']})")
    print(f"{len(h.get('notes_bns', []))} note(s) BNS")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "show"
    sys.exit(seed() if cmd == "seed" else (show() or 0))
