"""Adaptateur guide-assurance.ch du SEO mensuel (scripts/seo/seo_mensuel.py).

Pages : site/content/{fr,en}/*.md et les actualités publiées (site/content/{fr,en}/actualites/*.md). Titre et
description dans l'en-tête YAML (title, description) ; FAQ dans la liste faq de l'en-tête, qui alimente à la fois la
FAQ visible et le JSON-LD FAQPage (faq-sections.tsx, contrôlé par npm run test:html). Une question ajoutée en
français l'est aussi dans la version anglaise de la page, et inversement.
Jamais touchées : confidentialité, mentions légales, indépendance (pages légales et de financement).
Sujets sans page adaptée : data/seo-sujets.json, repris par infra/refresh/actualites.py (déclencheur « seo »).
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "site"
CONTENT = SITE / "content"

NOM = "guide-assurance.ch"
PROPRIETE = "sc-domain:guide-assurance.ch"
HOTE = "guide-assurance.ch"
BASE_URL = "https://guide-assurance.ch"
BOT = "guide-assurance-bot"
DEPLOIEMENT_LLM = "gpt-4.1"
VERSION_API_LLM = "2025-01-01-preview"
APOSTROPHE_COURBE = True
MARQUE = r"guide.?assurance"
MIN_IMPR_FAQ = 10
THEME = ("information neutre sur l'assurance en Suisse romande : assurance maladie LAMal et complémentaires, 3e pilier, "
         "auto, ménage et RC, protection juridique, voyage, animaux, entreprises (LAA, LPP, IJM, RC professionnelle, "
         "cyber), frontaliers, nouveaux arrivants")
REGLES_SITE = ("site d'information neutre qui compare sans jamais recommander ; ne nomme aucune entreprise (aucun "
               "assureur, aucune banque, aucun courtier, aucun comparateur), jamais « West Bay » ; aucune "
               "recommandation d'assureur ou de produit, aucun superlatif commercial (meilleur, moins cher, idéal, "
               "garanti, gratuit), jamais « indépendant », jamais « tous les assureurs » ; rien sur des commissions, une "
               "rémunération, le courtage ou la vente de données ; pas d'injonction (il faut, vous devez) ; français de "
               "Suisse avec apostrophe typographique ’, espace fine insécable avant ; : ! ? et dans les guillemets « ».")
# Mêmes règles que site/src/lib/verifier-actualite.ts, plus les marques interdites de scripts/check-forbidden.sh
# (motif de base ici, le reste dans le secret FORBIDDEN_PATTERNS, lu par le moteur).
INTERDITS = [
    ("leman" "is", "nom interdit (courtier partenaire)"),
    (r"west\s*bay", "West Bay hors pied de page"),
    (r"\bcommissions?\b|\bcourtage\b|\bcourtier|\bbroker", "rémunération ou courtage"),
    (r"(?<!envoi )(?<!lettre )(?<!courrier )(?<!pli )(?<!par )\brecommand\w*|\brecommend\w*", "recommandation"),
    (r"\bnous conseillons\b|\bwe advise\b", "conseil"),
    (r"\bmeilleur(e|s|es)?\b|\bbest\b", "superlatif commercial"),
    (r"\bmoins cher\w*|\bcheapest\b|\bcheaper\b", "« moins cher » (classement)"),
    (r"\bind[ée]pendan\w*|\bindependent\b", "« indépendant »"),
    (r"\btous les assureurs\b|\ball (the )?insurers\b", "« tous les assureurs »"),
    (r"\bgratuit\w*|\bfree of charge\b|\bfree\b", "« gratuit »"),
    (r"[ée]conomisez|\bsave up to\b", "promesse d'économie"),
    (r"\bvente de donn[ée]es\b|\bsell(ing)? (your )?data\b", "données personnelles"),
    (r"\bil faut\b|\bvous devez\b|\byou must\b", "ton injonctif"),
    (r"\bgaranti(e|s|es)?\b|\bguaranteed?\b", "« garanti »"),
    (r"\bid[ée]al(e|es|s)?\b", "« idéal »"),
]
EXCLUS = {"confidentialite", "mentions-legales", "independance"}
SUJETS = ROOT / "data" / "seo-sujets.json"
DEST_SUJETS = "file des actualités data/seo-sujets.json, reprise par actualites.py"


class Page:
    def __init__(self, f: Path, locale: str, url: str, article: bool):
        self.path, self.locale, self.url, self.article = f, locale, url, article
        self.fichier = str(f.relative_to(ROOT))
        self.suffixe = ""
        self.meta_ok = True
        self.faq_max = 6 if article else 12
        self.soeurs: dict[str, Page] = {}
        txt = f.read_text(encoding="utf-8")
        fm = txt.split("\n---", 1)[0]
        self.fm = fm
        self.title = _val(fm, "title")
        self.description = _val(fm, "description")
        self.faq = _faq(fm) if re.search(r"^faq:\s*$", fm, re.M) else None

    def texte(self) -> str:
        t = self.path.read_text(encoding="utf-8")
        return re.sub(r"^\s*-\s*\{\s*label:.*$", "", t, flags=re.M)  # URLs des sources : pas des faits utiles


def _val(fm: str, cle: str) -> str:
    m = re.search(rf"^{cle}:\s*(.+)$", fm, re.M)
    if not m:
        return ""
    v = m.group(1).strip()
    return json.loads(v) if v.startswith('"') else v.strip("'")


def _faq(fm: str) -> list[dict]:
    out, q = [], None
    for ln in fm.split("\n")[fm.split("\n").index("faq:") + 1:]:
        if not ln.startswith(" "):
            break
        m = re.match(r"\s*-\s*q:\s*(.+)$", ln)
        if m:
            q = json.loads(m.group(1)) if m.group(1).startswith('"') else m.group(1)
            continue
        m = re.match(r"\s+a:\s*(.+)$", ln)
        if m and q is not None:
            out.append({"q": q, "a": json.loads(m.group(1)) if m.group(1).startswith('"') else m.group(1)})
            q = None
    return out


def yq(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def pages() -> dict[str, Page]:
    out: dict[str, Page] = {}
    par_fichier: dict[tuple[str, str], Page] = {}
    articles_en_fr: dict[str, Page] = {}
    for loc in ("fr", "en"):
        for f in sorted((CONTENT / loc).glob("*.md")):
            if f.stem in EXCLUS:
                continue
            slug = _val(f.read_text(encoding="utf-8").split("\n---", 1)[0], "slug")
            if not slug:
                continue
            p = Page(f, loc, slug if slug.endswith("/") else slug + "/", False)
            out[p.url] = par_fichier[(loc, f.stem)] = p
        base = "/actualites/" if loc == "fr" else "/en/news/"
        for f in sorted((CONTENT / loc / "actualites").glob("*.md")):
            fm = f.read_text(encoding="utf-8").split("\n---", 1)[0]
            if _val(fm, "status") != "published":
                continue
            p = Page(f, loc, f"{base}{f.stem}/", True)
            out[p.url] = p
            if loc == "fr":
                par_fichier[("fr-art", f.stem)] = p
            elif _val(fm, "fr"):
                articles_en_fr[_val(fm, "fr")] = p
    for (loc, stem), p in par_fichier.items():
        if loc == "fr" and ("en", stem) in par_fichier:
            en = par_fichier[("en", stem)]
            p.soeurs, en.soeurs = {"en": en}, {"fr": p}
        if loc == "fr-art" and stem in articles_en_fr:
            en = articles_en_fr[stem]
            p.soeurs, en.soeurs = {"en": en}, {"fr": p}
    return out


def ecrire_meta(page: Page, title: str, description: str) -> list[Path]:
    t = page.path.read_text(encoding="utf-8")
    fm, reste = t.split("\n---", 1)
    fm = re.sub(r"^title:.*$", lambda _: f"title: {yq(title)}", fm, count=1, flags=re.M)
    fm = re.sub(r"^description:.*$", lambda _: f"description: {yq(description)}", fm, count=1, flags=re.M)
    page.path.write_text(fm + "\n---" + reste, encoding="utf-8")
    return [page.path]


def ajouter_faq(page: Page, q: str, a: str) -> list[Path]:
    t = page.path.read_text(encoding="utf-8")
    fm, reste = t.split("\n---", 1)
    lignes = fm.split("\n")
    i = lignes.index("faq:") + 1
    while i < len(lignes) and lignes[i].startswith(" "):
        i += 1
    lignes[i:i] = [f"  - q: {yq(q)}", f"    a: {yq(a)}"]
    page.path.write_text("\n".join(lignes) + "\n---" + reste, encoding="utf-8")
    return [page.path]


def ajouter_sujets(sujets: list[dict]) -> tuple[list[Path], list[Path]]:
    nouveau = not SUJETS.exists()
    d = json.loads(SUJETS.read_text(encoding="utf-8")) if not nouveau else {
        "_lisezmoi": "Recherches Google vues sans page adaptée, ajoutées chaque mois par scripts/seo/seo_mensuel.py. "
                     "infra/refresh/actualites.py en prend une par semaine au plus (déclencheur « seo ») et la fait "
                     "rédiger avec les contrôles habituels ; statut : en attente, essaye.",
        "sujets": []}
    vus = {s["requete"] for s in d["sujets"]}
    for s in sujets:
        if s["requete"] not in vus:
            d["sujets"].append({**s, "statut": "en attente"})
    SUJETS.parent.mkdir(parents=True, exist_ok=True)
    SUJETS.write_text(json.dumps(d, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return [SUJETS], ([SUJETS] if nouveau else [])


def controles(fichiers: list[Path]) -> list[tuple[str, str, str]]:
    c = [("Mentions interdites (dépôt)", "bash scripts/check-forbidden.sh", "."),
         ("Types (tsc)", "npx tsc --noEmit", "site"),
         ("Lint", "npm run lint", "site"),
         ("Tests", "npm test", "site")]
    for f in fichiers:  # actualités modifiées : vérificateur des articles (règles éditoriales, FAQ, longueurs)
        if "/actualites/" in str(f) and f.suffix == ".md":
            loc = "en" if "/en/" in str(f) else "fr"
            c.append((f"verifier-actualite {f.name}",
                      f"node --no-warnings scripts/verifier-actualite.mts {f.relative_to(SITE)} --locale {loc} "
                      "| tee /dev/stderr | python3 -c \"import json,sys; d=json.load(sys.stdin); sys.exit(1 if d.get('echecs') else 0)\"",
                      "site"))
    c += [("Build", "npm run build", "site"),
          ("Contrôles SEO du HTML (canonical, hreflang, JSON-LD, FAQ)", "npm run test:html", "site"),
          ("Mentions interdites (site généré)", "bash scripts/check-forbidden.sh site/out", "."),
          ("Liens internes", "node scripts/check-links.mjs site/out", ".")]
    return c


def deployer(log) -> str:
    """Le push fait avec GITHUB_TOKEN ne relance pas ci-deploy.yml : on le lance (workflow_dispatch). Il attend la fin
    de ce passage (même groupe de concurrence guide-assurance-prod), refait tous les contrôles et déploie."""
    r = subprocess.run(["gh", "workflow", "run", "ci-deploy.yml", "--ref", "main", "-f", "dry_run=false"],
                       cwd=ROOT, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f"lancement de ci-deploy.yml impossible : {(r.stderr or r.stdout).strip()[-300:]}")
    log("ci-deploy.yml lancé (workflow_dispatch)")
    return "Déploiement lancé : workflow « CI et déploiement » (ci-deploy.yml), qui attend la fin de ce passage."
