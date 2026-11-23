#!/usr/bin/env python3
"""Chiffres cités dans les actualités publiées : comparaison hebdomadaire avec les données actuelles du site.

Manifeste : site/content/actualites-chiffres.json. Pour chaque article, la liste des chiffres tirés des données du
site, chacun avec :
  cle        d'où vient la valeur actuelle (voir valeur()) : « fichier:chemin » dans site/src/data, ou « calc:… »
  decimales  arrondi du chiffre tel qu'il est cité
  texte      le nombre exactement comme il est écrit dans l'article (« 2 915,70 », « 0,65 », « 1,743.60 »)
  contexte   un extrait exact de l'article qui contient ce nombre (il le situe sans ambiguïté)

Un chiffre dont la valeur actuelle, arrondie, diffère du texte cité : l'article est corrigé automatiquement
(chaque occurrence du contexte, front matter compris), dateModified passe au jour, une ligne visible « Mis à jour
le … » (EN « Updated on … ») est mise en tête du texte et le manifeste suit. Le vérificateur des actualités
(site/scripts/verifier-actualite.mts) est relancé sur chaque article modifié ; s'il passe, publication comme un
relevé de données (tests, build, commit sur main, déploiement, vérification en ligne). Sinon rien n'est publié et
une alerte part. Pas de relecture (décision de Sam du 23.11.2026) : e-mail seulement en cas d'échec.
Un contexte introuvable (article retouché à la main) : alerte, rien n'est modifié pour ce chiffre.

  python3 infra/refresh/chiffres.py --dry-run                   # compare et affiche, n'écrit rien
  python3 infra/refresh/chiffres.py --dry-run --simulate-change # simule un écart sur le premier chiffre
  python3 infra/refresh/chiffres.py --forcer-ecart              # essai : écart simulé, article corrigé et vérifié,
                                                                #   commit sur une branche essai/… (jamais main), pas de déploiement
"""
from __future__ import annotations

import datetime as dt
import html
import json
import os
import re
import statistics
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402
import actualites as A  # noqa: E402  (vérificateur et noms interdits, mêmes contrôles que pour un nouvel article)

DS = "chiffres"
DATA = C.SITE / "src" / "data"
CONTENT = C.SITE / "content"
MANIFESTE = CONTENT / "actualites-chiffres.json"
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
SEP_MILLIERS = "   '’"


# ------------------------------------------------------------------ valeurs actuelles
def _charger(fichier: str):
    for base in (DATA, C.SITE / "public" / "data"):
        p = base / fichier
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))
    raise KeyError(f"fichier de données introuvable : {fichier}")


def _chemin(d, chemin: str):
    """a.b[champ=valeur].c[0] : clés, sélection dans une liste par égalité de champ, indice."""
    for seg in re.findall(r"[^.\[\]]+|\[[^\]]+\]", chemin):
        if seg.startswith("["):
            sel = seg[1:-1]
            if "=" in sel:
                k, v = sel.split("=", 1)
                d = next(x for x in d if str(x.get(k)) == v)
            else:
                d = d[int(sel)]
        else:
            d = d[seg]
    return d


def _taux3a() -> list[float]:
    return [c["taux"] for c in _charger("taux-3a.json")["comptes"] if isinstance(c.get("taux"), (int, float))]


CALC = {
    "taux3a.min": lambda: min(_taux3a()),
    "taux3a.max": lambda: max(_taux3a()),
    "taux3a.mediane": lambda: statistics.median(_taux3a()),
    "taux3a.moyenne": lambda: statistics.fmean(_taux3a()),
    "taux3a.nombre": lambda: len(_taux3a()),
}


def valeur(cle: str) -> float:
    """« calc:taux3a.max », « calc:taux3a.nombre_le:0.20 » (banques à ce taux ou moins), ou « fichier.json:chemin »."""
    if cle.startswith("calc:"):
        nom = cle[5:]
        if nom.startswith("taux3a.nombre_le:"):
            seuil = float(nom.split(":", 1)[1])
            return sum(1 for t in _taux3a() if t <= seuil + 1e-9)
        return CALC[nom]()
    fichier, chemin = cle.split(":", 1)
    v = _chemin(_charger(fichier), chemin)
    if not isinstance(v, (int, float)):
        raise ValueError(f"{cle} n'est pas un nombre ({v!r})")
    return v


