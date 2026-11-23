#!/usr/bin/env python3
"""Envoi d'e-mail par Microsoft Graph (client credentials, POST /users/{MAIL_SENDER}/sendMail).

Identifiants, jamais affichés ni versionnés : variables d'environnement ENTRA_TENANT_ID, ENTRA_CLIENT_ID,
ENTRA_CLIENT_SECRET (secrets GitHub Actions du dépôt). Hors CI, à défaut, le fichier désigné par ENTRA_ENV_FILE
(format KEY=valeur). Expéditeur : MAIL_SENDER (défaut assurance@houle.ai). Destinataire : REFRESH_ALERT_TO
(défaut sh@houle.ai). L'application n'a Mail.Send que sur cette boîte (RBAC Exchange).

  python3 infra/refresh/mailer.py --test
  python3 infra/refresh/mailer.py --subject "Sujet" --html-file corps.html
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

TO = os.environ.get("REFRESH_ALERT_TO", "sh@houle.ai")
KEYS = ("ENTRA_TENANT_ID", "ENTRA_CLIENT_ID", "ENTRA_CLIENT_SECRET")


def _env() -> dict:
    vals = {}
    f = os.environ.get("ENTRA_ENV_FILE")
    if f and Path(f).exists():
        for ln in Path(f).read_text().splitlines():
            ln = ln.strip()
            if ln and not ln.startswith("#") and "=" in ln:
                k, v = ln.split("=", 1)
                vals[k.strip()] = v.strip().strip('"').strip("'")
    for k in (*KEYS, "MAIL_SENDER"):
        if os.environ.get(k):
            vals[k] = os.environ[k]
    for k in KEYS:
        if not vals.get(k):
            raise RuntimeError(f"{k} manquant (secret GitHub Actions ou ENTRA_ENV_FILE)")
    vals.setdefault("MAIL_SENDER", "assurance@houle.ai")
    return vals


def _token(e: dict) -> str:
    body = urllib.parse.urlencode({
        "grant_type": "client_credentials", "client_id": e["ENTRA_CLIENT_ID"],
        "client_secret": e["ENTRA_CLIENT_SECRET"], "scope": "https://graph.microsoft.com/.default",
    }).encode()
    url = f"https://login.microsoftonline.com/{urllib.parse.quote(e['ENTRA_TENANT_ID'])}/oauth2/v2.0/token"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, data=body), timeout=20) as r:
            return json.load(r)["access_token"]
    except urllib.error.HTTPError as err:
        code = ""
        try:
            code = json.load(err).get("error", "")
        except Exception:  # noqa: BLE001
            pass
        raise RuntimeError(f"jeton Graph refusé ({err.code} {code})") from None


def send_mail(subject: str, html: str, to: str = TO) -> int:
    """Retourne le statut HTTP de Graph (202 = accepté). Lève une exception sinon."""
    e = _env()
    msg = {"message": {"subject": subject, "body": {"contentType": "HTML", "content": html},
                       "toRecipients": [{"emailAddress": {"address": to}}]},
           "saveToSentItems": False}
    req = urllib.request.Request(
        f"https://graph.microsoft.com/v1.0/users/{urllib.parse.quote(e['MAIL_SENDER'])}/sendMail",
        data=json.dumps(msg).encode(), method="POST",
        headers={"Authorization": f"Bearer {_token(e)}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            status = r.status
    except urllib.error.HTTPError as err:
        code = ""
        try:
            code = json.load(err).get("error", {}).get("code", "")
        except Exception:  # noqa: BLE001
            pass
        raise RuntimeError(f"sendMail {err.code} {code}".strip()) from None
    if status != 202:
        raise RuntimeError(f"sendMail {status}")
    return status


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description="Envoi d'un e-mail d'alerte (Microsoft Graph)")
    ap.add_argument("--test", action="store_true", help="e-mail d'essai")
    ap.add_argument("--subject")
    ap.add_argument("--html-file")
    a = ap.parse_args()
    if a.test:
        import datetime as dt
        from zoneinfo import ZoneInfo
        t = dt.datetime.now(ZoneInfo("Europe/Zurich")).strftime("%d.%m.%Y à %H:%M")
        status = send_mail(
            "Guide Assurance : test des alertes de mise à jour",
            f"<p>Ceci est un essai du {t}. Les mises à jour automatiques des données de guide-assurance.ch "
            "(GitHub Actions : taux 3a, primes LAMal, frontaliers, barèmes d'impôt) vous écriront à cette adresse "
            "si une donnée change, si une source ne se lit plus, ou pour le point mensuel du 1er.</p>"
            "<p>Rien n'a été publié.</p>")
        print(f"Graph sendMail : HTTP {status} (destinataire {TO})")
    elif a.subject and a.html_file:
        print(f"Graph sendMail : HTTP {send_mail(a.subject, Path(a.html_file).read_text(encoding='utf-8'))}")
    else:
        sys.exit(__doc__)
