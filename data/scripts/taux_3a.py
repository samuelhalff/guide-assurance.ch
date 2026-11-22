#!/usr/bin/env python3
"""Relevé des taux des comptes d'épargne 3a (pilier 3a) sur les pages officielles des banques.

Usage:
  python3 data/scripts/taux_3a.py fetch [--write] [--only id1,id2]
  python3 data/scripts/taux_3a.py check [--only id1,id2]

fetch : télécharge chaque page configurée, enregistre un instantané dans
        data/sources/3a-taux/ (<id>.txt + <id>.html.gz ou <id>.pdf), extrait
        les taux et affiche un tableau. --write met à jour taux, variantes,
        date de validité, extrait et lu_le dans data/taux-3a.json (les textes
        de conditions rédigés à la main sont conservés).
check : refait le relevé et compare à data/taux-3a.json. Affiche un diff
        unifié des changements et les échecs d'extraction. Code de sortie 1
        si un changement ou un échec, 0 si tout est identique.

Dépendances: bibliothèque standard Python uniquement pour le HTML.
Les fiches PDF (Raiffeisen, BCGE, BCJ, Banque WIR, CA next bank) sont lues
avec PyMuPDF (module « fitz », déjà installé localement) : la fiche BCGE est
chiffrée (AES-256) et ne peut pas être lue avec la seule bibliothèque standard.
Les pages rendues en JavaScript passent par data/scripts/render_page.mjs
(Playwright, Chromium headless).
"""
from __future__ import annotations

