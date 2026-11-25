#!/usr/bin/env python3
"""Tests de l'état « publication en attente » (common.publish, retenter_publication_fin), sans réseau ni build :
_publish, alert et le dossier d'état sont remplacés.

  python3 infra/refresh/test_publication.py
"""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402


class Log:
    def __call__(self, *a):
        pass


class PublicationEnAttente(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.orig = (C.STATE, C._publish, C.alert, C.DATASET, C.DRY)
        C.STATE = Path(self.tmp.name)
        C.DATASET, C.DRY = "essai", False
        C.alert = lambda *a, **k: "dry-run"
        self.resultats: list[tuple[bool, str]] = []
        self.appels = 0

        def faux(log, written, backup, checks):
            self.appels += 1
            ok, why = self.resultats.pop(0)
            if why == "build":
                backup.restore()
            return ok, why
        C._publish = faux

    def tearDown(self):
        C.STATE, C._publish, C.alert, C.DATASET, C.DRY = self.orig
        self.tmp.cleanup()

    def test_deploiement_echoue_puis_relance_sans_changement(self):
        f = C.STATE / "donnees.json"
        f.write_text("ancien")
        b = C.Backup([f])
        f.write_text("nouveau")
        checks = [{"url": "/x/", "values": ["1"]}]
        self.resultats = [(False, "déploiement"), (True, "publié")]
        self.assertEqual(C.publish(Log(), [f], b, checks), (False, "déploiement"))
        attente = C.load_state("essai")["publication_en_attente"]
        self.assertEqual(attente["checks"], checks)
        # passage suivant : la source n'a pas changé, la publication est reprise
        self.assertEqual(C.retenter_publication_fin(Log(), "essai", False, "Essai"), 0)
        st = C.load_state("essai")
        self.assertIsNone(st["publication_en_attente"])
        self.assertEqual(st["dernier_statut"], "publie")
        self.assertEqual(self.appels, 2)
        # plus rien en attente
        self.assertIsNone(C.retenter_publication_fin(Log(), "essai", False, "Essai"))

    def test_relance_encore_en_echec(self):
        self.resultats = [(False, "déploiement"), (False, "déploiement")]
        C.publish(Log(), [], C.Backup([]), [])
        self.assertEqual(C.retenter_publication_fin(Log(), "essai", False, "Essai"), 1)
        st = C.load_state("essai")
        self.assertEqual(st["dernier_statut"], "ecrit_non_publie")
        self.assertTrue(st["publication_en_attente"])

    def test_donnees_remises_pas_d_attente(self):
        f = C.STATE / "donnees.json"
        f.write_text("ancien")
        b = C.Backup([f])
        f.write_text("nouveau")
        self.resultats = [(False, "build")]
        C.publish(Log(), [f], b, [])
        self.assertFalse(C.load_state("essai").get("publication_en_attente"))
        self.assertEqual(f.read_text(), "ancien")

    def test_dry_run_ne_relance_pas(self):
        C.save_state("essai", publication_en_attente={"depuis": "2026-11-25T10:00:00+01:00", "raison": "x", "checks": []})
        self.assertIsNone(C.retenter_publication_fin(Log(), "essai", True, "Essai"))
        self.assertEqual(self.appels, 0)


if __name__ == "__main__":
    unittest.main()
