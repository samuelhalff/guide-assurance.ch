#!/usr/bin/env python3
"""Actualités : brouillons d'articles rédigés par un LLM, publiés seulement avec l'accord de Sam.

Chaque passage (cron quotidien, 07:30 Zurich) :
  1. relève les accords donnés dans l'admin des demandes (lien signé envoyé par e-mail) et publie les
     articles approuvés dont le texte n'a pas changé depuis l'e-mail ;
  2. cherche un déclencheur : nouvelles primes OFSP, variation des taux 3a au-delà du seuil, nouvelle
     décision de politique monétaire de la BNS (flux RSS officiel), rendez-vous mensuel ;
  3. pour un déclencheur au plus par passage : rassemble les données du site et les pages officielles,
     fait rédiger FR + EN par le LLM, vérifie (site/scripts/verifier-actualite.mts : mots interdits, chiffres
     présents dans les sources, sources, longueur, typographie), jette le brouillon s'il échoue (alerte) ;
  4. sinon l'enregistre en status: draft, construit et déploie (pages d'aperçu non indexées seulement) et
     envoie à Sam l'aperçu, les sources et le lien d'accord.

Rien n'est publié sans accord. Accord manuel (Sam le dit en session) : actualites.py --approve <slug-fr>.

GitHub Actions (.github/workflows/actualites.yml) : le brouillon vérifié part dans une pull request (branche
actualite/<slug-fr>, status: published dans la branche) avec l'aperçu et les sources ; Sam reçoit le lien par e-mail.
Fusionner la pull request = publier (le push sur main déploie). Pas d'accord par lien signé dans ce mode.
Clé du LLM : secret ANTHROPIC_API_KEY (ou AZURE_OPENAI_*). Absente : alerte « clé manquante », passage en échec.
"""
from __future__ import annotations

import base64
import datetime as dt
import hashlib
import hmac
import html
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402

DS = "actualites"
CONTENT = {"fr": C.SITE / "content" / "fr" / "actualites", "en": C.SITE / "content" / "en" / "actualites"}
BASE = {"fr": "/actualites/", "en": "/en/news/"}
APERCU = {"fr": "/apercu/", "en": "/en/preview/"}
APERCU_OUT = {"fr": "apercu", "en": "en/preview"}
ENV_FILE = C.HERE / ".env.actualites"
SNB_RSS = "https://www.snb.ch/public/rss/fr/mopo"
SEUIL_3A = 0.05  # point de pourcentage : variation d'un taux de base qui déclenche un article
VALIDITE_JOURS = 14  # durée de validité du lien d'accord
MODELE_ANTHROPIC = "claude-opus-5-5"

# Pages officielles relues pour chaque sujet (le LLM ne voit que ces textes et les données du site).
SOURCES = {
    "primes": [
        "https://www.bag.admin.ch/fr/newnsb/BfuGvedj0OOX",
        "https://www.bag.admin.ch/fr/assurance-maladie-comparaison-des-primes",
        "https://www.priminfo.admin.ch/fr/zahlen-und-fakten/praemiengenehmigung",
    ],
    "taux3a": [
        "https://www.fedlex.admin.ch/eli/cc/1985/1778_1778_1778/fr",
    ],
    "bns": [],  # le communiqué de la décision (lien du flux RSS) est ajouté au moment du déclenchement
    "mensuel": [
        "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/fr",
    ],
}
DONNEES = {
    "primes": ["site/src/data/barometre.json", "site/src/data/primes-2027-resume.json"],
    "taux3a": ["site/src/data/taux-3a.json", "site/src/data/taux-3a-historique.json"],
    "bns": ["site/src/data/taux-3a.json", "site/src/data/taux-3a-historique.json"],
    "mensuel": ["site/src/data/barometre.json", "site/src/data/taux-3a.json"],
}
MENSUEL = {  # sujet du rendez-vous mensuel, selon le mois
    1: "les nouveautés de l'assurance de base au 1er janvier et le versement 3a de la nouvelle année",
    2: "la franchise : comment elle se combine avec la quote-part sur une année",
    3: "les réductions de primes cantonales en Suisse romande : à qui elles s'adressent",
    4: "les modèles alternatifs (médecin de famille, télémédecine, réseau) et leurs règles",
    5: "l'assurance accident : quand elle est couverte par l'employeur (LAA) et quand l'inclure dans la LAMal",
    6: "les complémentaires et les questions de santé : ce que prévoit la loi sur le contrat d'assurance",
    7: "le calendrier des primes : dépôt des assureurs fin juillet, approbation OFSP, annonce fin septembre",
    8: "le 3e pilier : plafonds de l'année et rachat des années manquantes",
    9: "les primes de l'année suivante : ce que l'annonce de l'OFSP change pour un ménage",
    10: "changer d'assureur : délais de résiliation de l'assurance de base",
    11: "le dernier jour ouvrable de novembre : résilier l'assurance de base à temps",
    12: "le versement 3a avant le 31 décembre et l'économie d'impôt",
}