import argparse
import datetime as dt
import difflib
import gzip
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]          # .../courtier/data
SOURCES = ROOT / "sources" / "3a-taux"
DATA_FILE = ROOT / "taux-3a.json"
SITE_FILE = ROOT.parent / "site" / "src" / "data" / "taux-3a.json"
RENDER = Path(__file__).resolve().parent / "render_page.mjs"

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36")
HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf;q=0.8,*/*;q=0.7",
    "Accept-Language": "fr-CH,fr;q=0.9,de-CH;q=0.7,en;q=0.5",
}

NUM = r"(\d+[.,]\d+)"

# --------------------------------------------------------------------------
# Configuration par banque.
#   url        : page (ou PDF) lue
#   method     : http | playwright | pdf
#   pdf_link   : (facultatif) regex appliquée au HTML de `url` pour trouver
#                le lien du PDF à lire (lien qui change à chaque mise à jour)
#   rules      : regex sur le texte normalisé (une seule ligne, espaces
#                simples). Groupe nommé `taux` obligatoire ; les autres
#                groupes numériques deviennent des variantes (taux_variantes).
#   valid      : (facultatif) regex dont le groupe `d` donne la date de
#                validité publiée.
# --------------------------------------------------------------------------
BANKS: list[dict] = [
    {"id": "ubs", "url": "https://www.ubs.com/ch/fr/services/accounts-and-cards/interest-rates-privates.html",
     "method": "playwright",
     "rule": r"Compte Fisca 3a UBS CHF (?P<taux>" + NUM[1:-1] + r") ?%",
     "valid": r"Valable à partir du (?P<d>\d{1,2} ?(?:er|e)? \w+ \d{4})"},
    {"id": "postfinance", "url": "https://www.postfinance.ch/fr/particuliers/prevoyance/compte-prevoyance-3a.html",
     "method": "http",
     "rule": r"Votre avoir en compte est rémunéré à hauteur de (?P<taux>" + NUM[1:-1] + r") ?%"},
    {"id": "raiffeisen", "url": "https://www.raiffeisen.ch/content/dam/www/rch/pdf/privatkunden/vorsorgen-und-absichern/konditionenuebersicht/vorsorge-konditionenuebersicht-fr.pdf",
     "method": "pdf",
     "rule": r"Rémunération du compte (?P<taux>" + NUM[1:-1] + r") ?% \d+[.,]\d+ ?%",
     "valid": r"Valable à partir du (?P<d>\d{1,2} ?(?:er|e)? \w+ \d{4})"},
    {"id": "bcge", "url": "https://www.bcge.ch/fr/taux-des-comptes", "method": "pdf",
     "pdf_link": r'href="([^"]*BCGE_brochure_taux_comptes\.pdf[^"]*)"',
     "rule": r"Epargne 3 ?\(3 ?e? ?pilier\) (?P<taux>" + NUM[1:-1] + r") ?%",
     "valid": r"en vigueur (?P<d>\d{2}\.\d{2}\.\d{4})"},
    {"id": "bcv", "url": "https://www.bcv.ch/fr/home/informations-financieres/taux-et-tarifs/taux-et-tarifs-clientele-privee.html",
     "method": "http",
     "rule": r"Comptes de prévoyance Rémunération actuelle Epargne 3 (?P<taux>" + NUM[1:-1] + r") ?% "
             r"Epargne 3 Jeunes (?P<jeunes_18_30>" + NUM[1:-1] + r") ?%"},
    {"id": "bcvs", "url": "https://www.bcvs.ch/prives/prevoyance-assurances/comptes-de-prevoyance/compte-epargne-3e-pilier",
     "method": "http",
     "rule": r"Taux & conditions Monnaie CHF Taux d'intérêt (?P<taux>" + NUM[1:-1] + r") ?%"},
    {"id": "bcf", "url": "https://www.bcf.ch/fr/prives/prevoyance-et-assurances/comptes-de-prevoyance/compte-epargne3",
     "method": "http",
     "rule": r"Tarifs et conditions Monnaie CHF Taux d'intérêt (?P<taux>" + NUM[1:-1] + r") ?%"},
    {"id": "bcn", "url": "https://www.bcn.ch/prives/prevoyance/comptes-de-prevoyance/epargne-3",
     "method": "http",
     "rule": r"Taux d'intérêt créditeur (?P<taux>" + NUM[1:-1] + r") ?%"},
    {"id": "bcj", "url": "https://www.bcj.ch/fr/La-BCJ/Tarif-des-prestations/Tarif-des-prestations.html",
     "method": "pdf", "pdf_link": r'href="([^"]*/Taux_\d+\.pdf)"',
     "rule": r"Epargne 3a(?: Epargne Libre-Passage)?(?: Taux d'intérêt)? (?P<taux>" + NUM[1:-1] + r") ?%",
     "valid": r"Valables dès le (?P<d>\d{1,2} ?(?:er|e)? \w+ \d{4})"},
    {"id": "migros", "url": "https://www.migrosbank.ch/fr/personnes-privees/prevoyance/pilier-3a/compte-3a.html",
     "method": "http",
     "rule": r"Compte de prévoyance 3a rémunéré à (?P<taux>" + NUM[1:-1] + r") ?% d'intérêts"},
    {"id": "cler", "url": "https://www.cler.ch/fr/vorsorgen-und-nachlass/vorsorgemoeglichkeiten/compte-de-prevoyance-3",
     "method": "http",
     "rule": r"Compte seul: (?P<taux>" + NUM[1:-1] + r") ?% Dans le cadre d'un pack Clientèle privée: (?P<pack_clientele_privee>"
             + NUM[1:-1] + r") ?%"},
    {"id": "valiant", "url": "https://www.valiant.ch/fr/clients-prives/prevoyance-produits-de-prevoyance-compte-de-prevoyance-privor-3a",
     "method": "http",
     "rule": r"Taux d'intérêt de (?P<taux>" + NUM[1:-1] + r") ?%",
     "valid": r"Dernier ajustement des taux: le (?P<d>\d{1,2} ?(?:er|e)? \w+ \d{4})"},
    {"id": "bas", "url": "https://www.bas.ch/fr/conditions-pour-personnes-privees",
     "method": "http",
     "rule": r"Compte de prévoyance BAS 3 Taux d'intérêt Taux d'intérêt (?P<taux>" + NUM[1:-1] + r") ?%"},
    {"id": "wir", "url": "https://www.wir.ch/fileadmin/downloads/Informationen/zinsen-konditionen-bank-wir-fr.pdf",
     "method": "pdf",
     "rule": r"Compte Terzo Tenue de compte gratuite (?P<taux>" + NUM[1:-1] + r") ?%",
     "valid": r"Conditions valables à compter du (?P<d>\d{1,2} ?(?:er|e)? \w+ \d{4})"},
    {"id": "swissquote", "url": "https://www.swissquote.com/fr-ch/private/invest/products/3a-easy",
     "method": "http",
     "rule": r"Stratégie d'épargne 3a Frais d'administration Aucuns frais Montant minimum de dépôt CHF 100 "
             r"Taux d'intérêt (?P<taux>" + NUM[1:-1] + r") ?%"},
    {"id": "cic", "url": "https://www.cic.ch/fr/solutions/tarifs/taux-d-interet.html",
     "method": "http",
     "rule": r"Compte de prévoyance 3a CHF (?P<taux>" + NUM[1:-1] + r") ?%",
     "valid": r"valable dès le (?P<d>\d{1,2} ?(?:er|e)? \w+ \d{4})"},
    {"id": "ca-next-bank", "url": "https://www.ca-nextbank.ch/fr/tarifs", "method": "pdf",
     "pdf_link": r'(https://assets[^"\\]*Grille[^"\\]*client[^"\\]*_Fr\.pdf)',
     "rule": r"Liberty 3A Bancaire (?P<taux>" + NUM[1:-1] + r") ?%",
     "valid": r"Valable à partir du (?P<d>\d{1,2} ?(?:er|e)? \w+ \d{4})"},
]

