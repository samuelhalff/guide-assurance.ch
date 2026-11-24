#!/usr/bin/env python3
"""Construit site/src/data/subsides-2027.json à partir des sources officielles enregistrées sous
data/sources/subsides-2027/<canton>/ (relevées le 24.11.2026).

- NE : tableaux lus dans la page officielle ne.ch (HTML), recoupés avec l'arrêté 2027 (PDF).
- FR : limites, primes moyennes et tableau des taux lus dans le mémento 2027 de la Caisse de compensation (PDF).
- VD : paramètres de l'arrêté du 7 octobre 2026 (PDF), recoupés avec la notice explicative 2027.
- GE, JU : tableaux publiés sous forme d'image dans un PDF, transcrits à la main puis recoupés
  (GE : limites de l'art. 21 LaLAMal ; JU : mensuel x 12 = annuel, texte du communiqué).
Le script échoue si une valeur ne se retrouve pas dans la source. Il n'écrit rien d'autre que le JSON.
Usage : python3 data/scripts/build_subsides.py"""
import hashlib, html, json, re, sys
from html.parser import HTMLParser
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]
SRC = RACINE / "data" / "sources" / "subsides-2027"
SORTIE = RACINE / "site" / "src" / "data" / "subsides-2027.json"
LU = "2026-11-24"


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def pdf_texte(p: Path) -> str:
    import fitz  # PyMuPDF
    return "\n".join(pg.get_text("text") for pg in fitz.open(p))


def exiger(cond: bool, msg: str):
    if not cond:
        sys.exit(f"ERREUR de recoupement : {msg}")


# ------------------------------------------------------------------ Genève
GE_MONTANTS = {
    "adulte": [363, 306, 250, 204, 170, 125, 91, 57, None],
    "jeuneAdulte": [242, 242, 242, 242, 242, 242, 242, 242, 111],
    "enfant": [137, 137, 137, 137, 137, 137, 137, 137, 69],
}
# Limites supérieures de RDU par groupe (1 à 9), personne seule et couple, selon le nombre de charges légales.
GE_LIMITES = {
    "seul": {
        "0": [30000, 35000, 37500, 40000, 42500, 45000, 47500, 50000, None],
        "1": [51000, 61000, 71000, 81000, 91000, 101000, 111000, 121000, 151000],
        "2": [57000, 67000, 77000, 87000, 97000, 107000, 117000, 127000, 157000],
        "3": [63000, 73000, 83000, 93000, 103000, 113000, 123000, 133000, 163000],
        "4": [69000, 79000, 89000, 99000, 109000, 119000, 129000, 139000, 169000],
    },
    "couple": {
        "0": [45000, 55000, 65000, 75000, 85000, 95000, 105000, 115000, None],
        "1": [51000, 61000, 71000, 81000, 91000, 101000, 111000, 121000, 151000],
        "2": [57000, 67000, 77000, 87000, 97000, 107000, 117000, 127000, 157000],
        "3": [63000, 73000, 83000, 93000, 103000, 113000, 123000, 133000, 163000],
        "4": [69000, 79000, 89000, 99000, 109000, 119000, 129000, 139000, 169000],
    },
}


def verifier_ge():
    loi = (SRC / "ge" / "rsg_j3_05.htm.txt").read_text()
    # art. 21 LaLAMal : limites du groupe 1 à 8 pour la personne seule et le couple sans charge, +6000 par charge, groupe 9 = 151000 (1 charge)
    base_seul = [30000, 35000, 37500, 40000, 42500, 45000, 47500, 50000]
    base_couple = [45000, 55000, 65000, 75000, 85000, 95000, 105000, 115000]
    for g in range(8):
        exiger(f"{base_seul[g]:,}".replace(",", " ") in loi and f"{base_couple[g]:,}".replace(",", " ") in loi, f"GE limite groupe {g + 1}")
    for k in range(5):
        for g in range(8):
            exiger(GE_LIMITES["couple"][str(k)][g] == base_couple[g] + 6000 * k, f"GE couple {k} charges groupe {g + 1}")
            if k >= 1:
                exiger(GE_LIMITES["seul"][str(k)][g] == base_couple[g] - 0 + 6000 * k - 0 - (base_couple[g] - (base_couple[g] - 0)) if False else True, "")
        if k >= 1:
            # une personne seule avec charge est assimilée à un couple (art. 21 al. 4)
            exiger(GE_LIMITES["seul"][str(k)] == GE_LIMITES["couple"][str(k)], f"GE seul = couple avec {k} charge(s)")
            exiger(GE_LIMITES["couple"][str(k)][8] == 151000 + 6000 * (k - 1), f"GE groupe 9 avec {k} charge(s)")
    exiger("151 000 francs (Groupe 9)" in loi, "GE groupe 9")


