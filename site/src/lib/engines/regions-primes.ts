/* Primes LAMal 2027 par région de prime : statistiques des offres pour quelques profils types, calculées au build
   à partir des mêmes fichiers que le comparateur (public/data/primes-2027/<CANTON>.json, primes approuvées par
   l'OFSP relevées sur priminfo.admin.ch) et de la liste officielle des régions (src/data/regions-primes-2027.json,
   OFSP praemienregionen-2027.xlsx : communes, population, prime moyenne estimée par l'OFSP).
   Une observation = une offre (un produit d'un assureur : modèle standard ou alternatif) proposée dans la région
   pour le profil. Statistiques non pondérées par le nombre d'assurés. Aucun assureur n'est nommé. */
import * as P from "./primes.ts";
import { csv, resume, type Resume } from "./statistiques.ts";
import R from "../../data/regions-primes-2027.json" with { type: "json" };
import GE from "../../../public/data/primes-2027/GE.json" with { type: "json" };
import VD from "../../../public/data/primes-2027/VD.json" with { type: "json" };
import VS from "../../../public/data/primes-2027/VS.json" with { type: "json" };
import FR from "../../../public/data/primes-2027/FR.json" with { type: "json" };
import NE from "../../../public/data/primes-2027/NE.json" with { type: "json" };
import JU from "../../../public/data/primes-2027/JU.json" with { type: "json" };
import BE from "../../../public/data/primes-2027/BE.json" with { type: "json" };
import NPA from "../../../public/data/primes-2027/npa.json" with { type: "json" };

export const DONNEES_CANTONS = { GE, VD, VS, FR, NE, JU, BE } as unknown as Record<P.Canton, P.DonneesCanton>;
export const SOURCE_PRIMES: string = (GE as { source: string }).source;
export const SOURCE_REGIONS: { source: string; url: string } = { source: R.source, url: R.url };

export type ProfilType = { id: string; classe: P.Classe; franchise: number; accident: boolean; naissance: number };
/* Profils types : adulte (26 ans et plus) avec la franchise la plus basse et la plus haute, avec ou sans couverture
   accident (personne salariée couverte par la LAA de son employeur), jeune adulte et enfant. Année de naissance
   utilisée seulement pour le lien prérempli vers le comparateur. */
export const PROFILS: ProfilType[] = [
  { id: "a300a", classe: "adulte", franchise: 300, accident: true, naissance: 1990 },
  { id: "a300s", classe: "adulte", franchise: 300, accident: false, naissance: 1990 },
  { id: "a2500s", classe: "adulte", franchise: 2500, accident: false, naissance: 1990 },
  { id: "j300a", classe: "jeune", franchise: 300, accident: true, naissance: 2005 },
  { id: "e0a", classe: "enfant", franchise: 0, accident: true, naissance: 2015 },
];

export type StatProfil = ProfilType & Resume & { ecartPct: number; ecartAnnuel: number };
export type Region = {
  canton: P.Canton;
  region: number;
  cle: string; // "vd-1"
  chefLieu: string;
  communes: [string, number][];
  communesRegionEntiere: number;
  population: number;
  primeMoyenneOfsp: { enfant: number; jeune: number; adulte: number };
  npa: string; // NPA du chef-lieu, pour le lien prérempli
  profils: StatProfil[];
};

const r2 = (x: number) => Math.round(x * 100) / 100;

function npaChefLieu(canton: P.Canton, region: number, commune: string): string {
  const idx = NPA as unknown as P.IndexNpa;
  const ok = Object.entries(idx).filter(([, v]) => v.length === 1 && v[0][0] === canton && v[0][1] === region);
  const exact = ok.find(([, v]) => v[0][2] === commune);
  return (exact ?? ok.find(([, v]) => v[0][2].split(" · ").includes(commune)) ?? ok[0])[0];
}

function statProfil(d: P.DonneesCanton, region: number, p: ProfilType): StatProfil {
  const r = P.offres(d, { region, classe: p.classe, franchise: p.franchise, accident: p.accident });
  const s = resume(r.offres.map((o) => o.mensuel));
  return { ...p, ...s, mediane: r2(s.mediane), q1: r2(s.q1), q3: r2(s.q3), moyenne: r2(s.moyenne), ecartPct: ((s.max - s.min) / s.min) * 100, ecartAnnuel: r2((s.max - s.min) * 12) };
}

export const REGIONS: Region[] = R.regions.map((x) => {
  const canton = x.canton as P.Canton;
  const d = DONNEES_CANTONS[canton];
  const chefLieu = d.regions[String(x.region)].commune;
  return {
    canton,
    region: x.region,
    cle: `${canton.toLowerCase()}-${x.region}`,
    chefLieu,
    communes: x.communes as [string, number][],
    communesRegionEntiere: x.communes_region_entiere,
    population: x.population_2024,
    primeMoyenneOfsp: x.prime_moyenne_ofsp,
    npa: npaChefLieu(canton, x.region, chefLieu),
    profils: PROFILS.map((p) => statProfil(d, x.region, p)),
  };
});

export const regionsDuCanton = (c: P.Canton) => REGIONS.filter((r) => r.canton === c);

/* Lien prérempli vers le comparateur : #npa=…&p=année.franchise.accident (format du comparateur). */
export const hashComparateur = (r: Region, p: ProfilType) => `#npa=${r.npa}&p=${p.naissance}.${p.franchise}.${p.accident ? 1 : 0}`;

/* CSV : une ligne par région et par profil type (pages « par région », dépôt de données ouvertes). */
export function csvRegions(): string {
  return csv(
    ["annee", "canton", "region", "chef_lieu", "communes_listees", "population_2024", "classe_age", "franchise_chf", "accident", "offres", "prime_min_chf", "prime_q1_chf", "prime_mediane_chf", "prime_q3_chf", "prime_max_chf", "prime_moyenne_offres_chf", "prime_moyenne_estimee_ofsp_chf"],
    REGIONS.flatMap((r) =>
      r.profils.map((p) => [
        P.ANNEE, r.canton, r.region, r.chefLieu, r.communes.length, r.population, p.classe, p.franchise, p.accident ? "avec" : "sans", p.n,
        p.min, p.q1, p.mediane, p.q3, p.max, p.moyenne, r.primeMoyenneOfsp[p.classe],
      ]),
    ),
  );
}