MONTHS = {"janvier": 1, "février": 2, "fevrier": 2, "mars": 3, "avril": 4, "mai": 5, "juin": 6,
          "juillet": 7, "août": 8, "aout": 8, "septembre": 9, "octobre": 10, "novembre": 11,
          "décembre": 12, "decembre": 12}


# ----------------------------------------------------------------- helpers
class _Text(HTMLParser):
    BLOCK = {"p", "div", "br", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "section",
             "article", "header", "footer", "ul", "ol", "table", "dt", "dd", "title"}
    SKIP = {"script", "style", "noscript", "svg"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out: list[str] = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self.skip += 1
        elif tag in self.BLOCK:
            self.out.append("\n")
        elif tag in ("td", "th", "span", "strong", "b", "em", "a", "label", "button"):
            self.out.append(" ")

    def handle_endtag(self, tag):
        if tag in self.SKIP and self.skip:
            self.skip -= 1
        elif tag in self.BLOCK:
            self.out.append("\n")

    def handle_data(self, data):
        if not self.skip:
            self.out.append(data)


def normalize_lines(text: str) -> list[str]:
    for a, b in (("\xa0", " "), ("\u202f", " "), ("\u2009", " "), ("\u2007", " "),
                 ("\u2019", "'"), ("\u2018", "'"), ("\u00ad", ""), ("\t", " ")):
        text = text.replace(a, b)
    lines = [re.sub(r" {2,}", " ", ln).strip() for ln in text.split("\n")]
    return [ln for ln in lines if ln]


def html_to_lines(html: str) -> list[str]:
    p = _Text()
    p.feed(html)
    return normalize_lines("".join(p.out))


def pdf_to_lines(data: bytes) -> list[str]:
    try:
        import fitz  # PyMuPDF
    except ImportError as e:  # pragma: no cover
        raise RuntimeError("PyMuPDF (module fitz) requis pour lire les fiches PDF") from e
    doc = fitz.open(stream=data, filetype="pdf")
    lines: list[str] = []
    for page in doc:
        spans = []
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                for s in line["spans"]:
                    if s["text"].strip():
                        x0, y0, x1, y1 = s["bbox"]
                        spans.append(((y0 + y1) / 2, x0, s["text"]))
        # regroupe les fragments situés sur la même ligne visuelle (tolérance 4 pt),
        # puis les trie de gauche à droite : les chiffres de la fiche BCGE sont
        # dans un calque séparé et ne se retrouvent sur leur ligne qu'ainsi.
        spans.sort()
        rows: list[list] = []
        for yc, x0, t in spans:
            if rows and abs(rows[-1][0] - yc) <= 4:
                rows[-1][1].append((x0, t))
            else:
                rows.append([yc, [(x0, t)]])
        for _, items in rows:
            items.sort()
            lines.append(" ".join(t.strip() for _, t in items))
    return normalize_lines("\n".join(lines))


def http_get(url: str, retries: int = 2) -> tuple[bytes, str, str]:
    last = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
                if r.headers.get("Content-Encoding") == "gzip":
                    data = gzip.decompress(data)
                return data, r.geturl(), r.headers.get("Content-Type", "")
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last = e
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"HTTP {url}: {last}")


def render(url: str) -> str:
    r = subprocess.run(["node", str(RENDER), url, "5000"], capture_output=True, text=True, timeout=240)
    if r.returncode != 0 or len(r.stdout) < 1000:
        raise RuntimeError(f"playwright {url}: {r.stderr.strip()[-300:]}")
    return r.stdout


def parse_num(s: str) -> float:
    return round(float(s.replace(",", ".")), 4)


def parse_date(s: str) -> str | None:
    s = s.strip().lower()
    m = re.fullmatch(r"(\d{1,2})\.(\d{1,2})\.(\d{4})", s)
    if m:
        d, mo, y = map(int, m.groups())
        return dt.date(y, mo, d).isoformat()
    m = re.fullmatch(r"(\d{1,2}) ?(?:er|e)? (\w+) (\d{4})", s)
    if m and m.group(2) in MONTHS:
        return dt.date(int(m.group(3)), MONTHS[m.group(2)], int(m.group(1))).isoformat()
    return None