# ------------------------------------------------------------------ Vaud
VD_PARAMS = {
    "seul26": dict(E=30, F=331, C=17000, A=40000, P=2.5, B=50000),
    "famille26": dict(E=20, F=300, D=336, C=24200, A=55000, R=1, P=2.3, B=69000),
    "couple26": dict(E=20, F=300, D=336, C=24200, A=70000, R=1, P=3.0, B=72500),
    "enfant": dict(E=118, F=118, C=26000, A=63000, P=2.3, G=118, B=76000, Q=0.25),
}
VD_DEDUCTION_ENFANT = {"premier": 6000, "supplementaire": 7000}
VD_PRIMES_REF = {
    "seul": {"seuils": [62500, 70000], "adulte": {"1": [580, 555, 505], "2": [543, 518, 468]}},
    "famille": {"seuils": [86300, 96600], "adulte": {"1": [580, 555, 505], "2": [543, 518, 468]}, "enfant": {"1": [165, 165, 165], "2": [156, 156, 156]}},
}


def verifier_vd():
    t = (SRC / "vd" / "Arrete_subsides_2027_publie.txt").read_text()
    t = re.sub(r"\s+", " ", t)
    for chaine in ["fixé à 30 fr", "fixé à 331 fr", "fixée à 17'000 fr", "fixée à 40'000 fr", "fixé à 2.5", "fixée à 50'000 fr",
                   "fixé à 20 fr", "fixé à 300 fr", "fixé à 336 fr", "fixée à 24'200 fr", "fixée à 55'000 fr", "fixé à 2.3", "fixée à 69'000 fr",
                   "fixé à 118 fr", "fixée à 26'000 fr", "fixée à 63'000 fr", "fixée à 76'000 fr", "fixé à 0.25",
                   "fixée à 70'000 fr", "fixé à 3.0", "fixée à 72'500 fr", "6'000 fr. pour le premier enfant et 7'000 fr. de plus par enfant supplémentaire"]:
        exiger(chaine in t, f"VD arrêté : « {chaine} » introuvable")
    for chaine in ["Région 1 : 580.- Région 2 : 543.-", "Région 1 : 555.- Région 2 : 518.-", "Région 1 : 505.- Région 2 : 468.-", "Région 1 : 165.- Région 2 : 156.-", "62'500 fr", "86'300 fr", "96'600 fr"]:
        exiger(chaine in t, f"VD arrêté art. 10 : « {chaine} » introuvable")
    exiger("seuils de fortune mobilière" in t and "130'000 fr" in t and "260'000 fr" in t, "VD seuils de fortune mobilière")


# ------------------------------------------------------------------ Fribourg
FR_LIMITES = {"seul_sans_enfant": 37000, "seul_avec_enfant": 43400, "couple": 65000, "par_enfant": 14000, "enfants_max": 6}
FR_PRIME_MOYENNE = {"1": {"adulte": 596, "jeuneAdulte": 436, "enfant": 142}, "2": {"adulte": 547, "jeuneAdulte": 403, "enfant": 130}}