# ------------------------------------------------------------------ nombres écrits
def lire_nombre(texte: str, locale: str) -> float:
    t = texte.strip()
    if locale == "fr":
        t = "".join(ch for ch in t if ch not in SEP_MILLIERS).replace(",", ".")
    else:
        t = "".join(ch for ch in t if ch not in SEP_MILLIERS + ",")
    return float(t)


def ecrire_nombre(x: float, decimales: int, locale: str, modele: str) -> str:
    """Même présentation que le texte cité (séparateur de milliers repris du modèle)."""
    s = f"{x:,.{decimales}f}"                                   # 1,234.50
    ent, _, dec = s.partition(".")
    if locale == "fr":
        sep = next((ch for ch in modele if ch in SEP_MILLIERS), " ")
        ent = ent.replace(",", sep)
        return ent + ("," + dec if dec else "")
    sep = "," if "," in modele or len(ent.replace(",", "")) > 3 else ""
    return ent.replace(",", sep) + ("." + dec if dec else "")


def date_longue(jour: dt.date, locale: str) -> str:
    return f"{jour.day} {MOIS[jour.month - 1]} {jour.year}" if locale == "fr" else f"{jour.day} {MONTHS[jour.month - 1]} {jour.year}"


def ligne_maj(jour: dt.date, locale: str) -> str:
    if locale == "fr":
        return f"*Mis à jour le {date_longue(jour, 'fr')}\u202f: chiffres actualisés d’après les données du site.*"
    return f"*Updated on {date_longue(jour, 'en')}: figures refreshed from the site’s data.*"


# ------------------------------------------------------------------ comparaison
def comparer(log: C.Log, man: dict, forcer: bool) -> tuple[list[dict], list[str]]:
    """-> (écarts, problèmes). Un écart : {fichier, locale, fait, ancien, nouveau, actuel}."""
    ecarts, problemes = [], []
    premier = True
    for art in man["articles"]:
        f = CONTENT / art["fichier"]
        locale = art["fichier"].split("/", 1)[0]
        if not f.exists():
            problemes.append(f"{art['fichier']} : article introuvable")
            continue
        texte_article = f.read_text(encoding="utf-8")
        for fait in art["faits"]:
            nom = f"{art['fichier']} « {fait['contexte'][:60]} »"
            try:
                actuel = valeur(fait["cle"])
            except Exception as e:  # noqa: BLE001
                problemes.append(f"{nom} : valeur {fait['cle']} illisible ({e})")
                continue
            if forcer and premier:
                actuel = actuel + 10 ** -fait["decimales"]
                log(f"[simulation] {fait['cle']} : valeur actuelle forcée à {actuel}")
            premier = False
            if fait["contexte"] not in texte_article or fait["texte"] not in fait["contexte"]:
                problemes.append(f"{nom} : extrait introuvable dans l'article (retouché à la main ?), chiffre non vérifié")
                continue
            cite = lire_nombre(fait["texte"], locale)
            if round(actuel, fait["decimales"]) != round(cite, fait["decimales"]):
                nouveau = ecrire_nombre(round(actuel, fait["decimales"]), fait["decimales"], locale, fait["texte"])
                ecarts.append({"fichier": art["fichier"], "locale": locale, "fait": fait, "ancien": fait["texte"],
                               "nouveau": nouveau, "actuel": actuel})
                log(f"écart {nom} : cité {fait['texte']}, actuel {nouveau} ({fait['cle']})")
    return ecarts, problemes