def decode(data: bytes, ctype: str) -> str:
    m = re.search(r"charset=([\w-]+)", ctype or "")
    enc = m.group(1) if m else "utf-8"
    try:
        return data.decode(enc, "replace")
    except LookupError:
        return data.decode("utf-8", "replace")


# ----------------------------------------------------------------- core
def fetch_bank(cfg: dict, save: bool = True) -> dict:
    """Retourne {id, taux, taux_variantes, taux_valable_des, extrait, url_lue, methode} ou {id, erreur}."""
    bid, url, method = cfg["id"], cfg["url"], cfg["method"]
    ts = dt.datetime.now().astimezone().isoformat(timespec="seconds")
    try:
        raw: bytes
        if method == "playwright":
            html = render(url)
            raw, read_url, lines, ext = html.encode(), url, html_to_lines(html), "html"
        elif method == "pdf":
            pdf_url = url
            if cfg.get("pdf_link"):
                page, final, ctype = http_get(url)
                m = re.search(cfg["pdf_link"], decode(page, ctype))
                if not m:
                    raise RuntimeError("lien PDF introuvable sur la page")
                pdf_url = urllib.parse.urljoin(final, m.group(1).replace("&amp;", "&"))
            raw, read_url, _ = http_get(pdf_url)
            if not raw.startswith(b"%PDF"):
                raise RuntimeError("la réponse n'est pas un PDF")
            lines, ext = pdf_to_lines(raw), "pdf"
        else:
            raw, read_url, ctype = http_get(url)
            lines, ext = html_to_lines(decode(raw, ctype)), "html"

        flat = " ".join(lines)
        m = re.search(cfg["rule"], flat, re.I)
        res: dict = {"id": bid, "url_lue": read_url, "methode": method, "horodatage": ts}
        if not m:
            res["erreur"] = "règle d'extraction sans résultat (page modifiée ?)"
        else:
            g = m.groupdict()
            res["taux"] = parse_num(g.pop("taux"))
            res["taux_variantes"] = {k: parse_num(v) for k, v in g.items() if v} or None
            res["extrait"] = m.group(0)
            if cfg.get("valid"):
                mv = re.search(cfg["valid"], flat, re.I)
                res["taux_valable_des"] = parse_date(mv.group("d")) if mv else None
                if mv:
                    res["extrait_validite"] = mv.group(0)
        if save:
            save_snapshot(bid, cfg, res, lines, raw, ext, m)
        return res
    except Exception as e:  # noqa: BLE001
        return {"id": bid, "erreur": str(e), "methode": method, "horodatage": ts}


def save_snapshot(bid, cfg, res, lines, raw, ext, m):
    SOURCES.mkdir(parents=True, exist_ok=True)
    # section pertinente : fenêtre autour de la première ligne contenant la valeur
    idx = 0
    if m:
        needle = m.group("taux")
        cands = [i for i, ln in enumerate(lines) if needle in ln]
        key = m.group(0)[:15].lower()
        best = [i for i in cands if key in " ".join(lines[max(0, i - 8):i + 1]).lower()]
        idx = (best or cands or [0])[0]
    lo, hi = max(0, idx - 120), min(len(lines), idx + 120)
    header = [
        f"URL: {res.get('url_lue', cfg['url'])}",
        f"Page de départ: {cfg['url']}" if res.get("url_lue") != cfg["url"] else None,
        f"Relevé: {res['horodatage']}",
        f"Méthode: {'pdf (http)' if ext == 'pdf' else cfg['method']}",
        f"Extrait retenu: {res.get('extrait', '-')}",
        f"Validité: {res.get('extrait_validite', '-')}",
        f"Lignes {lo + 1}-{hi} sur {len(lines)} (texte normalisé)",
        "-" * 72,
    ]
    body = "\n".join([h for h in header if h] + lines[lo:hi]) + "\n"
    (SOURCES / f"{bid}.txt").write_text(body, encoding="utf-8")
    if ext == "pdf":
        (SOURCES / f"{bid}.pdf").write_bytes(raw)
    else:
        with gzip.open(SOURCES / f"{bid}.html.gz", "wb") as f:
            f.write(raw)


def run_all(only: set[str] | None, save: bool) -> list[dict]:
    out = []
    for cfg in BANKS:
        if only and cfg["id"] not in only:
            continue
        r = fetch_bank(cfg, save=save)
        out.append(r)
        status = f"{r['taux']:.3f} %" if "taux" in r else f"ERREUR: {r['erreur']}"
        print(f"  {cfg['id']:<14} {status}", file=sys.stderr)
    return out


