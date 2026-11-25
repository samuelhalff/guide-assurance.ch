#!/usr/bin/env python3
"""Tests de la veille de la statistique OFSP (kvstat.py : éditions illisibles, signature mémorisée après envoi seulement)
et des taux de libre passage annoncés pour plus tard (tauxlp.separer_annonces). Sans réseau : http_get, alert et le
dossier d'état sont remplacés.

  python3 infra/refresh/test_veilles.py
"""
from __future__ import annotations

import datetime as dt
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402
import kvstat as K  # noqa: E402
import tauxlp as L  # noqa: E402


def ligne(annee: int, etat: str = "vollständig", libelle: str = "Statistik der obligatorischen Krankenversicherung") -> str:
    return f"<li><a>{libelle} {annee} (Tabellen - XLSX (ZIP) - {etat}: 91 T.)</a> <span>3. Juli {annee + 1}</span></li>"


class Log:
    def __call__(self, *a):
        pass


class Editions(unittest.TestCase):
    def test_lues(self):
        page = ligne(2024) + ligne(2025, "unvollständig")
        ed = K.editions(page)
        self.assertEqual(sorted(ed), [2024, 2025])
        self.assertEqual(K.non_analysees(page, ed, 2024), [])

    def test_libelle_change_pour_la_seule_nouvelle_edition(self):
        page = ligne(2024) + "<li><a>Statistik der obligatorischen Krankenversicherung 2025 (Tabellen XLSX, 40 T.)</a></li>"
        ed = K.editions(page)
        self.assertEqual(sorted(ed), [2024])
        self.assertEqual(K.non_analysees(page, ed, 2024), [2025])

    def test_anciennes_mentions_ignorees(self):
        page = ligne(2024) + "<p>Statistik der obligatorischen Krankenversicherung 2010 (archives)</p>"
        self.assertEqual(K.non_analysees(page, K.editions(page), 2024), [])


class Signature(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.orig = (C.STATE, C.http_get, C.alert, C.DRY, K.EDITION_SITE, C.record_run)
        C.STATE = Path(self.tmp.name)
        C.DRY = False
        K.EDITION_SITE = 2024
        C.record_run = lambda *a, **k: None
        page = (ligne(2024) + ligne(2025, "unvollständig")).encode()
        C.http_get = lambda *a, **k: (200, page)
        self.a = SimpleNamespace(dry_run=False, simulate_change=False, simulate_parser_failure=False)

    def tearDown(self):
        C.STATE, C.http_get, C.alert, C.DRY, K.EDITION_SITE, C.record_run = self.orig
        self.tmp.cleanup()

    def test_echec_envoi_pas_de_signature(self):
        C.alert = lambda *a, **k: "erreur"
        K.run(Log(), self.a)
        self.assertIsNone(C.load_state(K.DS).get("derniere_alerte"))
        envois = []
        C.alert = lambda *a, **k: envois.append(1) or "envoye"
        K.run(Log(), self.a)
        self.assertEqual(len(envois), 1, "le passage suivant retente l'alerte")
        self.assertEqual(C.load_state(K.DS).get("derniere_alerte"), "2025:incomplete")

    def test_dedupe_memorise(self):
        C.alert = lambda *a, **k: "dedupe"
        K.run(Log(), self.a)
        self.assertEqual(C.load_state(K.DS).get("derniere_alerte"), "2025:incomplete")

    def test_edition_illisible_alerte(self):
        C.http_get = lambda *a, **k: (200, (ligne(2024) + "<li>Statistik der obligatorischen Krankenversicherung 2025 (neu)</li>").encode())
        alertes = []
        C.alert = lambda log, ds, kind, paragraphs, *a, **k: alertes.append(paragraphs[0]) or "envoye"
        self.assertEqual(K.run(Log(), self.a), 1)
        self.assertIn("2025", alertes[0])


class Annonces(unittest.TestCase):
    def test_taux_futur_non_applique(self):
        auj = dt.date(2026, 11, 25)
        ok = [{"id": "a", "taux": 0.5, "taux_valable_des": "2026-12-25"}, {"id": "b", "taux": 0.4, "taux_valable_des": "2026-11-25"}, {"id": "c", "taux": 0.3}]
        actuels, annonces = L.separer_annonces(ok, auj)
        self.assertEqual([r["id"] for r in actuels], ["b", "c"])
        self.assertEqual([r["id"] for r in annonces], ["a"])
        self.assertEqual([r["id"] for r in L.separer_annonces(ok, dt.date(2026, 12, 25))[1]], [], "appliqué à sa date d'effet")


if __name__ == "__main__":
    unittest.main(verbosity=1)
