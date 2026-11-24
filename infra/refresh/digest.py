#!/usr/bin/env python3
"""Point mensuel (le 1er) : dernier relevé réussi, dernière publication et dernier statut de chaque jeu de données.

  python3 infra/refresh/digest.py [--dry-run]
"""
from __future__ import annotations

import datetime as dt
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402

# jeu -> (libellé, âge maximal attendu du dernier succès en jours, selon le calendrier)
DATASETS = {
    "taux3a": ("Taux 3a (hebdomadaire, publication automatique)", 8),
    "tauxlp": ("Taux de libre passage (hebdomadaire, publication automatique)", 8),
    "lamal": ("Primes LAMal (mensuel, quotidien du 25.9 au 31.12, publication automatique des corrections)", 32),
    "frontalier": ("Frontaliers : PASS et primes UE (mensuel, quotidien en janvier, alerte seulement)", 32),
    "impots": ("Barèmes d'impôt GE/VD (mensuel, alerte seulement)", 32),
    "kvstat": ("Statistique OFSP des caisses LAMal (mensuel, alerte seulement)", 32),
    "frais3a": ("Frais 3a : pages tarifaires des fournisseurs (mensuel, alerte seulement)", 32),
    "subsides": ("Subsides d'assurance maladie : barèmes officiels des cantons (mensuel, alerte seulement)", 32),
}
STATUTS = {"ok": "aucun changement", "publie": "publié", "ecrit_non_publie": "écrit, non publié",
           "alerte": "alerte envoyée", "echec": "échec de lecture", "invalide": "valeurs invraisemblables"}


def run(log: C.Log, a) -> int:
    rows, late = [], []
    now = C.now_zh()
    for ds, (label, max_days) in DATASETS.items():
        st = C.load_state(ds)
        ok = st.get("dernier_succes")
        if not ok or now - dt.datetime.fromisoformat(ok) > dt.timedelta(days=max_days):
            late.append(label.split(" (")[0])
        rows.append(f"<b>{label}</b><br>dernier relevé réussi : {C.fr_date(ok)}"
                    f" · dernière publication : {C.fr_date(st.get('derniere_publication'))}"
                    f" · dernier statut : {STATUTS.get(st.get('dernier_statut'), st.get('dernier_statut') or '—')}"
                    + (f" ({st['dernier_message']})" if st.get("dernier_statut") not in (None, "ok") and st.get("dernier_message") else ""))
    kind = "tout va bien" if not late else "données à vérifier"
    head = ("Tous les relevés automatiques ont tourné comme prévu ce mois-ci." if not late else
            "Relevé en retard ou en échec : " + ", ".join(late) + ".")
    for r in rows:
        log("  " + r.replace("<br>", " | ").replace("<b>", "").replace("</b>", ""))
    C.alert(log, "digest", kind, [head] + rows, a.dry_run, dedupe_days=1)
    C.record_run("digest", "ok", kind, success=True)
    return 0


if __name__ == "__main__":
    sys.exit(C.run_main("digest", run, C.base_args(__doc__).parse_args()))
