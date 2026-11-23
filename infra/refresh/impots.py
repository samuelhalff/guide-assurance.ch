#!/usr/bin/env python3
"""Barèmes d'impôt (outil « Économie d'impôt 3a », GE et VD) : veille mensuelle, alerte seulement.

Aucune publication automatique : une nouvelle année fiscale ou une correction de barème change la logique fiscale
et passe par une reconstruction vérifiée à la main (data/scripts/build_impots_2026.py et tests sur les
calculettes officielles).

Contrôles sur le calculateur fiscal de l'AFC (swisstaxcalculator.estv.admin.ch, source de build_impots_2026.py) :
  - année suivante (2027) : barèmes du revenu GE et VD, impôt fédéral direct, coefficients communaux GE et VD
    disponibles ou non ; alerte quand un élément apparaît ;
  - année en cours (2026) : barèmes et coefficients comparés aux instantanés data/sources/impots-2026/ ;
    alerte si l'AFC les a modifiés.

  python3 infra/refresh/impots.py [--dry-run] [--simulate-change] [--simulate-parser-failure]
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402

DS = "impots"
API = "https://swisstaxcalculator.estv.admin.ch/delegate/ost-integration/v1/lg-proxy/operation/c3b67379_ESTV/"
CUR, NEXT = 2026, 2027
SNAP = C.ROOT / "data" / "sources" / f"impots-{CUR}"


def call(op: str, payload: dict):
    code, body = C.http_get(API + op, timeout=180, data=json.dumps(payload).encode(),
                            headers={"Content-Type": "application/json"})
    if code != 200:
        raise RuntimeError(f"AFC {op} HTTP {code}")
    r = json.loads(body)["response"]
    if not isinstance(r, list):
        raise RuntimeError(f"AFC {op} : réponse inattendue")
    return r


def scales(year: int, simulate_failure: bool = False):
    bar = call("API_exportManyTaxScales", {"TaxYear": year, "TaxType": "EINKOMMENSSTEUER", "TaxGroupID": 88})
    if simulate_failure:
        bar = [{k: v for k, v in x.items() if k != "Location"} for x in bar]
    try:
        bar = [x for x in bar if x["TaxType"] == "EINKOMMENSSTEUER" and (
            (x["Location"]["Canton"] in ("GE", "VD") and x["Target"] == "KANTON") or
            (x["Location"]["Canton"] == "GE" and x["Target"] == "BUND"))]
        coef = [x for x in call("API_exportManySimpleRates", {"TaxYear": year, "TaxGroupID": 99})
                if x["Location"]["Canton"] in ("GE", "VD")]
    except (KeyError, TypeError) as e:
        raise RuntimeError(f"structure des données de l'AFC modifiée (champ {e} absent)") from None
    return bar, coef


def h(x) -> str:
    return hashlib.sha256(json.dumps(x, sort_keys=True).encode()).hexdigest()[:16]


def available(bar, coef) -> dict:
    return {
        "barème cantonal du revenu GE": any(x["Location"]["Canton"] == "GE" and x["Target"] == "KANTON" for x in bar),
        "barème cantonal du revenu VD": any(x["Location"]["Canton"] == "VD" and x["Target"] == "KANTON" for x in bar),
        "impôt fédéral direct": any(x["Target"] == "BUND" for x in bar),
        "coefficients communaux GE": any(x["Location"]["Canton"] == "GE" for x in coef),
        "coefficients communaux VD": any(x["Location"]["Canton"] == "VD" for x in coef),
    }


def run(log: C.Log, a) -> int:
    st = C.load_state(DS)
    try:
        bar_n, coef_n = scales(NEXT, a.simulate_parser_failure)
        bar_c, coef_c = scales(CUR)
    except Exception as e:  # noqa: BLE001
        C.record_run(DS, "echec", str(e), success=False)
        C.alert(log, DS, "données à vérifier", [f"Veille des barèmes d'impôt : lecture du calculateur de l'AFC impossible ({e}).",
                                                "Rien n'a été modifié sur le site."], a.dry_run)
        return 1
    alerts = []
    # année suivante
    av = available(bar_n, coef_n)
    seen = st.get(f"disponible_{NEXT}", {})
    if a.simulate_change:
        seen = {k: False for k in av}
        log(f"[simulation] état précédent : rien de {NEXT} disponible")
    new = [k for k, v in av.items() if v and not seen.get(k)]
    log(f"AFC {NEXT} : " + ", ".join(f"{k} {'oui' if v else 'non'}" for k, v in av.items()))
    if new:
        alerts.append(f"Le calculateur de l'AFC publie des données {NEXT} : " + ", ".join(new) + ". "
                      f"L'outil « Économie d'impôt 3a » calcule toujours avec les barèmes {CUR}.")
    # année en cours : instantanés
    snap_bar = json.loads((SNAP / f"estv_baremes_revenu_{CUR}.json").read_text())["donnees"]
    snap_coef = json.loads((SNAP / f"estv_coefficients_{CUR}.json").read_text())["donnees"]
    drift = []
    if h(bar_c) != h(snap_bar):
        drift.append("barèmes du revenu")
    if h(coef_c) != h(snap_coef):
        drift.append("coefficients communaux")
    log(f"AFC {CUR} : " + (("modifié : " + ", ".join(drift)) if drift else "identique aux instantanés"))
    if drift:
        alerts.append(f"L'AFC a modifié ses données {CUR} ({', '.join(drift)}) depuis le relevé utilisé par l'outil "
                      f"(data/sources/impots-{CUR}/).")
    if not a.dry_run:
        C.save_state(DS, **{f"disponible_{NEXT}": av})
    if alerts:
        C.record_run(DS, "alerte", " ".join(alerts)[:300], success=True)
        C.alert(log, DS, "données à vérifier", alerts + [
            "Rien n'a été publié : un changement de barème passe par une reconstruction vérifiée sur les calculettes officielles."],
            a.dry_run, dedupe_days=30)
        return 1
    C.record_run(DS, "ok", f"aucune nouveauté ({NEXT} : {sum(av.values())}/5 éléments)", success=True)
    return 0


if __name__ == "__main__":
    sys.exit(C.run_main(DS, run, C.base_args(__doc__).parse_args()))
