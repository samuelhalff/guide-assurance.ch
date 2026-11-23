/* Contrôle des pages « Économie d'impôt 3a par commune » sur le calculateur fiscal de l'AFC.
   Pour chaque canton : la commune où l'économie est la plus forte, la plus faible, celle de la médiane et le
   chef-lieu, profil type (personne seule, sans confession, 80 000 CHF imposables, versement 7 258 CHF) : impôt sur
   80 000 et sur 72 742 CHF. Écrit site/tests/fixtures/estv-communes-3a-2026.json (lu par tests/impot3a.test.mts).
     node --no-warnings data/scripts/estv_communes_3a.mts */
import fs from "node:fs";
import * as I from "../../site/src/lib/engines/impot3a.ts";
import * as C from "../../site/src/lib/engines/communes-3a.ts";

const B = "https://swisstaxcalculator.estv.admin.ch/delegate/ost-integration/v1/lg-proxy/operation/c3b67379_ESTV";
const post = async (op: string, body: object) => {
  const r = await fetch(`${B}/${op}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${op} HTTP ${r.status}`);
  return (await r.json()).response;
};

async function lieu(nom: string, bfs: number): Promise<number> {
  for (const q of [nom, nom.replace(/\s*\(.*\)$/, ""), nom.split(/[- ]/)[0]]) {
    const res: { TaxLocationID: number; BfsID: number }[] = await post("API_searchLocation", { Search: q });
    const hit = res.find((x) => x.BfsID === bfs);
    if (hit) return hit.TaxLocationID;
  }
  throw new Error(`commune introuvable à l'AFC : ${nom} (${bfs})`);
}

const P = C.PROFIL_TYPE;
const lignes = [];
for (const canton of I.CANTONS) {
  const t = C.table(canton);
  const triees = [...t.lignes].sort((a, b) => a.economie - b.economie);
  const med = triees[Math.floor((triees.length - 1) / 2)];
  const choix = [t.max, t.min, med, t.lignes.find((l) => l.commune === I.COMMUNE_DEFAUT[canton])!];
  for (const l of [...new Map(choix.map((x) => [x.bfs, x])).values()]) {
    const id = await lieu(l.commune, l.bfs);
    const calc = async (revenu: number) => {
      const r = await post("API_calculateSimpleTaxes", {
        SimKey: null, TaxYear: I.ANNEE_FISCALE, TaxLocationID: id, Relationship: 1, Confession1: 5, Children: [], Confession2: 0,
        TaxableIncomeCanton: revenu, TaxableIncomeFed: revenu, TaxableFortune: 0,
      });
      return { ifd: r.IncomeTaxFed, cantonal: r.IncomeTaxCanton, communal: r.IncomeTaxCity };
    };
    const avant = await calc(P.revenu);
    const apres = await calc(P.revenu - P.versement);
    lignes.push({ canton, commune: l.commune, bfs: l.bfs, revenu: P.revenu, versement: P.versement, avant, apres });
    console.log(canton, l.commune, avant, apres);
  }
}
const out = {
  source: `Calculateur fiscal de l'AFC (swisstaxcalculator.estv.admin.ch), API_calculateSimpleTaxes, année ${I.ANNEE_FISCALE}, personne seule sans confession, revenu imposable ${P.revenu} et ${P.revenu - P.versement} CHF, relevé le ${new Date().toISOString().slice(0, 10)}. Montants arrondis au franc par l'AFC.`,
  lignes,
};
fs.writeFileSync(new URL("../../site/tests/fixtures/estv-communes-3a-2026.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