def load_data() -> dict:
    if DATA_FILE.exists():
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    return {"releve_le": None, "source_note": "", "comptes": [], "non_retenus": []}


def comparable(entry: dict) -> dict:
    return {k: entry.get(k) for k in ("taux", "taux_variantes", "taux_valable_des")}


def apply(data: dict, results: list[dict], today: str) -> dict:
    data = json.loads(json.dumps(data))
    by_id = {c["id"]: c for c in data["comptes"]}
    cfg_by_id = {c["id"]: c for c in BANKS}
    for r in results:
        if "taux" not in r:
            continue
        c = by_id.get(r["id"])
        if c is None:
            cfg = cfg_by_id[r["id"]]
            c = {"id": r["id"], "banque": r["id"], "banque_nom_complet": "", "produit": "",
                 "taux": None, "taux_valable_des": None, "paliers": None,
                 "conditions_fr": "", "conditions_en": "", "url": r.get("url_lue", cfg["url"]),
                 "lu_le": today, "extrait": "", "methode": "pdf" if cfg["method"] == "pdf" else cfg["method"]}
            data["comptes"].append(c)
        c["taux"] = r["taux"]
        if r.get("taux_variantes") or "taux_variantes" in c:
            c["taux_variantes"] = r.get("taux_variantes")
        if "taux_valable_des" in r:
            c["taux_valable_des"] = r["taux_valable_des"]
        c["extrait"] = r["extrait"]
        c["lu_le"] = today
        # pour une fiche PDF, l'URL retenue est celle du PDF lu (elle change à chaque mise à jour)
        cfg = cfg_by_id[r["id"]]
        c["url"] = r["url_lue"] if cfg["method"] == "pdf" and r.get("url_lue") else cfg["url"]
    data["releve_le"] = today
    return data


def print_table(results: list[dict]) -> None:
    print(f"{'id':<14} {'taux %':>7}  {'valable dès':<11}  variantes / erreur")
    for r in results:
        if "taux" in r:
            var = ", ".join(f"{k}={v}" for k, v in (r.get("taux_variantes") or {}).items())
            print(f"{r['id']:<14} {r['taux']:>7.3f}  {r.get('taux_valable_des') or '-':<11}  {var}")
        else:
            print(f"{r['id']:<14} {'-':>7}  {'-':<11}  ERREUR: {r['erreur']}")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["fetch", "check"])
    ap.add_argument("--write", action="store_true", help="fetch: met à jour data/taux-3a.json")
    ap.add_argument("--only", help="liste d'id séparés par des virgules")
    a = ap.parse_args(argv)
    only = set(a.only.split(",")) if a.only else None
    today = dt.date.today().isoformat()

    results = run_all(only, save=True)
    print_table(results)
    data = load_data()

    if a.cmd == "fetch":
        if a.write:
            new = apply(data, results, today)
            DATA_FILE.write_text(json.dumps(new, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"\n{DATA_FILE} mis à jour.")
            SITE_FILE.write_text(DATA_FILE.read_text(encoding="utf-8"), encoding="utf-8")
            print(f"{SITE_FILE} copié (reconstruire et déployer le site).")
        return 0 if all("taux" in r for r in results) else 1

    # check
    stored = {c["id"]: c for c in data.get("comptes", [])}
    failures = [r for r in results if "taux" not in r]
    old_lines, new_lines = [], []
    for r in results:
        if "taux" not in r:
            continue
        old = comparable(stored.get(r["id"], {}))
        new = comparable({**stored.get(r["id"], {}), **{k: r.get(k) for k in ("taux", "taux_variantes") if k in r},
                          **({"taux_valable_des": r["taux_valable_des"]} if "taux_valable_des" in r else {})})
        old_lines.append(f"{r['id']}: {json.dumps(old, ensure_ascii=False, sort_keys=True)}\n")
        new_lines.append(f"{r['id']}: {json.dumps(new, ensure_ascii=False, sort_keys=True)}\n")
    diff = list(difflib.unified_diff(old_lines, new_lines, "taux-3a.json", "relevé du " + today))
    if diff:
        print("\nChangements détectés:")
        sys.stdout.writelines(diff)
    for f in failures:
        print(f"\nÉCHEC {f['id']}: {f['erreur']}")
    if diff or failures:
        return 1
    print("\nAucun changement: tous les taux sont identiques.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