def appliquer(ecarts: list[dict], man: dict, jour: dt.date) -> list[Path]:
    ecrits = []
    for fichier in sorted({e["fichier"] for e in ecarts}):
        p = CONTENT / fichier
        locale = fichier.split("/", 1)[0]
        t = p.read_text(encoding="utf-8")
        for e in (x for x in ecarts if x["fichier"] == fichier):
            ctx = e["fait"]["contexte"]
            nctx = ctx.replace(e["ancien"], e["nouveau"])
            t = t.replace(ctx, nctx)
            e["fait"]["contexte"], e["fait"]["texte"] = nctx, e["nouveau"]
        t = re.sub(r"^dateModified:.*$", f"dateModified: {jour.isoformat()}", t, count=1, flags=re.M)
        m = re.match(r"^(---\n.*?\n---\n)\n*(.*)$", t, re.S)
        corps = re.sub(r"^\*(Mis à jour le|Updated on) [^\n]*\*\n+", "", m.group(2))
        t = m.group(1) + "\n" + ligne_maj(jour, locale) + "\n\n" + corps
        p.write_text(t, encoding="utf-8")
        ecrits.append(p)
    MANIFESTE.write_text(json.dumps(man, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return ecrits + [MANIFESTE]


# ------------------------------------------------------------------ vérification et publication
def verifier_articles(log: C.Log, fichiers: list[Path], avant: dict[Path, str], nouveaux: list[str]) -> list[str]:
    """Vérificateur des actualités sur chaque article modifié. Corpus : texte de l'article avant correction (les chiffres
    inchangés y figurent), données du site et nouveaux chiffres tels qu'écrits (calculés à partir de ces données)."""
    echecs = []
    with tempfile.TemporaryDirectory() as tmp:
        corpus = Path(tmp) / "corpus.txt"
        donnees = "\n".join(f.read_text(encoding="utf-8") for f in sorted(DATA.glob("*.json")))
        noms = Path(tmp) / "noms.json"
        noms.write_text(json.dumps(A.noms_interdits(), ensure_ascii=False), encoding="utf-8")
        for f in fichiers:
            if f == MANIFESTE:
                continue
            corpus.write_text(avant[f] + "\n" + donnees + "\n" + "\n".join(nouveaux), encoding="utf-8")
            locale = f.relative_to(CONTENT).parts[0]
            echecs += [f"{f.relative_to(CONTENT)} : {e}" for e in A.verifier(f, locale, corpus, noms)]
    for e in echecs:
        log("vérificateur : " + e)
    return echecs


def checks_en_ligne(ecarts: list[dict]) -> list[dict]:
    out = []
    for fichier in sorted({e["fichier"] for e in ecarts}):
        locale, _, nom = fichier.partition("/actualites/")
        slug = nom.removesuffix(".md")
        url = f"{A.BASE[locale]}{slug}/"
        out.append({"url": url, "out": url.strip("/") + "/index.html",
                    "values": [re.escape(e["nouveau"]) for e in ecarts if e["fichier"] == fichier]})
    return out


def essai_branche(log: C.Log, ecrits: list[Path]) -> tuple[bool, str]:
    """--forcer-ecart en CI : commit sur une branche essai/chiffres-<date>, jamais sur main, pas de déploiement."""
    branche = f"essai/chiffres-{C.now_zh().strftime('%Y%m%d-%H%M')}"
    git = ["git", "-c", "user.name=guide-assurance-bot", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com"]
    if C.sh(log, ["git", "switch", "-c", branche], C.ROOT)[0]:
        return False, "branche impossible à créer"
    try:
        C.sh(log, ["git", "add", *map(str, ecrits)], C.ROOT)
        if C.sh(log, [*git, "commit", "-m", "[essai] Actualités : chiffres mis à jour (écart simulé)"], C.ROOT)[0]:
            return False, "commit impossible"
        if C.sh(log, ["git", "push", "-u", "origin", branche], C.ROOT, timeout=300)[0]:
            return False, "push impossible"
        C.sh(log, ["gh", "workflow", "run", "ci-deploy.yml", "--ref", branche], C.ROOT)  # tests et build de la branche
        return True, branche
    finally:
        C.sh(log, ["git", "switch", "main"], C.ROOT)


# ------------------------------------------------------------------ passage
def run(log: C.Log, a) -> int:
    man = json.loads(MANIFESTE.read_text(encoding="utf-8"))
    forcer = a.simulate_change or a.forcer_ecart
    ecarts, problemes = comparer(log, man, forcer)
    n = sum(len(x["faits"]) for x in man["articles"])
    log(f"{n} chiffres suivis dans {len(man['articles'])} articles : {len(ecarts)} écart(s), {len(problemes)} problème(s)")
    resume = os.environ.get("GITHUB_STEP_SUMMARY")
    if resume:
        with open(resume, "a", encoding="utf-8") as fh:
            fh.write(f"### Chiffres des actualités\n\n{n} chiffres suivis, {len(ecarts)} écart(s), {len(problemes)} problème(s)\n\n"
                     + "".join(f"- écart `{e['fichier']}` : {e['ancien']} → {e['nouveau']} (`{e['fait']['cle']}`)\n" for e in ecarts)
                     + "".join(f"- {html.escape(p)}\n" for p in problemes))
    if problemes:
        C.alert(log, DS, "données à vérifier",
                ["Contrôle des chiffres cités dans les actualités : certains chiffres n'ont pas pu être vérifiés.",
                 "<br>".join(html.escape(p) for p in problemes),
                 "Corriger site/content/actualites-chiffres.json (extrait exact de l'article) ou l'article."], a.dry_run)
    if not ecarts:
        C.record_run(DS, "ok" if not problemes else "alerte", "aucun écart", success=not problemes)
        return 1 if problemes else 0
    if a.dry_run:
        log("[dry-run] ouvrirait une pull request pour : " + ", ".join(f"{e['fichier']} {e['ancien']}→{e['nouveau']}" for e in ecarts))
        return 0
    jour = C.now_zh().date()
    fichiers = sorted({CONTENT / e["fichier"] for e in ecarts})
    avant = {f: f.read_text(encoding="utf-8") for f in fichiers}
    backup = C.Backup([*fichiers, MANIFESTE])
    ecrits = appliquer(ecarts, man, jour)
    tab = "<br>".join(f"{html.escape(e['fichier'])} : {html.escape(e['ancien'])} → {html.escape(e['nouveau'])}" for e in ecarts)
    echecs = verifier_articles(log, ecrits, avant, [e["nouveau"] for e in ecarts])
    if echecs:
        backup.restore()
        C.record_run(DS, "invalide", "; ".join(echecs)[:300], success=False)
        C.alert(log, DS, "données à vérifier",
                ["Des chiffres cités dans des actualités ne correspondent plus aux données du site :", tab,
                 "La mise à jour automatique échoue au vérificateur des actualités ; rien n'a été publié :",
                 "<br>".join(html.escape(e) for e in echecs[:25])], False)
        return 1
    if a.forcer_ecart:
        if not C.CI:
            log("essai hors GitHub Actions : articles corrigés et vérifiés, remis en l'état")
            backup.restore()
            return 0
        ok, info = essai_branche(log, ecrits)
        backup.restore()
        log(("essai : branche " + info) if ok else ("essai impossible : " + info))
        return 0 if ok else 1
    if not C.CI:
        backup.restore()
        log("hors GitHub Actions : rien n'est publié (lancer le workflow chiffres-actualites.yml)")
        return 1
    published, why = C.publish(log, ecrits, backup, checks_en_ligne(ecarts))
    log(why)
    C.record_run(DS, "publie" if published else "ecrit_non_publie", why[:300], success=published, published=published)
    if not published:
        C.alert(log, DS, "données à vérifier",
                ["Des chiffres cités dans des actualités ne correspondent plus aux données du site :", tab,
                 "La mise à jour automatique n'a pas pu être publiée :", html.escape(why)], False)
        return 1
    return 0


if __name__ == "__main__":
    ap = C.base_args(__doc__)
    ap.add_argument("--forcer-ecart", action="store_true", help="essai réel : simule un écart et ouvre une pull request [essai]")
    sys.exit(C.run_main(DS, run, ap.parse_args()))
