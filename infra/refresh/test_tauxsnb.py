#!/usr/bin/env python3
"""Tests des contrôles du relevé mensuel de la BNS (tauxsnb.controler) : révisions tolérées jusqu'à MAX_REVISION,
refus au-delà, série mise à zéro, mois perdus, saut d'un mois à l'autre. Sans réseau, sur le fichier du site.

  python3 infra/refresh/test_tauxsnb.py
"""
from __future__ import annotations

import copy
import datetime as dt
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tauxsnb as T  # noqa: E402

DATA = json.loads((Path(__file__).resolve().parents[2] / "data" / "snb-taux-prevoyance.json").read_text())
JOUR = dt.date.fromisoformat(DATA["publie_le"])


def nouveau(modif) -> dict:
    d = copy.deepcopy(DATA)
    modif(d)
    return d


class Controles(unittest.TestCase):
    def test_fichier_actuel_accepte(self):
        self.assertEqual(T.controler(DATA, DATA, JOUR), [])

    def test_revision_toleree(self):
        def m(d):
            for p in d["series"]["GVG_F2S"]["points"][-6:]:
                p["moyenne"] = round(p["moyenne"] + T.MAX_REVISION - 0.01, 4)
                p["q75"] = max(p["q75"], p["mediane"])
        self.assertEqual(T.controler(DATA, nouveau(m), JOUR), [])

    def test_revision_trop_forte(self):
        def m(d):
            d["series"]["GVG_S3A"]["points"][10]["moyenne"] += T.MAX_REVISION + 0.05
        pb = T.controler(DATA, nouveau(m), JOUR)
        self.assertTrue(any("révision" in x for x in pb), pb)

    def test_serie_mise_a_zero(self):
        def m(d):
            for p in d["series"]["GVG_F2S"]["points"]:
                p.update(moyenne=0, q25=0, mediane=0, q75=0)
        pb = T.controler(DATA, nouveau(m), JOUR)
        self.assertTrue(any("libre passage" in x and "révision" in x for x in pb), pb)

    def test_mois_perdus_et_saut(self):
        def perdu(d):
            d["series"]["GVG_S3A"]["points"].pop(5)
        self.assertTrue(any("absents" in x for x in T.controler(DATA, nouveau(perdu), JOUR)))
        ancien = nouveau(lambda d: d["series"]["GVG_S3A"]["points"].pop())

        def saut(d):
            d["series"]["GVG_S3A"]["points"][-1]["moyenne"] += T.MAX_JUMP + 0.1
            d["series"]["GVG_S3A"]["points"][-1]["q75"] += T.MAX_JUMP + 0.1
        self.assertTrue(any("écart de plus" in x for x in T.controler(ancien, nouveau(saut), JOUR)))

    def test_publication_plus_ancienne_ou_future(self):
        vieux = nouveau(lambda d: d.update(publie_le="2026-01-01"))
        self.assertTrue(any("antérieure" in x for x in T.controler(DATA, vieux, JOUR)))
        self.assertTrue(any("futur" in x for x in T.controler(DATA, DATA, JOUR - dt.timedelta(days=5))))


if __name__ == "__main__":
    unittest.main()
