#!/usr/bin/env python3
"""Barèmes 2026 pour le calculateur « Économie d'impôt 3a » (GE, VD, VS, FR, NE, Jura bernois, plus l'impôt fédéral direct).

VS, FR, NE et BE (Jura bernois) : barèmes et règles relevés dans les lois et barèmes officiels 2026 de chaque canton
(PDF et listes dans data/sources/impots-2026/, préfixes vs_, fr_, ne_, be_ ; ju_ préparé, Jura pas encore publié), coefficients communaux tirés des listes
officielles cantonales (fichiers *_communes_2026.json extraits de ces listes). Détails et vérifications : docs/decisions.md
§ 8 septvicies et tests/impot3a.test.mts.

Source des barèmes et des coefficients communaux : calculateur fiscal de l'Administration fédérale des
contributions (AFC/ESTV, swisstaxcalculator.estv.admin.ch), année fiscale 2026. Contrôles croisés :
- barème VD 2026 identique au PDF officiel de l'ACI (data/sources/impots-2026/vd_baremes_2026.pdf) ;
- structure du calcul GE (47,5 %, -12 %, 1 % aide à domicile, centimes communaux) : barèmes 2025 de l'AFC-GE ;
- résultats vérifiés sur les calculettes officielles de GE et VD (tests/impot3a.test.mts).

Usage :
  python3 data/scripts/build_impots_2026.py            # relit les instantanés de data/sources/impots-2026/
  python3 data/scripts/build_impots_2026.py --fetch    # recharge les données de l'AFC puis reconstruit

Écrit site/src/data/impots-2026.json (chargé par site/src/lib/engines/impot3a.ts).
"""
import json, os, re, sys, unicodedata, urllib.request, datetime


ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(os.path.dirname(ICI))
SRC = os.path.join(RACINE, "data", "sources", "impots-2026")
SORTIE = os.path.join(RACINE, "site", "src", "data", "impots-2026.json")
API = "https://swisstaxcalculator.estv.admin.ch/delegate/ost-integration/v1/lg-proxy/operation/c3b67379_ESTV/"
ANNEE = 2026