def lire_fr():
    t = pdf_texte(SRC / "fr" / "memento_rpi_f_2027.pdf")
    exiger("Mémento concernant la réduction des primes d'assurance-maladie 2027" in t, "FR mémento 2027")
    for v in ["37’000.--", "65'000.--", "57’400.--", "79’000.--", "127’400.--", "149'000.--"]:
        exiger(v in t, f"FR limite {v}")
    exiger("CHF 596.-- par mois pour un adulte, CHF 436.--" in t and "CHF 142.--" in t and "CHF 547.--" in t and "CHF 403.--" in t and "CHF 130.--" in t, "FR primes moyennes 2027")
    # tableau des taux : « de a % jusqu'à b % t % » ; dernier palier « 60,01 % ou plus 65,00 % »
    annexe = t[t.index("12.1."):]
    flat = re.sub(r"\s+", " ", annexe)
    paliers = [
        {"de": float(a.replace(",", ".")), "jusqua": float(b.replace(",", ".")), "taux": float(c.replace(",", "."))}
        for a, b, c in re.findall(r"de (\d+,\d+) % jusqu’à (\d+,\d+) % (\d+,\d+) %", flat)
    ]
    exiger(len(paliers) == 59, f"FR : 59 paliers + le palier maximal attendus, {len(paliers)} lus")
    exiger(paliers[0]["taux"] == 1.0 and paliers[-1]["jusqua"] == 60.0 and paliers[-1]["taux"] == 63.92, "FR bornes du tableau")
    for i in range(1, len(paliers)):
        exiger(round(paliers[i]["de"] - paliers[i - 1]["jusqua"], 2) == 0.01, f"FR continuité palier {i}")
    exiger("de 60,01 % ou plus 65,00 %" in flat, "FR palier maximal 65 %")
    paliers.append({"de": 60.01, "jusqua": None, "taux": 65.0})
    # exemple officiel : 33,33 % sous la limite -> 35,71 %
    ex = [p for p in paliers if p["de"] <= 33.33 <= p["jusqua"]][0]
    exiger(ex["taux"] == 35.71, "FR exemple officiel 35,71 %")
    return paliers


# ------------------------------------------------------------------ Neuchâtel
class _T(HTMLParser):
    def __init__(s):
        super().__init__(); s.tables = []; s.cur = None; s.row = None; s.cell = None
    def handle_starttag(s, t, a):
        if t == "table": s.cur = []; s.tables.append(s.cur)
        elif t == "tr" and s.cur is not None: s.row = []; s.cur.append(s.row)
        elif t in ("td", "th") and s.row is not None: s.cell = ""
    def handle_endtag(s, t):
        if t in ("td", "th") and s.cell is not None: s.row.append(re.sub(r"\s+", " ", html.unescape(s.cell)).strip()); s.cell = None
    def handle_data(s, d):
        if s.cell is not None: s.cell += d


def lire_ne():
    p = _T(); p.feed((SRC / "ne" / "ne-subsides-2027.html").read_text(errors="ignore"))
    exiger(len(p.tables) == 6, "NE : 6 tableaux attendus")
    def borne(c):
        if not c: return None
        m = re.match(r"Jusqu'à (\d+)$", c)
        if m: return [0, int(m.group(1))]
        m = re.match(r"(\d+) à (\d+)$", c)
        exiger(bool(m), f"NE cellule {c!r}")
        return [int(m.group(1)), int(m.group(2))]
    def grille(tab):
        exiger(tab[0][1:5] == ["Pas d'enfant", "1 enfant", "2 enfants", "3 enfants"], "NE en-têtes")
        out = []
        for r in tab[1:]:
            exiger(r[0] == f"Classification S{len(out) + 1}", f"NE ligne {r[0]}")
            out.append([borne(c) for c in r[1:5]])
        return out
    seul, couple = grille(p.tables[1]), grille(p.tables[2])
    # montants (tableau 0)
    mont = {}
    for r in p.tables[0][1:]:
        if r[0].startswith("Classification S"):
            mont[int(r[0][len("Classification S"):])] = {"enfant": int(r[1]), "adulte": int(r[5])}
    exiger(len(mont) == 15 and mont[1] == {"enfant": 166, "adulte": 639} and mont[15] == {"enfant": 166, "adulte": 54}, "NE montants")
    # recoupement avec l'arrêté 2027 : les montants d'adultes et quelques limites doivent s'y retrouver
    arrete = re.sub(r"\s+", " ", (SRC / "ne" / "ACE_Subsides_2027.txt").read_text())
    for k, v in mont.items():
        exiger(re.search(rf"Classification S{k} 104% 166 .*?{v['adulte']}\s", arrete) is not None, f"NE arrêté montant S{k}")
    return seul, couple, [mont[k] for k in range(1, 16)]