# ------------------------------------------------------------------ configuration
def lire_env() -> dict:
    e = {}
    if ENV_FILE.exists():
        for ligne in ENV_FILE.read_text().splitlines():
            m = re.match(r"\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$", ligne)
            if m and not ligne.lstrip().startswith("#"):
                e[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    for k in ("ANTHROPIC_API_KEY", "AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_API_KEY", "AZURE_OPENAI_DEPLOYMENT",
              "ACTUALITES_APPROBATION_CLE", "LEADS_URL"):
        if os.environ.get(k):
            e[k] = os.environ[k]
    return e


def cle_apercu() -> str:
    f = C.SITE / ".env.local"
    if f.exists():
        m = re.search(r"^ACTUALITES_APERCU_CLE=(.+)$", f.read_text(), re.M)
        if m:
            return m.group(1).strip()
    return ""


def jeton_apercu(cle: str, locale: str, slug: str = "") -> str:
    """Identique à jetonApercu() de site/src/lib/actualites-core.ts."""
    return hmac.new(cle.encode(), f"apercu|{locale}|{slug}".encode(), hashlib.sha256).hexdigest()[:32]


def b64u(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def cle_approbation(env: dict) -> bytes | None:
    v = env.get("ACTUALITES_APPROBATION_CLE", "")
    try:
        k = base64.b64decode(v) if v else b""
    except Exception:  # noqa: BLE001
        return None
    return k if len(k) >= 32 else None


def jeton_approbation(k: bytes, slug: str, empreinte_: str, titre: str, maintenant: dt.datetime) -> str:
    """Vérifié par leads/src/server/actualites/jeton.ts (même format)."""
    exp = int((maintenant + dt.timedelta(days=VALIDITE_JOURS)).timestamp())
    corps = b64u(json.dumps({"slug": slug, "hash": empreinte_, "titre": titre[:200], "exp": exp},
                            ensure_ascii=False, separators=(",", ":")).encode())
    sig = b64u(hmac.new(k, f"approuver|{corps}".encode(), hashlib.sha256).digest())
    return f"{corps}.{sig}"


# ------------------------------------------------------------------ articles
def fm(texte: str) -> tuple[dict, str]:
    """Front matter minimal (clés de premier niveau seulement) et corps."""
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", texte, re.S)
    if not m:
        return {}, texte
    d = {}
    for ligne in m.group(1).splitlines():
        mm = re.match(r"^([A-Za-z]+):\s*(.*)$", ligne)
        if mm:
            d[mm.group(1)] = mm.group(2).strip().strip('"')
    return d, m.group(2)


def paire(slug_fr: str) -> tuple[Path, Path | None]:
    fr = CONTENT["fr"] / f"{slug_fr}.md"
    en = None
    for p in CONTENT["en"].glob("*.md"):
        if fm(p.read_text(encoding="utf-8"))[0].get("fr") == slug_fr:
            en = p
    return fr, en


def empreinte(fr: Path, en: Path | None) -> str:
    h = hashlib.sha256(fr.read_bytes() + b"\n--\n" + (en.read_bytes() if en else b""))
    return h.hexdigest()[:32]


def brouillons() -> list[str]:
    if C.CI:  # brouillons = pull requests ouvertes sur une branche actualite/*
        r = subprocess.run(["gh", "pr", "list", "--state", "open", "--json", "headRefName", "--jq",
                            '.[].headRefName | select(startswith("actualite/"))'],
                           cwd=C.ROOT, capture_output=True, text=True, timeout=60)
        return sorted(ln.removeprefix("actualite/") for ln in r.stdout.split() if ln)
    return sorted(p.stem for p in CONTENT["fr"].glob("*.md")
                  if fm(p.read_text(encoding="utf-8"))[0].get("status") == "draft")


def passer_en_publie(p: Path, jour: str) -> None:
    t = p.read_text(encoding="utf-8")
    t = re.sub(r"^status:\s*draft\s*$", "status: published", t, count=1, flags=re.M)
    t = re.sub(r"^datePublished:.*$", f"datePublished: {jour}", t, count=1, flags=re.M)
    t = re.sub(r"^dateModified:.*$", f"dateModified: {jour}", t, count=1, flags=re.M)
    p.write_text(t, encoding="utf-8")


def yq(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)  # chaîne YAML entre guillemets doubles (JSON est du YAML valide)


def ecrire_article(d: dict, locale: str, jour: str, slug_fr: str | None, status: str = "draft") -> str:
    lignes = ["---", f"title: {yq(d['title'])}", f"description: {yq(d['description'])}",
              f"datePublished: {jour}", f"dateModified: {jour}", f"status: {status}"]
    if locale == "en" and slug_fr:
        lignes.append(f"fr: {slug_fr}")
    outils = [o for o in d.get("outils", []) if re.fullmatch(r"[a-z0-9]+", str(o))]
    if outils:
        lignes.append("outils: [" + ", ".join(outils) + "]")
    lignes.append("sources:")
    for s in d["sources"]:
        lignes.append(f"  - {{ label: {yq(s['label'])}, url: {yq(s['url'])} }}")
    lignes.append("faq:")
    for f in d["faq"]:
        lignes.append(f"  - q: {yq(f['q'])}")
        lignes.append(f"    a: {yq(f['a'])}")
    lignes.append("---")
    return "\n".join(lignes) + "\n\n" + d["markdown"].strip() + "\n"


# ------------------------------------------------------------------ déclencheurs
def sha_fichiers(paths: list[str]) -> str:
    h = hashlib.sha256()
    for p in paths:
        f = C.ROOT / p
        h.update(f.read_bytes() if f.exists() else b"")
    return h.hexdigest()


def taux_3a_dernier() -> dict[str, float]:
    f = C.SITE / "src" / "data" / "taux-3a-historique.json"
    rel = json.loads(f.read_text(encoding="utf-8"))["releves"]
    return {c["id"]: c["taux"] for c in rel[-1]["comptes"]} if rel else {}


def rss_bns(log: C.Log) -> list[dict]:
    code, body = C.http_get(SNB_RSS, timeout=30)
    if code != 200:
        raise RuntimeError(f"flux BNS : HTTP {code}")
    items = []
    for it in ET.fromstring(body).iter("item"):
        items.append({"titre": (it.findtext("title") or "").strip(), "lien": (it.findtext("link") or "").strip(),
                      "date": (it.findtext("pubDate") or "").strip()})
    log(f"flux BNS : {len(items)} élément(s)")
    return items


def declencheurs(log: C.Log, st: dict, a) -> tuple[list[dict], dict]:
    """Retourne (déclencheurs, mise à jour de l'état). Premier passage : l'état est initialisé sans déclencher."""
    maj, out = {}, []
    premier = "primes_sha" not in st
    sha = sha_fichiers(DONNEES["primes"])
    if st.get("primes_sha") != sha and not premier:
        out.append({"sujet": "primes", "raison": "nouvelles données de primes (OFSP) dans le site"})
    maj["primes_sha"] = sha

    taux = taux_3a_dernier()
    ref = st.get("taux3a_ref") or taux
    ecarts = {k: (ref.get(k), v) for k, v in taux.items() if ref.get(k) is not None and abs(v - ref[k]) >= SEUIL_3A - 1e-9}
    if ecarts and not premier:
        out.append({"sujet": "taux3a", "raison": f"{len(ecarts)} taux 3a ont varié d'au moins {SEUIL_3A} point",
                    "detail": {k: {"avant": x, "apres": y} for k, (x, y) in ecarts.items()}})
        maj["taux3a_ref"] = taux
    elif premier:
        maj["taux3a_ref"] = taux

    try:
        items = rss_bns(log)
        vus = set(st.get("bns_vus", []))
        nouveaux = [i for i in items if i["lien"] and i["lien"] not in vus
                    and re.search(r"politique mon[ée]taire|taux directeur|examen", i["titre"], re.I)]
        if nouveaux and not premier:
            n = nouveaux[0]
            out.append({"sujet": "bns", "raison": f"nouvelle décision de la BNS : {n['titre']}", "lien": n["lien"]})
        maj["bns_vus"] = sorted(vus | {i["lien"] for i in items if i["lien"]})[-200:]
    except Exception as e:  # noqa: BLE001
        log(f"flux BNS illisible : {e}")

    mois = C.now_zh().strftime("%Y-%m")
    if st.get("mensuel") != mois and not premier:
        out.append({"sujet": "mensuel", "raison": "rendez-vous mensuel", "theme": MENSUEL[C.now_zh().month]})
    if st.get("mensuel") != mois:
        maj["mensuel"] = mois
    if a.only:
        out = [d for d in out if d["sujet"] == a.only] or [{"sujet": a.only, "raison": "forcé (--only)",
                                                               "theme": MENSUEL[C.now_zh().month]}]
    return out, maj


# ------------------------------------------------------------------ sources
def texte_page(url: str) -> str:
    code, body = C.http_get(url, timeout=45)
    if code != 200 or not body:
        raise RuntimeError(f"HTTP {code}")
    if body[:4] == b"%PDF":
        raise RuntimeError("PDF non lu (texte seulement)")
    t = body.decode("utf-8", "replace")
    t = re.sub(r"(?is)<(script|style|nav|header|footer|svg)[^>]*>.*?</\1>", " ", t)
    t = re.sub(r"(?s)<[^>]+>", " ", t)
    t = html.unescape(re.sub(r"[ \t\r\f\v]+", " ", t))
    return re.sub(r"\n\s*\n+", "\n", t).strip()[:30000]


def faits_derives(sujet: str) -> str:
    """Nombres dérivés calculés ici (le LLM ne calcule pas, il reprend) : écarts en francs, par an, médianes."""
    lignes = []
    if sujet in ("primes", "mensuel"):
        b = json.loads((C.SITE / "src" / "data" / "barometre.json").read_text(encoding="utf-8"))
        rows = [("CH", b["national"])] + [(c["code"], c["officiel"]) for c in b["cantons"]]
        for code, o in rows:
            x, y = o["adulte_prec"], o["adulte"]
            lignes.append(f"{code} prime moyenne adulte : {x:.2f} -> {y:.2f} CHF/mois, +{y - x:.2f} CHF/mois, "
                          f"+{(y - x) * 12:.2f} CHF/an, +{o['variation_pct']} %")
        for c in b["cantons"]:
            for r in c["regions"]:
                for pr in r["profils"]:
                    if pr["cle"] != "adulte_300":
                        continue
                    for k in ("tous", "standard"):
                        t = pr[k]
                        lignes.append(f"{c['code']} région {r['region']} ({r['commune']}), adulte franchise 300 avec accident, "
                                      f"{'toutes offres' if k == 'tous' else 'modèle standard'} : n {t['n']}, min {t['min']:.2f}, "
                                      f"médiane {t['med']:.2f}, max {t['max']:.2f}, écart {(t['max'] - t['min']) / t['min'] * 100:.1f} %, "
                                      f"écart annuel {(t['max'] - t['min']) * 12:.2f} CHF")
    if sujet in ("taux3a", "bns", "mensuel"):
        t = sorted(taux_3a_dernier().values())
        if t:
            med = t[len(t) // 2] if len(t) % 2 else (t[len(t) // 2 - 1] + t[len(t) // 2]) / 2
            lignes.append(f"taux 3a : {len(t)} banques, min {t[0]:.2f} %, médiane {med:.2f} %, max {t[-1]:.2f} %")
            for r in (t[0], med, t[-1]):
                lignes.append(f"intérêts d'une année sur 7373 CHF à {r:.2f} % : {7373 * r / 100:.2f} CHF")
    return "\n".join(lignes)


def dossier(log: C.Log, d: dict) -> tuple[str, list[dict]]:
    """Texte des sources (données du site + pages officielles) et liste des pages effectivement lues."""
    parts, lues = [], []
    for p in DONNEES[d["sujet"]]:
        f = C.ROOT / p
        if f.exists():
            parts.append(f"### Données du site : {p}\n{f.read_text(encoding='utf-8')[:40000]}")
    urls = list(SOURCES[d["sujet"]]) + ([d["lien"]] if d.get("lien") else [])
    for u in urls:
        try:
            t = texte_page(u)
            parts.append(f"### Page officielle : {u}\n{t}")
            lues.append({"url": u, "octets": len(t)})
        except Exception as e:  # noqa: BLE001
            log(f"source illisible {u} : {e}")
    der = faits_derives(d["sujet"])
    if der:
        parts.append("### Nombres dérivés (calculés par le script à partir des données ci-dessus)\n" + der)
    return "\n\n".join(parts), lues


# ------------------------------------------------------------------ LLM
REGLES = """Tu rédiges un article d'actualité pour guide-assurance.ch, un site d'information neutre sur l'assurance en Suisse romande.
Règles absolues :
- N'utilise QUE les faits et les nombres présents dans le DOSSIER fourni. Aucun nombre qui n'y figure pas tel quel (sauf années et petits entiers). Si un chiffre manque, écris sans lui.
- Ne nomme aucune entreprise : aucun assureur, aucune banque, aucun courtier, aucun comparateur. Jamais le nom du courtier partenaire, jamais « West Bay ».
- Aucune recommandation, aucun superlatif commercial (meilleur, moins cher, idéal, garanti), jamais « indépendant », jamais « tous les assureurs », rien sur des commissions, la rémunération ou les données personnelles.
- Ton neutre et factuel, pas d'injonction (pas de « il faut », « vous devez »).
- Structure : une réponse directe en 2 à 4 phrases avant le premier intertitre ; 4 à 7 intertitres H2 (« ## ») formulés comme des questions ; pas de H1 ; phrases complètes, pas de style télégraphique « Étiquette : valeur ».
- Français de Suisse : espace fine insécable U+202F avant ; : ! ? et à l'intérieur des guillemets « » ; pas de tiret long ni demi-cadratin ; pas de tournure « pas X mais Y ».
- Longueur : 750 à 1100 mots en français ; l'anglais est une adaptation (pas une traduction mot à mot) de 600 à 1000 mots, sans espace fine.
- FAQ : 4 questions, réponses de 40 à 110 mots, cohérentes avec le corps.
- Sources : 3 à 6, chacune une URL https exacte tirée du DOSSIER (pages officielles), au moins 2 officielles (admin.ch, fedlex, finma.ch, snb.ch, sites cantonaux).
- title ≤ 60 caractères, description de 130 à 155 caractères.
- outils : choisis parmi comparateur, lettre, rappels, barometre, chiffres, regions, taux3a, historique3a, impot3a, simulateur.
Réponds uniquement par un objet JSON : {"fr": ART, "en": ART} avec ART = {"slug": "mots-en-minuscules-avec-tirets", "title": "...", "description": "...", "outils": [...], "sources": [{"label": "...", "url": "https://..."}], "faq": [{"q": "...", "a": "..."}], "markdown": "..."}."""


def appel_llm(env: dict, systeme: str, utilisateur: str, log: C.Log) -> str:
    if env.get("ANTHROPIC_API_KEY"):
        # API Messages en HTTP brut : les scripts infra/refresh n'utilisent que la bibliothèque standard de Python
        # (python3 système lancé par cron, sans environnement virtuel).
        corps = {
            "model": MODELE_ANTHROPIC, "max_tokens": 16000, "system": systeme,
            "thinking": {"type": "adaptive"}, "output_config": {"effort": "high"},
            "fallbacks": "default",
            "messages": [{"role": "user", "content": utilisateur}],
        }
        req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=json.dumps(corps).encode(), method="POST",
                                     headers={"x-api-key": env["ANTHROPIC_API_KEY"], "anthropic-version": "2026-10-21",
                                              "anthropic-beta": "server-side-fallback-2026-07-01",
                                              "content-type": "application/json"})
        with urllib.request.urlopen(req, timeout=900) as r:
            rep = json.loads(r.read())
        if rep.get("stop_reason") == "refusal":
            raise RuntimeError("le modèle a refusé la demande")
        if rep.get("stop_reason") == "max_tokens":
            raise RuntimeError("réponse tronquée (max_tokens)")
        log(f"LLM Anthropic {rep.get('model')} : {rep.get('usage', {})}")
        return "".join(b.get("text", "") for b in rep.get("content", []) if b.get("type") == "text")
    if env.get("AZURE_OPENAI_ENDPOINT") and env.get("AZURE_OPENAI_API_KEY"):
        dep = env.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4.1")
        url = (env["AZURE_OPENAI_ENDPOINT"].rstrip("/") + f"/openai/deployments/{urllib.parse.quote(dep)}"
               "/chat/completions?api-version=2025-01-01-preview")
        corps = {"messages": [{"role": "system", "content": systeme}, {"role": "user", "content": utilisateur}],
                 "response_format": {"type": "json_object"}, "max_tokens": 12000, "temperature": 0.3}
        req = urllib.request.Request(url, data=json.dumps(corps).encode(), method="POST",
                                     headers={"api-key": env["AZURE_OPENAI_API_KEY"], "content-type": "application/json"})
        with urllib.request.urlopen(req, timeout=600) as r:
            rep = json.loads(r.read())
        log(f"LLM Azure {dep} : {rep.get('usage', {})}")
        return rep["choices"][0]["message"]["content"]
    raise RuntimeError("aucun LLM configuré (ANTHROPIC_API_KEY ou AZURE_OPENAI_* dans infra/refresh/.env.actualites)")


def extraire_json(t: str) -> dict:
    m = re.search(r"\{.*\}", t, re.S)
    if not m:
        raise ValueError("pas d'objet JSON dans la réponse")
    return json.loads(m.group(0))


# ------------------------------------------------------------------ vérification
def noms_interdits() -> list[str]:
    n = set()
    for f in (C.SITE / "public" / "data" / "primes-2027").glob("[A-Z][A-Z].json"):
        n.update(json.loads(f.read_text(encoding="utf-8")).get("assureurs", []))
    for c in json.loads((C.SITE / "src" / "data" / "taux-3a.json").read_text(encoding="utf-8"))["comptes"]:
        n.add(c.get("banque") or c["id"])
    return sorted(n)


def verifier(fichier: Path, locale: str, corpus: Path, noms: Path) -> list[str]:
    r = subprocess.run(["node", "--no-warnings", "scripts/verifier-actualite.mts", str(fichier), "--locale", locale,
                        "--corpus", str(corpus), "--noms", str(noms)], cwd=C.SITE, capture_output=True, text=True, timeout=120)
    try:
        d = json.loads(r.stdout)
    except json.JSONDecodeError:
        return [f"vérificateur illisible : {r.stderr[-300:]}"]
    return [f"{e['regle']} : {e['detail']}" for e in d.get("echecs", [])]


# ------------------------------------------------------------------ e-mails
def lien(chemin: str) -> str:
    return f'<a href="{C.LIVE}{chemin}">{C.LIVE}{chemin}</a>'


def mail_brouillon(log, a, slug_fr: str, slug_en: str, art: dict, raison: str, lues: list[dict], env: dict, why: str):
    cle = cle_apercu()
    p = [f"Un brouillon d'article attend votre accord. Déclencheur : {html.escape(raison)}.",
         f"<b>{html.escape(art['fr']['title'])}</b><br>{html.escape(art['fr']['description'])}"]
    if cle:
        p.append("Aperçu (pages non indexées, lien privé) :<br>Français : "
                 + lien(f"{APERCU['fr']}{jeton_apercu(cle, 'fr', slug_fr)}/")
                 + "<br>Anglais : " + lien(f"{APERCU['en']}{jeton_apercu(cle, 'en', slug_en)}/")
                 + "<br>Tous les brouillons : " + lien(f"{APERCU['fr']}{jeton_apercu(cle, 'index')}/"))
    p.append("Sources citées :<br>" + "<br>".join(f"{html.escape(s['label'])} : {html.escape(s['url'])}" for s in art["fr"]["sources"]))
    p.append("Pages officielles relues par le script : " + (", ".join(html.escape(x["url"]) for x in lues) or "aucune (données du site seulement)"))
    k = cle_approbation(env)
    if k and env.get("LEADS_URL"):
        fr, en = paire(slug_fr)
        j = jeton_approbation(k, slug_fr, empreinte(fr, en), art["fr"]["title"], C.now_zh())
        url = env["LEADS_URL"].rstrip("/") + "/admin/actualites/approuver?jeton=" + j
        p.append(f'Pour publier cet article (français et anglais) : <a href="{html.escape(url)}">donner mon accord</a>. '
                 f"Le lien vaut {VALIDITE_JOURS} jours ; une confirmation est demandée après la connexion. "
                 "Si le texte est modifié entre-temps, l'accord ne vaut plus.")
    else:
        p.append(f"Pour publier, dites-le simplement à Claude en session (« publie l'article {slug_fr} »).")
    p.append(why)
    C.alert(log, DS, "brouillon à relire", p, a.dry_run, dedupe_days=0)


# ------------------------------------------------------------------ accords
def accords_leads(env: dict, log: C.Log) -> list[dict]:
    k = cle_approbation(env)
    if not (k and env.get("LEADS_URL")):
        return []
    bearer = b64u(hmac.new(k, b"poll", hashlib.sha256).digest())
    code, body = C.http_get(env["LEADS_URL"].rstrip("/") + "/api/actualites/approbations", timeout=30,
                            headers={"Authorization": f"Bearer {bearer}", "Accept": "application/json"})
    if code != 200:
        log(f"relevé des accords : HTTP {code}")
        return []
    return json.loads(body).get("approbations", [])


def publier_accords(log: C.Log, a, accords: list[dict], manuel: bool = False) -> int:
    jour = C.now_zh().date().isoformat()
    a_publier = []
    for acc in accords:
        fr, en = paire(acc["slug"])
        if not fr.exists() or fm(fr.read_text(encoding="utf-8"))[0].get("status") != "draft":
            continue
        if not manuel and acc.get("hash") != empreinte(fr, en):
            log(f"accord pour {acc['slug']} ignoré : le texte a changé depuis l'e-mail")
            C.alert(log, DS, "brouillon à relire", [f"Votre accord pour « {acc['slug']} » n'a pas été appliqué : le texte a été modifié après l'envoi de l'e-mail. Un nouveau lien suivra au prochain envoi."], a.dry_run)
            continue
        a_publier.append((acc["slug"], fr, en))
    if not a_publier:
        return 0
    if a.dry_run:
        log("[dry-run] publierait : " + ", ".join(s for s, *_ in a_publier))
        return 0
    backup = C.Backup([p for _, fr, en in a_publier for p in (fr, en) if p])
    ecrits = []
    for slug, fr, en in a_publier:
        for p in (fr, en):
            if p:
                passer_en_publie(p, jour)
                ecrits.append(p)
    checks = [{"url": f"{BASE['fr']}{s}/", "out": f"actualites/{s}/index.html", "values": [re.escape(s)]} for s, *_ in a_publier]
    published, why = C.publish(log, ecrits, backup, checks)
    if not published:
        backup.restore()  # les articles redeviennent des brouillons ; l'accord reste valable au passage suivant
    log(why)
    C.record_run(DS, "publie" if published else "ecrit_non_publie", why, success=published, published=published)
    C.alert(log, DS, "article publié" if published else "données à vérifier",
            ["Article(s) approuvé(s) : " + ", ".join(lien(f"{BASE['fr']}{s}/") for s, *_ in a_publier), why], False)
    return len(a_publier) if published else 0


# ------------------------------------------------------------------ passage
def rediger(log: C.Log, a, d: dict, env: dict) -> int:
    corpus, lues = dossier(log, d)
    if len(lues) == 0 and d["sujet"] != "taux3a":
        C.alert(log, DS, "données à vérifier", [f"Déclencheur « {d['raison']} » : aucune page officielle n'a pu être lue. Aucun brouillon rédigé."], a.dry_run)
        return 1
    consigne = (f"Sujet : {d['raison']}." + (f" Thème : {d['theme']}." if d.get("theme") else "")
                + (f" Détail : {json.dumps(d.get('detail'), ensure_ascii=False)}." if d.get("detail") else "")
                + f" Date du jour : {C.now_zh().date().isoformat()}.\n\nDOSSIER :\n{corpus}")
    if a.fake_llm:
        brut = Path(a.fake_llm).read_text(encoding="utf-8")
    else:
        brut = appel_llm(env, REGLES, consigne, log)
    art = extraire_json(brut)
    jour = C.now_zh().date().isoformat()
    slug_fr = re.sub(r"[^a-z0-9-]", "", art["fr"]["slug"].lower())[:80].strip("-")
    slug_en = re.sub(r"[^a-z0-9-]", "", art["en"]["slug"].lower())[:80].strip("-")
    if not slug_fr or not slug_en or (CONTENT["fr"] / f"{slug_fr}.md").exists() or (CONTENT["en"] / f"{slug_en}.md").exists():
        slug_fr, slug_en = f"{slug_fr or 'actualite'}-{jour}", f"{slug_en or 'news'}-{jour}"
    with tempfile.TemporaryDirectory() as tmp:
        t = Path(tmp)
        (t / "fr").mkdir()
        (t / "en").mkdir()
        f_fr, f_en = t / "fr" / f"{slug_fr}.md", t / "en" / f"{slug_en}.md"
        f_fr.write_text(ecrire_article(art["fr"], "fr", jour, None), encoding="utf-8")
        f_en.write_text(ecrire_article(art["en"], "en", jour, slug_fr), encoding="utf-8")
        (t / "corpus.txt").write_text(corpus, encoding="utf-8")
        (t / "noms.json").write_text(json.dumps(noms_interdits(), ensure_ascii=False), encoding="utf-8")
        echecs = [f"FR, {e}" for e in verifier(f_fr, "fr", t / "corpus.txt", t / "noms.json")] + \
                 [f"EN, {e}" for e in verifier(f_en, "en", t / "corpus.txt", t / "noms.json")]
        if echecs:
            log("brouillon rejeté : " + " | ".join(echecs))
            C.record_run(DS, "invalide", "; ".join(echecs)[:300], success=False)
            C.alert(log, DS, "brouillon rejeté",
                    [f"Déclencheur : {html.escape(d['raison'])}. Le brouillon « {html.escape(art['fr'].get('title', ''))} » "
                     "a échoué aux contrôles automatiques et a été jeté :", "<br>".join(html.escape(e) for e in echecs[:25]),
                     "Rien n'a été enregistré ni publié."], a.dry_run)
            return 1
        if a.dry_run:
            log(f"[dry-run] brouillon valide : {slug_fr} / {slug_en} (non enregistré)")
            return 0
        if C.CI:
            return ouvrir_pr(log, a, d, art, jour, slug_fr, slug_en, lues)
        dest_fr, dest_en = CONTENT["fr"] / f_fr.name, CONTENT["en"] / f_en.name
        dest_fr.write_text(f_fr.read_text(encoding="utf-8"), encoding="utf-8")
        dest_en.write_text(f_en.read_text(encoding="utf-8"), encoding="utf-8")
    log(f"brouillon écrit : {dest_fr.relative_to(C.ROOT)}, {dest_en.relative_to(C.ROOT)}")
    cle = cle_apercu()
    checks = [{"url": f"{APERCU['fr']}{jeton_apercu(cle, 'fr', slug_fr)}/",
               "out": f"{APERCU_OUT['fr']}/{jeton_apercu(cle, 'fr', slug_fr)}/index.html", "values": ["noindex"]}] if cle else []
    backup = C.Backup([])  # un brouillon reste écrit même si le déploiement échoue : il ne s'affiche que dans l'aperçu
    published, why = C.publish(log, [dest_fr, dest_en], backup, checks)
    why = ("Aperçu en ligne." if published else why.replace("Publié", "Aperçu déployé"))
    C.record_run(DS, "alerte", f"brouillon {slug_fr} en attente d'accord", success=True)
    mail_brouillon(log, a, slug_fr, slug_en, art, d["raison"], lues, env, why)
    return 0


def ouvrir_pr(log: C.Log, a, d: dict, art: dict, jour: str, slug_fr: str, slug_en: str, lues: list[dict]) -> int:
    """GitHub Actions : branche actualite/<slug>, articles en status: published, pull request, e-mail à Sam."""
    branche = f"actualite/{slug_fr}"
    dest_fr, dest_en = CONTENT["fr"] / f"{slug_fr}.md", CONTENT["en"] / f"{slug_en}.md"
    textes = {"fr": ecrire_article(art["fr"], "fr", jour, None, "published"),
              "en": ecrire_article(art["en"], "en", jour, slug_fr, "published")}
    git = ["git", "-c", "user.name=guide-assurance-bot", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com"]
    code, _ = C.sh(log, ["git", "switch", "-c", branche], C.ROOT)
    if code:
        C.alert(log, DS, "données à vérifier", [f"Impossible de créer la branche {html.escape(branche)}. Aucun brouillon proposé."], a.dry_run)
        return 1
    try:
        for p, loc in ((dest_fr, "fr"), (dest_en, "en")):
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(textes[loc], encoding="utf-8")
        titre = art["fr"]["title"]
        C.sh(log, ["git", "add", str(dest_fr), str(dest_en)], C.ROOT)
        code, _ = C.sh(log, [*git, "commit", "-m", f"Actualité : {titre}"], C.ROOT)
        if not code:
            code, _ = C.sh(log, ["git", "push", "-u", "origin", branche], C.ROOT, timeout=300)
        if code:
            C.alert(log, DS, "données à vérifier", [f"Le brouillon « {html.escape(titre)} » n'a pas pu être poussé sur GitHub."], a.dry_run)
            return 1

        def sans_fm(s: str) -> str:
            return re.sub(r"^---\n.*?\n---\n", "", s, count=1, flags=re.S).strip()
        sources = "\n".join(f"- [{s['label']}]({s['url']})" for s in art["fr"]["sources"])
        relues = "\n".join(f"- {x['url']}" for x in lues) or "- aucune (données du site seulement)"
        corps = (f"Brouillon rédigé par le LLM et vérifié par `site/scripts/verifier-actualite.mts`.\n\n"
                 f"**Déclencheur :** {d['raison']}\n\n"
                 "**Fusionner cette pull request publie l'article** (FR et EN) : le push sur main déploie le site. "
                 "La fermer sans fusionner l'abandonne. Le texte peut être corrigé dans la branche avant la fusion.\n\n"
                 f"### Sources citées\n{sources}\n\n### Pages officielles relues par le script\n{relues}\n\n"
                 f"### Aperçu FR : {art['fr']['title']}\n\n*{art['fr']['description']}*\n\n{sans_fm(textes['fr'])}\n\n"
                 f"### Aperçu EN : {art['en']['title']}\n\n*{art['en']['description']}*\n\n{sans_fm(textes['en'])}\n")
        if len(corps) > 60000:
            corps = corps[:60000] + "\n\n(aperçu tronqué : voir les fichiers de la pull request)"
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
            f.write(corps)
        r = subprocess.run(["gh", "pr", "create", "--base", "main", "--head", branche, "--title", f"Actualité : {titre}",
                            "--body-file", f.name], cwd=C.ROOT, capture_output=True, text=True, timeout=120)
        url = r.stdout.strip().splitlines()[-1] if r.returncode == 0 and r.stdout.strip() else ""
        if not url:
            log("gh pr create : " + (r.stderr or r.stdout)[-300:])
            C.alert(log, DS, "données à vérifier", [f"Le brouillon « {html.escape(titre)} » est sur la branche {html.escape(branche)}, "
                                                    "mais la pull request n'a pas pu être ouverte."], a.dry_run)
            return 1
        log(f"pull request ouverte : {url}")
        # Contrôle de build de la branche (les pull requests ouvertes par GITHUB_TOKEN ne lancent pas la CI d'elles-mêmes).
        C.sh(log, ["gh", "workflow", "run", "ci-deploy.yml", "--ref", branche], C.ROOT)
        C.record_run(DS, "alerte", f"brouillon {slug_fr} en attente (pull request)", success=True)
        C.alert(log, DS, "article à relire",
                [f"Un brouillon d'article attend votre relecture. Déclencheur : {html.escape(d['raison'])}.",
                 f"<b>{html.escape(titre)}</b><br>{html.escape(art['fr']['description'])}",
                 f'Aperçu, sources et texte complet : <a href="{html.escape(url)}">{html.escape(url)}</a>',
                 "Fusionner la pull request publie l'article (français et anglais). La fermer l'abandonne."],
                a.dry_run, dedupe_days=0)
        return 0
    finally:
        C.sh(log, ["git", "switch", "main"], C.ROOT)


def run(log: C.Log, a) -> int:
    env = lire_env()
    if a.approve:
        fr, en = paire(a.approve)
        if not fr.exists():
            log(f"--approve : {fr} introuvable")
            return 1
        return 0 if publier_accords(log, a, [{"slug": a.approve}], manuel=True) else 1
    try:
        publier_accords(log, a, accords_leads(env, log))
    except Exception as e:  # noqa: BLE001
        log(f"relevé des accords impossible : {e}")
    st = C.load_state(DS)
    trig, maj = declencheurs(log, st, a)
    if not a.dry_run:
        C.save_state(DS, **maj)
    if not trig:
        C.record_run(DS, "ok", "aucun déclencheur", success=True)
        log("aucun déclencheur")
        return 0
    if len(brouillons()) >= 3 and not a.only:
        log(f"{len(brouillons())} brouillons attendent déjà un accord : pas de nouveau brouillon")
        C.record_run(DS, "ok", "brouillons en attente", success=True)
        return 0
    d = trig[0]  # un brouillon au plus par passage
    log(f"déclencheur : {d['raison']}" + (f" (autres : {', '.join(x['sujet'] for x in trig[1:])})" if trig[1:] else ""))
    if not (env.get("ANTHROPIC_API_KEY") or env.get("AZURE_OPENAI_API_KEY")) and not a.fake_llm:
        C.alert(log, DS, "clé manquante", [f"Déclencheur « {html.escape(d['raison'])} », mais aucune clé de LLM n'est configurée "
                                           "(secret GitHub Actions ANTHROPIC_API_KEY, ou AZURE_OPENAI_ENDPOINT et AZURE_OPENAI_API_KEY). Aucun brouillon rédigé."], a.dry_run)
        return 1
    return rediger(log, a, d, env)


if __name__ == "__main__":
    ap = C.base_args(__doc__)
    ap.add_argument("--approve", metavar="SLUG_FR", help="publie ce brouillon (FR et sa version EN) : accord donné par Sam en session")
    ap.add_argument("--only", choices=["primes", "taux3a", "bns", "mensuel"], help="force ce déclencheur (essai)")
    ap.add_argument("--fake-llm", metavar="FICHIER_JSON", help="réponse LLM lue dans ce fichier (essai sans appel d'API)")
    sys.exit(C.run_main(DS, run, ap.parse_args()))