def appel(op, payload):
    req = urllib.request.Request(API + op, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"})
    return json.load(urllib.request.urlopen(req, timeout=120))["response"]


def charger():
    """Instantanés réduits à GE, VD et à la Confédération (les exports complets font plusieurs Mo)."""
    f_bar = os.path.join(SRC, "estv_baremes_revenu_2026.json")
    f_coef = os.path.join(SRC, "estv_coefficients_2026.json")
    if "--fetch" in sys.argv or not (os.path.exists(f_bar) and os.path.exists(f_coef)):
        bar = appel("API_exportManyTaxScales", {"TaxYear": ANNEE, "TaxType": "EINKOMMENSSTEUER", "TaxGroupID": 88})
        bar = [x for x in bar if x["TaxType"] == "EINKOMMENSSTEUER" and (
            (x["Location"]["Canton"] in ("GE", "VD") and x["Target"] == "KANTON") or
            (x["Location"]["Canton"] == "GE" and x["Target"] == "BUND"))]
        coef = appel("API_exportManySimpleRates", {"TaxYear": ANNEE, "TaxGroupID": 99})
        coef = [x for x in coef if x["Location"]["Canton"] in ("GE", "VD")]
        lu = datetime.date.today().isoformat()
        json.dump({"source": API + "API_exportManyTaxScales", "annee": ANNEE, "lu_le": lu, "donnees": bar},
                  open(f_bar, "w"), ensure_ascii=False, indent=1)
        json.dump({"source": API + "API_exportManySimpleRates", "annee": ANNEE, "lu_le": lu, "donnees": coef},
                  open(f_coef, "w"), ensure_ascii=False, indent=1)
    return json.load(open(f_bar)), json.load(open(f_coef))


def table(rows):
    """[montant, impôt au montant, taux marginal au-delà en %] ; même lecture pour toutes les tables AFC."""
    return [[r["Amount"], round(r["Taxes"], 2), round(r["Percent"], 4)] for r in rows]


def main():
    bar, coef = charger()
    d = bar["donnees"]

    def trouve(canton, cible, groupe=None):
        for x in d:
            if x["Location"]["Canton"] == canton and x["Target"] == cible and (groupe is None or x["Group"] == groupe):
                return x
        raise SystemExit(f"barème introuvable : {canton} {cible} {groupe}")

    ifd_seul = trouve("GE", "BUND", "LEDIG_ALLEINE,LEDIG_KONKUBINAT,LEDIG_OHNE_KINDER")
    ifd_fam = trouve("GE", "BUND", "LEDIG_ALLEINE,LEDIG_KONKUBINAT,VERHEIRATET,LEDIG_MIT_KINDER")
    ge = trouve("GE", "KANTON")
    vd = trouve("VD", "KANTON", "VERHEIRATET")
    assert ge["Splitting"] == 2, "GE : splitting attendu à 50 %"

    communes = {"GE": [], "VD": []}
    for x in coef["donnees"]:
        ct = x["Location"]["Canton"]
        nom = x["Location"]["BfsName"].replace(f" ({ct})", "")
        communes[ct].append([nom, x["Location"]["BfsID"], x["IncomeRateCity"]])
        attendu = 147.5 if ct == "GE" else 155
        assert x["IncomeRateCanton"] == attendu, f"coefficient cantonal inattendu pour {nom} : {x['IncomeRateCanton']}"
    for ct in communes:
        communes[ct].sort(key=lambda c: c[0].casefold().replace("é", "e").replace("è", "e"))
    assert len(communes["GE"]) == 45, len(communes["GE"])
    assert len(communes["VD"]) >= 290, len(communes["VD"])

    # Noms officiels de l'OFS (repris de l'AFC par numéro OFS) ; coefficients des listes cantonales.
    noms_ofs = {x["Location"]["BfsID"]: x["Location"]["BfsName"] for x in
                json.load(open(os.path.join(SRC, "estv_coefficients_vs_fr_ne_ju_be_2026.json")))["donnees"]}

    def liste(fichier, champs):
        rows = json.load(open(os.path.join(SRC, fichier)))
        out = [[re.sub(r" \((FR|VS|NE|JU|BE)\)$", "", noms_ofs.get(r["bfs"], r["nom"])), r["bfs"]] + [r[c] for c in champs] for r in rows]
        out.sort(key=lambda c: unicodedata.normalize("NFD", c[0]).casefold())
        return out

    vs_communes = liste("vs_communes_2026.json", ["coefficient", "indexation"])
    fr_communes = liste("fr_communes_2026.json", ["coefficient"])
    ne_communes = liste("ne_communes_2026.json", ["coefficient_pct"])
    be_communes = liste("be_jura_bernois_communes_2026.json", ["coefficient"])
    ju_communes = liste("ju_communes_2026.json", ["coefficient"])
    assert len(vs_communes) == 122 and len(fr_communes) == 119 and len(ne_communes) == 24 and len(be_communes) == 39
    assert len(ju_communes) == 51  # 50 communes jurassiennes + Moutier (canton du Jura depuis le 01.01.2026)

    sortie = {
        "annee": ANNEE,
        "lu_le": bar["lu_le"],
        "source": "AFC (ESTV) et administrations fiscales cantonales, année fiscale 2026 ; contrôles sur les calculettes officielles de GE, VD, VS, FR et NE et sur le calculateur de l’AFC (BE)",
        "ifd": {
            "seul": table(ifd_seul["Table"]),
            "famille": table(ifd_fam["Table"]),
            "rabaisEnfant": 263,  # art. 36, al. 2bis, LIFD, montant 2026 (calculettes GE et VD, AFC)
            "minimum": 25,  # art. 36, al. 3, LIFD : montant d'impôt inférieur à 25 CHF non perçu
        },
        "ge": {
            "bareme": table(ge["Table"]),
            "centimesCantonaux": 47.5,
            "reduction": 12,
            "aideDomicile": 1,
            "communes": communes["GE"],
        },
        "vd": {
            "bareme": table(vd["Table"]),
            "auDela": [300000, 15.5],  # barème ACI 2026 : au-delà de 300 000 CHF, 15,5 % sur les centaines en plus
            "coefficientCantonal": 155,
            "reduction": 5,  # baisse de l'impôt cantonal de base 2026 (loi du contre-projet, 4 % en 2025, 5 % en 2026)
            "plafond": 30,  # impôt cantonal + communal sur le revenu : au plus 30 % du revenu imposable (vd.ch)
            "parts": {"seul": 1.0, "marie": 1.8, "monoparental": 1.3, "enfant": 0.5},
            # Blocage des effets du quotient familial : déduction maximale (CHF) du revenu déterminant le taux,
            # par nombre d'enfants. Montants 2026 relevés sur la calculette officielle de l'ACI le 22.11.2026
            # (les Instructions générales 2026 ne sont pas encore publiées ; 2025 : 25 713, 46 925, 65 682, 82 953, 99 257).
            "blocage": {"marie": [25754, 46978, 65779, 83033, 99334], "monoparental": [45581, 79169, 107269]},
            "communes": communes["VD"],
        },
        "vs": {
            # LF VS art. 32 et 178, formules SCC « Calcul_IC_site_FR.pdf » (2026) et « Calcul_COM_site_FR.pdf » :
            # [dès CHF, taux %, hausse du taux par 100 CHF], appliqué au revenu « désindexé ».
            "cantonal": [[0, 2.0, 0], [5000, 2.0, 0.016], [10000, 2.8, 0.018], [20000, 4.6, 0.014], [30000, 6.0, 0.014],
                         [40000, 7.4, 0.013], [50000, 8.7, 0.015], [60000, 10.2, 0.013], [70000, 11.5, 0.015],
                         [80000, 13.0, 0.003], [90000, 13.3, 0.002], [100000, 13.5, 0.0005], [200000, 14.0, 0]],
            "communal": [[0, 2.0, 0], [5000, 2.0, 0.014], [10000, 2.7, 0.018], [15000, 3.6, 0.016], [20000, 4.4, 0.014],
                         [30000, 5.8, 0.010], [40000, 6.8, 0.007], [50000, 7.5, 0.005], [60000, 8.0, 0.004],
                         [80000, 8.8, 0.002], [90000, 9.0, 0.001], [180000, 9.9, 0.0005], [200000, 10.0, 0]],
            "indice": 173,  # indexation du barème cantonal 2026
            "reduction": {"taux": 35, "min": 680, "max": 4900},  # art. 32 al. 3 let. a et 178 al. 3 let. a (2026)
            "rabaisEnfant": 300,  # art. 31a, impôt cantonal seulement
            "minimum": 10,  # art. 32 al. 6, impôt cantonal minimal
            # art. 33b : taux de la rente viagère correspondante ; diviseur de conversion homme de 65 ans (calculette SCC)
            "capital": {"diviseur": 19.70, "tauxMin": 2, "tauxMax": 4, "reductionFamille": {"taux": 2, "max": 2450}},
            "communes": vs_communes,
        },
        "fr": {
            # LICD art. 37 : [dès CHF, taux %, hausse par 100 CHF] ; couples et parents seuls au taux de la moitié du revenu.
            "bareme": [[0, 0, 0], [5200, 1.0, 0.0259], [17500, 4.1745, 0.0147], [31400, 6.2139, 0.0108],
                       [48300, 8.0352, 0.0069], [63800, 9.1042, 0.0064], [77600, 9.9846, 0.0036],
                       [102100, 10.8662, 0.0032], [128700, 11.7172, 0.0030], [156000, 12.5355, 0.0023],
                       [181000, 13.1097, 0.0015], [207100, 13.5, 0]],
            "coefficientCantonal": 96,  # loi du 13.11.2025 fixant le coefficient 2026 (revenu)
            # LICD art. 39 : taux fixes par tranche de 50 000, 10 000 déduits pour un couple ou un parent seul.
            "capital": {"tranches": [[50000, 1], [50000, 2], [50000, 3], [50000, 4], [1e12, 5]], "deductionFamille": 10000, "seuil": 10000},
            "communes": fr_communes,
        },
        "ne": {
            # LCdir art. 40bquater (2024-2026) : [jusqu'à CHF, taux marginal %], 13,86 % au-delà de 412 000.
            "bareme": [[7700, 0], [10300, 1.98], [15500, 3.96], [20600, 7.92], [30900, 11.484], [41200, 11.781],
                       [51500, 12.177], [61800, 12.672], [72100, 13.167], [82400, 13.662], [92700, 14.058],
                       [103000, 14.355], [113300, 14.652], [123600, 14.949], [133900, 15.246], [144200, 15.345],
                       [154500, 15.444], [164800, 15.543], [175100, 15.741], [185400, 15.939], [195700, 16.038],
                       [206000, 16.038], [309000, 13.365], [412000, 13.6125], [1e12, 13.86]],
            "split": 52,  # couples et parents seuls : taux de 52 % du revenu
            "coefficientCantonal": 124,  # décret RSN 631.00, 2025-2026
            "rabaisEnfant": 200,  # art. 40c, sur l'impôt cantonal
            "capital": {"fraction": 4, "tauxMin": 2.5},  # art. 42
            "communes": ne_communes,
        },
        "be": {
            # LI BE art. 42 : [largeur de tranche, taux %] ; barème famille pour couples et parents seuls.
            "seul": [[3300, 1.95], [3300, 2.9], [9800, 3.6], [16100, 4.15], [26900, 4.45], [26900, 5.0], [26900, 5.6],
                     [26900, 5.75], [26900, 5.9], [26900, 6.05], [37700, 6.15], [86900, 6.3], [152100, 6.4], [1e12, 6.5]],
            "famille": [[3300, 1.55], [3300, 1.65], [9800, 2.85], [16100, 3.65], [26900, 3.8], [26900, 4.3], [26900, 4.85],
                        [26900, 5.2], [41700, 5.7], [54300, 5.85], [54300, 5.95], [54300, 6.2], [141300, 6.4], [1e12, 6.5]],
            "quotiteCantonale": 2.975,
            # art. 44 : barème propre, prestations de moins de 5 300 CHF exonérées.
            "capitalSeul": [[27700, 0.65], [27700, 0.85], [55400, 1.1], [55400, 1.15], [110800, 1.3], [166200, 1.6],
                            [276900, 1.85], [553900, 1.9], [1e12, 2.0]],
            "capitalFamille": [[55400, 0.65], [55400, 0.9], [110800, 1.15], [110800, 1.3], [221500, 1.5], [332300, 1.8],
                               [553900, 1.9], [1e12, 2.0]],
            "capitalSeuil": 5300,
            "communes": be_communes,
        },
        "ju": {
            "source": "Service des contributions du canton du Jura : « Tarifs 2026 » (montants indexés 2026, quotité cantonale "
                      "2,85) et « Quotités d'impôt communales 2026 » (jura.ch, page Personnes physiques), relevés le "
                      "22.11.2026 ; loi d'impôt RSJU 641.11, art. 35 et 37. Contrôlé sur la calculette officielle "
                      "guichet.jura.ch/ExternalServices/TaxCalculator_v2 le 23.11.2026.",
            # LI JU art. 35 al. 2 et 1 : [largeur de tranche, taux unitaire %] ; montants indexés et taux réduits
            # (art. 217i) tels que publiés dans les Tarifs 2026 (taux = « par 100 fr. en plus » / 2,85).
            "seul": [[6900, 0], [7800, 1.667], [14000, 3.149], [21800, 4.029], [42200, 4.909], [112500, 5.558], [1e12, 5.789]],
            # Couples mariés et parents seuls avec enfant à charge (art. 35 al. 1).
            "famille": [[12600, 0], [6200, 0.880], [9300, 2.269], [20300, 3.242], [42200, 4.122], [112500, 4.771],
                        [234500, 5.697], [1e12, 5.789]],
            "quotiteCantonale": 2.85,
            # art. 37 al. 2 : prestations en capital de prévoyance, taux unitaires par tranche de 53 100 CHF (indexée :
            # 56 700 CHF en 2026), multipliés par les quotités.
            "capitalSeul": [[56700, 1.1], [56700, 1.3], [1e12, 1.7]],
            "capitalFamille": [[56700, 0.9], [56700, 1.1], [1e12, 1.3]],
            "communes": ju_communes,
        },
        "plafonds3a": {
            "2026": {"avecLPP": 7258, "sansLPP": 36288},
            "2027": {"avecLPP": 7373, "sansLPP": 36864},
        },
    }
    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    json.dump(sortie, open(SORTIE, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"écrit {SORTIE} : GE {len(communes['GE'])}, VD {len(communes['VD'])}, VS {len(vs_communes)}, FR {len(fr_communes)}, "
          f"NE {len(ne_communes)}, Jura bernois {len(be_communes)}, JU {len(ju_communes)} communes")


if __name__ == "__main__":
    main()