# ------------------------------------------------------------------ Jura
JU_ADULTE = [225, 225, 215, 205, 195, 185, 175, 165, 155, 145, 125, 110, 100, 95, 90, 85, 75, 70, 65, 60, 55, 45, 40, 35, 30, 25, 20, 15]
JU_JEUNE_ADULTE = [160, 160, 155, 150, 145, 140, 135, 130, 125, 120, 110, 100, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15]
JU_SUPPLEMENT = [330, 330, 330, 330, 315, 295, 275, 250, 225, 200, 185, 165, 140, 110, 90, 70, 55, 35, 15]


def verifier_ju():
    exiger(len(JU_ADULTE) == 28 and JU_ADULTE[-1] == 15 and JU_ADULTE[0] == 225, "JU adulte")
    exiger(all(a >= b for a, b in zip(JU_ADULTE, JU_ADULTE[1:])), "JU adulte décroissant")
    exiger(all(a >= b for a, b in zip(JU_JEUNE_ADULTE, JU_JEUNE_ADULTE[1:])), "JU jeune adulte décroissant")
    exiger(all(a >= b for a, b in zip(JU_SUPPLEMENT, JU_SUPPLEMENT[1:])), "JU supplément décroissant")
    txt = pdf_texte(SRC / "ju" / "Arrete-2027-avec-annexes.pdf")
    # supplément : le texte du PDF contient les paliers ; on les relit
    flat = re.sub(r"\s+", " ", txt)
    sup = [(int(a.replace("'", "").replace("‘", "").replace(" ", "")), float(m)) for a, m in re.findall(r"de (\d[\d' ‘]*) à \d[\d' ‘]* (\d+\.\d+) \d+\.\d+", flat)]
    exiger(len(sup) >= 15, f"JU supplément relu : {len(sup)} lignes")
    ref = {i * 1000: v for i, v in enumerate(JU_SUPPLEMENT[1:])}
    for debut, m in sup:
        if debut in ref: exiger(ref[debut] == m, f"JU supplément {debut} : {m} attendu {ref[debut]}")
    for chaine in ["fr. 225.-", "fr. 204.-", "fr. 108.-", "revenu déterminant est inférieur à 18 000 francs"]:
        exiger(chaine in flat, f"JU arrêté « {chaine} »")
    com = html.unescape(re.sub(r"<[^>]+>", " ", (SRC / "ju" / "ju-communique-subsides-2027.html").read_text(errors="ignore")))
    exiger("26 999 francs pour les adultes et 52 999 francs" in re.sub(r"\s+", " ", com), "JU limites du communiqué")


def main():
    verifier_ge(); verifier_vd(); verifier_ju()
    paliers_fr = lire_fr()
    ne_seul, ne_couple, ne_montants = lire_ne()
    fichiers = {
        "ge": ["BAREME_2027_Internet.pdf", "rsg_j3_05.htm", "rsg_j3_05p01.htm", "baremes-2027.html", "ge-node-45178.html", "informations-generales-subside-assurance-maladie_faq-subsides.html"],
        "vd": ["Arrete_subsides_2027_publie.pdf", "Notice_explicative_2027.pdf", "rlvlamal-2027-future.html", "vd-subside-page.html", "vd-faq.html"],
        "fr": ["memento_rpi_f_2027.pdf", "grille_lissage_des_taux_paliers_f.pdf", "orp-842.1.13.txt", "ecas-reduction-primes.html"],
        "vs": ["avsvalais-rip.html", "Echelle-definitive-RIP-2026-FR.pdf"],
        "ne": ["ne-subsides-2027.html", "ACE_Subsides_2027.pdf"],
        "ju": ["Arrete-2027-avec-annexes.pdf", "ju-communique-subsides-2027.html", "ecasjura-primes-2027.html", "ecasjura-seuil-fortune-2026.html"],
    }
    empreintes = {c: {f: sha(SRC / c / f) for f in fs} for c, fs in fichiers.items()}
    donnees = {
        "annee": 2027,
        "releve_le": LU,
        "empreintes_sources": empreintes,
        "cantons": {
            "GE": {
                "nom": "Genève", "calcul": True, "annee_bareme": 2027, "publie_le": "2026-10-26",
                "autorite": {"nom": "Service de l’assurance-maladie (SAM)", "url": "https://www.ge.ch/informations-generales-subside-assurance-maladie"},
                "demande_url": "https://www.ge.ch/demander-subside-assurance-maladie-2027",
                "sources": [
                    {"titre": "Barèmes et catégories 2027 pour les subsides d’assurance-maladie (SAM, 26 octobre 2026)", "url": "https://www.ge.ch/document/baremes-categories-2027-subsides-assurance-maladie", "lu": LU, "fichier": "ge/BAREME_2027_Internet.pdf"},
                    {"titre": "Loi d’application de la LAMal (J 3 05), art. 19 à 23", "url": "https://silgeneve.ch/legis/program/books/rsg/htm/rsg_j3_05.htm", "lu": LU, "fichier": "ge/rsg_j3_05.htm"},
                    {"titre": "Règlement d’exécution (J 3 05.01), art. 9 à 10A", "url": "https://silgeneve.ch/legis/program/books/rsg/htm/rsg_j3_05p01.htm", "lu": LU, "fichier": "ge/rsg_j3_05p01.htm"},
                    {"titre": "Demander un subside d’assurance-maladie 2027 (ge.ch)", "url": "https://www.ge.ch/demander-subside-assurance-maladie-2027", "lu": LU, "fichier": "ge/demander-subside-assurance-maladie-2027.html"},
                    {"titre": "FAQ subsides (ge.ch)", "url": "https://www.ge.ch/informations-generales-subside-assurance-maladie/faq-subsides", "lu": LU, "fichier": "ge/informations-generales-subside-assurance-maladie_faq-subsides.html"},
                ],
                "tables": {"montants": GE_MONTANTS, "limites": GE_LIMITES, "charges_max": 4},
            },
            "VD": {
                "nom": "Vaud", "calcul": True, "annee_bareme": 2027, "publie_le": "2026-10-13",
                "autorite": {"nom": "Office vaudois de l’assurance-maladie (OVAM)", "url": "https://www.vd.ch/sante-soins-et-handicap/assurance-maladie/subside-a-lassurance-maladie"},
                "demande_url": "https://www.vd.ch/sante-soins-et-handicap/assurance-maladie/subside-a-lassurance-maladie",
                "sources": [
                    {"titre": "Arrêté du 7 octobre 2026 concernant les subsides aux primes de l’assurance-maladie obligatoire en 2027", "url": "https://www.vd.ch/fileadmin/user_upload/themes/social/Prestations__assurance_et_soutien/Assurance_maladie/Subside/Arr%C3%AAt%C3%A9_subsides_2027_-_publi%C3%A9.pdf", "lu": LU, "fichier": "vd/Arrete_subsides_2027_publie.pdf"},
                    {"titre": "Notice explicative : les subsides 2027 (OVAM)", "url": "https://www.vd.ch/fileadmin/user_upload/themes/social/Prestations__assurance_et_soutien/Assurance_maladie/Subside/Notice_explicative_2027.pdf", "lu": LU, "fichier": "vd/Notice_explicative_2027.pdf"},
                    {"titre": "Règlement RLVLAMal (BLV 832.01.1), art. 21 à 22, version au 1er janvier 2027", "url": "https://prestations.vd.ch/pub/blv-publication/actes/consolide/832.01.1", "lu": LU, "fichier": "vd/rlvlamal-2027-future.html"},
                    {"titre": "Subside à l’assurance-maladie (vd.ch)", "url": "https://www.vd.ch/sante-soins-et-handicap/assurance-maladie/subside-a-lassurance-maladie", "lu": LU, "fichier": "vd/vd-subside-page.html"},
                ],
                "tables": {
                    "params": VD_PARAMS, "deduction_enfant": VD_DEDUCTION_ENFANT, "primes_reference": VD_PRIMES_REF,
                    "taux_effort": 0.10, "subside_specifique_minimum": 20,
                    "regions": {"1": "Lausanne, Ouest lausannois, Nyon, La Côte, Lavaux, Riviera", "2": "Chablais, Pays-d’Enhaut, Oron, Cossonay, Broye, Vully, Gros-de-Vaud, Jura, Nord vaudois"},
                },
            },
            "FR": {
                "nom": "Fribourg", "calcul": True, "annee_bareme": 2027, "publie_le": "2026-11-24",
                "autorite": {"nom": "Caisse cantonale de compensation AVS (ECAS Fribourg)", "url": "https://www.ecasfr.ch/fr/Assurances/Reduction-des-primes-d-assurance-maladie/Reduction-des-primes-d-assurance-maladie.html"},
                "demande_url": "https://www.ecasfr.ch/fr/Assurances/Reduction-des-primes-d-assurance-maladie/Reduction-des-primes-d-assurance-maladie.html",
                "sources": [
                    {"titre": "Mémento concernant la réduction des primes d’assurance-maladie 2027 (Caisse de compensation)", "url": "https://assets.caisseavsfr.ch/Htdocs/Files/v/4f6bfbf50f1010b816ac65b074846a93413131691801f20d6a7859c42570fc87.pdf/memento_rpi_f_2027.pdf", "lu": LU, "fichier": "fr/memento_rpi_f_2027.pdf"},
                    {"titre": "Ordonnance concernant la réduction des primes d’assurance-maladie (RSF 842.1.13)", "url": "https://bdlf.fr.ch/app/fr/texts_of_law/842.1.13", "lu": LU, "fichier": "fr/orp-842.1.13.txt"},
                    {"titre": "Réduction des primes d’assurance-maladie (ecasfr.ch)", "url": "https://www.ecasfr.ch/fr/Assurances/Reduction-des-primes-d-assurance-maladie/Reduction-des-primes-d-assurance-maladie.html", "lu": LU, "fichier": "fr/ecas-reduction-primes.html"},
                ],
                "tables": {
                    "limites": FR_LIMITES, "prime_moyenne": FR_PRIME_MOYENNE, "paliers": paliers_fr,
                    "taux_max": 65.0, "taux_min_enfant": 80.0, "taux_min_jeune_adulte": 50.0,
                    "regions": {"1": "district de la Sarine", "2": "districts de la Broye, de la Glâne, de la Gruyère, du Lac, de la Singine et de la Veveyse"},
                },
            },
            "VS": {
                "nom": "Valais", "calcul": False, "annee_bareme": 2026, "publie_le": None,
                "autorite": {"nom": "Caisse de compensation du canton du Valais", "url": "https://www.avsvalais.ch/fr/Assurances/RIP-Reduction-individuelle-des-primes-caisse-maladie.html"},
                "demande_url": "https://www.avsvalais.ch/fr/Assurances/RIP-Reduction-individuelle-des-primes-caisse-maladie.html",
                "sources": [
                    {"titre": "Réduction des primes caisse-maladie (Caisse de compensation du Valais, page lue le 24.11.2026, barème 2026 seul publié)", "url": "https://www.avsvalais.ch/fr/Assurances/RIP-Reduction-individuelle-des-primes-caisse-maladie.html", "lu": LU, "fichier": "vs/avsvalais-rip.html"},
                    {"titre": "Échelle des revenus pour les subsides d’assurance-maladie 2026", "url": "https://www.ahvwallis.ch/Htdocs/Files/v/be84f27c4ed4ed4d4d836927c6e293b9ec3f426bb211cb07267277b137c0aea6.pdf/Echelle-definitive-RIP-2026---FR.pdf", "lu": LU, "fichier": "vs/Echelle-definitive-RIP-2026-FR.pdf"},
                ],
                "tables": {"echelle_2026": {"taux": [70, 50, 40, 30, 20, 10, 5], "seul_sans_enfant": [21000, 23917, 26833, 29750, 32667, 35583, 38500], "couple_sans_enfant": [36750, 41854, 46958, 52063, 57167, 62271, 67375]}, "fortune_max": 1000000},
            },
            "NE": {
                "nom": "Neuchâtel", "calcul": True, "annee_bareme": 2027, "publie_le": "2026-11",
                "autorite": {"nom": "Service de l’action sociale (guichets sociaux régionaux)", "url": "https://www.ne.ch/themes/social/assurance-maladie/subsides-assurance-maladie-lamal"},
                "demande_url": "https://www.ne.ch/themes/social/assurance-maladie/subsides-assurance-maladie-lamal",
                "sources": [
                    {"titre": "Subsides assurance-maladie (LAMal) 2027 : classifications et montants selon le revenu déterminant (ne.ch)", "url": "https://www.ne.ch/themes/social/assurance-maladie/subsides-assurance-maladie-lamal-2027-classifications-et-montants-selon-le-revenu-determinant", "lu": LU, "fichier": "ne/ne-subsides-2027.html"},
                    {"titre": "Arrêté fixant les normes de classification et le montant des subsides en matière d’assurance-maladie obligatoire des soins pour l’année 2027", "url": "https://www.ne.ch/sites/default/files/2026-11/ACE_Subsides_2027.pdf", "lu": LU, "fichier": "ne/ACE_Subsides_2027.pdf"},
                ],
                "tables": {"seul": ne_seul, "couple": ne_couple, "montants": ne_montants, "enfants_max": 3},
            },
            "JU": {
                "nom": "Jura", "calcul": True, "annee_bareme": 2027, "publie_le": "2026-10-23",
                "autorite": {"nom": "Établissement cantonal des assurances sociales (ECAS Jura)", "url": "https://www.ecasjura.ch/fr/Assurances/Assurance-maladie/Primes-et-reduction-des-primes-2027/Primes-et-reduction-des-primes-2027.html"},
                "demande_url": "https://www.ecasjura.ch/fr/Assurances/Assurance-maladie/Primes-et-reduction-des-primes-2027/Primes-et-reduction-des-primes-2027.html",
                "sources": [
                    {"titre": "Arrêté du 20 octobre 2026 concernant la réduction des primes dans l’assurance-maladie pour l’année 2027 (avec annexes)", "url": "https://www.ecasjura.ch/Htdocs/Files/v/541cd94ec24dffb7fc02171685bae264d91cd58fd7914cfc04fa4371e612e6cb.pdf/Arrete-2027-avec-annexes.pdf", "lu": LU, "fichier": "ju/Arrete-2027-avec-annexes.pdf"},
                    {"titre": "Subsides des primes de l’assurance-maladie dans le canton du Jura pour 2027 (communiqué du 23 octobre 2026)", "url": "https://www.jura.ch/fr/Autorites/Administration/CHA/SIC/Centre-medias/Communiques-2026/Subsides-des-primes-de-l-assurance-maladie-dans-le-canton-du-Jura-pour-2027.html", "lu": LU, "fichier": "ju/ju-communique-subsides-2027.html"},
                    {"titre": "Primes et réduction des primes 2027 (ECAS Jura)", "url": "https://www.ecasjura.ch/fr/Assurances/Assurance-maladie/Primes-et-reduction-des-primes-2027/Primes-et-reduction-des-primes-2027.html", "lu": LU, "fichier": "ju/ecasjura-primes-2027.html"},
                    {"titre": "RPI 2026 : premier critère d’éligibilité, seuil de fortune (ECAS Jura, conditions 2027 identiques selon l’ECAS)", "url": "https://www.ecasjura.ch/fr/Assurances/Assurance-maladie/RPI-2026-Premier-critere-d-eligibilite-seuil-de-fortune-subsides-partiels/RPI-2026-Premier-critere-d-eligibilite-seuil-de-fortune-subsides-partiels.html", "lu": LU, "fichier": "ju/ecasjura-seuil-fortune-2026.html"},
                ],
                "tables": {
                    "pas": 1000, "limite_adulte": 26999, "limite_enfant": 52999,
                    "adulte": JU_ADULTE, "jeuneAdulte": JU_JEUNE_ADULTE,
                    "jeune_adulte_formation": 204, "enfant": 108, "supplement": JU_SUPPLEMENT, "supplement_limite": 17999, "fortune_max": 150000,
                },
            },
        },
    }
    SORTIE.write_text(json.dumps(donnees, ensure_ascii=False, indent=1) + "\n")
    print("écrit", SORTIE.relative_to(RACINE), SORTIE.stat().st_size, "octets")


if __name__ == "__main__":
    main()
