"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as I from "@/lib/engines/impot3a";
import { suivre } from "@/lib/analytics";
import { IconeTelephone, LienRappel } from "@/components/demande/lien-rappel";
import type { Locale } from "@/lib/i18n";
import { Choix } from "@/components/outils/choix";
import { ChoixBoutons, Depliable } from "@/components/controles";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/* Calculateur « Économie d'impôt 3a » : tout se calcule ici, rien n'est envoyé. Le profil peut être partagé
   après le # (jamais transmis au serveur), lu une fois puis retiré de l'adresse. */
const N = " ";
/* Nombres formatés sans Intl : l'ICU du build et celle du navigateur diffèrent pour fr-CH (apostrophe ou espace fine),
   ce qui casse l'hydratation (erreur React 418). FR : espace fine ; EN : virgule. */
const grouper = (x: number, mille: string) => {
  const v = Number.isFinite(x) ? Math.round(x) : 0;
  const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, mille);
  return v < 0 ? `-${s}` : s;
};
const nfFr = { format: (x: number) => grouper(x, "\u202f") };
const nfEn = { format: (x: number) => grouper(x, ",") };

const TXT = {
  fr: {
    canton: "Canton",
    bientot: "Pour Berne, seules les communes du Jura bernois sont couvertes. Moutier fait partie du canton du Jura depuis 2026.",
    commune: "Commune de domicile",
    communeAide: (n: number) => `${n} communes. Le taux communal change l’économie de quelques dizaines de francs.`,
    communeInconnue: (c: string) => `Commune introuvable. Le calcul utilise ${c}.`,
    situation: "Situation",
    etats: { seul: "Personne seule", marie: "Marié ou partenariat enregistré", monoparental: "Parent seul avec enfant(s)" } as Record<I.EtatCivil, string>,
    enfants: "Enfants à charge",
    enfantsVD: "Pour un parent seul, le calcul vaudois couvre 1 à 3 enfants.",
    revenu: "Revenu imposable, sans le versement 3a",
    revenuAide: `Le «${N}revenu imposable${N}» de votre dernier avis de taxation (impôt cantonal), en CHF par an. Pour un couple marié, le revenu du ménage.`,
    ifd: "Revenu imposable fédéral, s’il est différent",
    ifdAide: "Les déductions fédérales diffèrent un peu des cantonales (enfants, assurances). Laissez vide pour reprendre le même montant.",
    lpp: "Caisse de pension (2e pilier)",
    avecLpp: "Oui",
    sansLpp: "Non",
    versement: "Versement 3a",
    versementAide: (p: string, couple: boolean) =>
      couple
        ? `Plafond 2026${N}: ${p} CHF par personne qui travaille. Pour un couple où les deux versent, additionnez les deux versements.`
        : `Plafond 2026${N}: ${p} CHF.`,
    sansLppAide: (p: string) => `Sans caisse de pension${N}: 20${N}% du revenu de l’activité, au plus ${p} CHF en 2026.`,
    economie: "Économie d’impôt estimée en 2026",
    soit: (p: string) => `soit ${p}${N}% du versement`,
    ifdL: "Impôt fédéral direct",
    cantonL: "Impôt cantonal",
    communeL: "Impôt communal",
    avant: "Impôt sur le revenu sans versement",
    apres: "Avec le versement",
    chf: "CHF",
    sansEglise: {
      GE: "Genève ne perçoit pas d’impôt ecclésiastique obligatoire, votre confession ne change donc rien au calcul.",
      VD: "Vaud ne perçoit pas d’impôt ecclésiastique obligatoire, votre confession ne change donc rien au calcul.",
      VS: "Le Valais n’a pas d’impôt ecclésiastique cantonal. Les rares communes qui en perçoivent un ne sont pas prises en compte ici.",
      FR: "À Fribourg, les membres d’une Église reconnue paient en plus un impôt paroissial, qui n’est pas compris ici.",
      NE: "À Neuchâtel, la contribution ecclésiastique est volontaire et n’est pas comprise ici.",
      JU: "Dans le Jura, les membres d’une Église reconnue paient en plus un impôt ecclésiastique, qui n’est pas compris ici.",
      BE: "Dans le Jura bernois, les membres d’une Église reconnue paient en plus un impôt paroissial, qui n’est pas compris ici.",
    } as Record<I.Canton, string>,
    plafondDepasse: (p: string) => `Le versement dépasse le plafond (${p} CHF par personne). Seul le montant autorisé est déductible.`,
    vide: "Indiquez votre revenu imposable et le montant versé pour voir l’économie.",
    retraitTitre: `Et au moment du retrait${N}?`,
    retraitTexte:
      "Le capital 3a est imposé à part, une seule fois, à un taux réduit. Indiquez le capital que vous pensez retirer pour une estimation avec les barèmes 2026.",
    capital: "Capital retiré",
    retraitRes: (m: string, p: string) => `Impôt estimé sur le retrait${N}: ${m} CHF, soit ${p}${N}% du capital.`,
    retraitNote:
      "Ce montant est une estimation. Les barèmes de l’année du retrait s’appliqueront, et les capitaux de prévoyance retirés la même année (3a, 2e pilier, conjoint) s’additionnent. Échelonner les retraits sur plusieurs années réduit souvent l’impôt.",
    retraitVS: "En Valais, le taux dépend aussi de l’âge et du sexe. Le calcul suppose un homme de 65 ans, ce qui ne change rien en dessous d’environ 100 000 CHF.",
    rappelQ: `Une question sur votre 3e pilier${N}?`,
    rappel: "Être rappelé",
    lien: "Copier le lien de ce calcul",
    lienOk: "Lien copié.",
    limites:
      "Estimation avec les barèmes 2026 de l’AFC et des cantons, vérifiée sur les calculettes officielles de Genève, de Vaud, du Valais, de Fribourg, de Neuchâtel et du Jura, et sur le calculateur de l’AFC vers lequel Berne renvoie. Elle laisse de côté l’impôt sur la fortune, l’impôt ecclésiastique, la taxe personnelle, les parts privilégiées genevoises (sans effet si vous travaillez dans votre commune) et la garde alternée à Genève.",
  },
  en: {
    canton: "Canton",
    bientot: "For Bern, only the municipalities of the Bernese Jura are covered. Moutier has been part of the canton of Jura since 2026.",
    commune: "Municipality of residence",
    communeAide: (n: number) => `${n} municipalities. The municipal rate changes the saving by a few tens of francs.`,
    communeInconnue: (c: string) => `Municipality not found. The calculation uses ${c}.`,
    situation: "Situation",
    etats: { seul: "Single", marie: "Married or registered partnership", monoparental: "Single parent with child(ren)" } as Record<I.EtatCivil, string>,
    enfants: "Dependent children",
    enfantsVD: "For a single parent, the Vaud calculation covers 1 to 3 children.",
    revenu: "Taxable income, before the 3a payment",
    revenuAide: "The “taxable income” on your last tax assessment (cantonal tax), in CHF per year. For a married couple, the household income.",
    ifd: "Federal taxable income, if different",
    ifdAide: "Federal deductions differ slightly from cantonal ones (children, insurance). Leave empty to use the same amount.",
    lpp: "Pension fund (2nd pillar)",
    avecLpp: "Yes",
    sansLpp: "No",
    versement: "3a payment",
    versementAide: (p: string, couple: boolean) =>
      couple ? `2026 cap: CHF ${p} per working person. For a couple where both pay in, add up both payments.` : `2026 cap: CHF ${p}.`,
    sansLppAide: (p: string) => `Without a pension fund: 20% of earned income, up to CHF ${p} in 2026.`,
    economie: "Estimated 2026 tax saving",
    soit: (p: string) => `that is ${p}% of the payment`,
    ifdL: "Direct federal tax",
    cantonL: "Cantonal tax",
    communeL: "Municipal tax",
    avant: "Income tax without the payment",
    apres: "With the payment",
    chf: "CHF",
    sansEglise: {
      GE: "Geneva levies no compulsory church tax, so your religion does not change the calculation.",
      VD: "Vaud levies no compulsory church tax, so your religion does not change the calculation.",
      VS: "Valais has no cantonal church tax. The few municipalities that levy one are not included here.",
      FR: "In Fribourg, members of a recognised church also pay a parish tax, which is not included here.",
      NE: "In Neuchâtel, the church contribution is voluntary and not included here.",
      JU: "In Jura, members of a recognised church also pay a church tax, which is not included here.",
      BE: "In the Bernese Jura, members of a recognised church also pay a parish tax, which is not included here.",
    } as Record<I.Canton, string>,
    plafondDepasse: (p: string) => `The payment is above the cap (CHF ${p} per person). Only the allowed amount is deductible.`,
    vide: "Enter your taxable income and the amount you pay in to see the saving.",
    retraitTitre: "And when you withdraw?",
    retraitTexte:
      "3a capital is taxed separately, once, at a reduced rate. Enter the capital you expect to withdraw for an estimate with the 2026 tax scales.",
    capital: "Capital withdrawn",
    retraitRes: (m: string, p: string) => `Estimated tax on the withdrawal: CHF ${m}, that is ${p}% of the capital.`,
    retraitNote:
      "This amount is an estimate. The tax scales of the year of withdrawal will apply, and pension capital withdrawn in the same year (3a, 2nd pillar, spouse) is added together. Spreading withdrawals over several years often reduces the tax.",
    retraitVS: "In Valais, the rate also depends on age and sex. The estimate assumes a 65-year-old man, which makes no difference below about CHF 100,000.",
    rappelQ: "A question about your pillar 3a?",
    rappel: "Request a call-back",
    lien: "Copy the link to this calculation",
    lienOk: "Link copied.",
    limites:
      "Estimate with the 2026 tax scales of the Federal Tax Administration and the cantons, checked against the official calculators of Geneva, Vaud, Valais, Fribourg, Neuchâtel and Jura, and against the federal calculator that Bern links to. It leaves out wealth tax, church tax, personal tax, Geneva’s “parts privilégiées” (no effect if you work in your municipality of residence) and shared custody in Geneva.",
  },
};

const num = (s: string) => {
  const v = Number(s.replace(/[’'\s ]/g, "").replace(",", "."));
  return Number.isFinite(v) && v >= 0 ? v : NaN;
};

export function EconomieImpot3a({ locale = "fr" }: { locale?: Locale }) {
  const t = TXT[locale];
  const nf = locale === "fr" ? nfFr : nfEn;
  const pct = (x: number) => (locale === "fr" ? (x * 100).toFixed(1).replace(".", ",") : (x * 100).toFixed(1));
  const P26 = I.PLAFONDS["2026"];

  const [canton, setCanton] = useState<I.Canton>("GE");
  const [commune, setCommune] = useState(I.COMMUNE_DEFAUT.GE);
  const [etat, setEtat] = useState<I.EtatCivil>("seul");
  const [enfants, setEnfants] = useState(0);
  const [revenu, setRevenu] = useState("");
  const [revenuIfd, setRevenuIfd] = useState("");
  const [lpp, setLpp] = useState(true);
  /* Vide au départ, comme le revenu : le plafond sert d'exemple (placeholder) et le résultat attend la saisie. */
  const [versement, setVersement] = useState("");
  const [capital, setCapital] = useState("");
  const [copie, setCopie] = useState(false);
  const mesure = useRef(false);

  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    if (!h.get("r")) return;
    const c = I.CANTONS.find((x) => x === h.get("c")) ?? "GE";
    setCanton(c);
    setCommune(h.get("m") || I.COMMUNE_DEFAUT[c]);
    const e = (["seul", "marie", "monoparental"] as const).find((x) => x === h.get("e")) ?? "seul";
    setEtat(e);
    setEnfants(Math.max(0, Math.min(I.maxEnfants(c, e), Number(h.get("k")) || 0)));
    setRevenu(h.get("r") ?? "");
    setRevenuIfd(h.get("ri") ?? "");
    setLpp(h.get("l") !== "0");
    if (h.get("v")) setVersement(h.get("v")!);
    setCapital(h.get("k3") ?? "");
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  const maxK = I.maxEnfants(canton, etat);
  const k = Math.min(enfants, maxK);
  const communeTrouvee = I.trouverCommune(canton, commune);
  const nomCommune = communeTrouvee?.nom ?? I.COMMUNE_DEFAUT[canton];
  const couple = etat === "marie";
  const plafondPers = lpp ? P26.avecLPP : P26.sansLPP;
  const plafond = plafondPers * (couple ? 2 : 1);

  const r = num(revenu);
  const ri = revenuIfd.trim() ? num(revenuIfd) : undefined;
  const v = num(versement);
  const res = useMemo(() => {
    if (!Number.isFinite(r) || r <= 0 || !Number.isFinite(v)) return null;
    const p: I.Profil = { canton, commune: nomCommune, etat, enfants: k, revenu: r, ...(ri !== undefined && Number.isFinite(ri) ? { revenuIfd: ri } : {}) };
    return I.economie3a(p, Math.min(v, plafond));
  }, [canton, nomCommune, etat, k, r, ri, v, plafond]);

  useEffect(() => {
    if (res && !mesure.current) {
      mesure.current = true;
      suivre("impot3a_utilise");
    }
  }, [res]);

  const cap = num(capital);
  const retrait = Number.isFinite(cap) && cap > 0 ? I.impotCapital(canton, nomCommune, etat, k, cap) : null;

  function changerCanton(c: I.Canton) {
    setCanton(c);
    setCommune(I.COMMUNE_DEFAUT[c]);
  }
  function changerEtat(e: I.EtatCivil) {
    setEtat(e);
    if (e === "monoparental" && enfants === 0) setEnfants(1);
    /* versement laissé au plafond : il suit le nombre de personnes qui versent */
    const avant = (etat === "marie" ? 2 : 1) * plafondPers;
    if (num(versement) === avant || num(versement) === plafondPers) setVersement(String(plafondPers * (e === "marie" ? 2 : 1)));
  }
  function copierLien() {
    const h = new URLSearchParams({ c: canton, m: nomCommune, e: etat, k: String(k), r: revenu, l: lpp ? "1" : "0", v: versement });
    if (revenuIfd.trim()) h.set("ri", revenuIfd);
    if (capital.trim()) h.set("k3", capital);
    const url = `${window.location.origin}${window.location.pathname}#${h.toString()}`;
    navigator.clipboard?.writeText(url).then(() => setCopie(true), () => setCopie(false));
  }

  return (
    <div className="ph-sensitive outil outil-impot3a" id="outil" data-ph-mask>
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <Card><CardContent>
        <fieldset>
          <legend>{t.canton}</legend>
          <ChoixBoutons
            variante="pastille"
            className="pastilles"
            name="i3-canton"
            value={canton}
            onChange={changerCanton}
            options={I.CANTONS.map((c) => ({ value: c, label: I.NOM_CANTON[locale][c] }))}
          />
          <p className="note-outil">{t.bientot}</p>
        </fieldset>

        <div className="champ">
          <label htmlFor="i3-commune">{t.commune}</label>
          <Input
            id="i3-commune"
            list="i3-communes"
            placeholder={I.COMMUNE_DEFAUT[canton]}
            autoComplete="off"
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
          <datalist id="i3-communes">
            {I.COMMUNES[canton].map((c) => (
              <option key={c.bfs} value={c.nom} />
            ))}
          </datalist>
          <span className="aide">{communeTrouvee || !commune.trim() ? t.communeAide(I.COMMUNES[canton].length) : t.communeInconnue(nomCommune)}</span>
        </div>

        <div className="ligne">
          <div className="champ">
            <label htmlFor="i3-etat">{t.situation}</label>
            <Choix id="i3-etat" value={etat} onChange={changerEtat} options={(["seul", "marie", "monoparental"] as const).map((e) => ({ value: e as I.EtatCivil, label: t.etats[e] }))} />
          </div>
          {etat !== "seul" ? (
            <div className="champ">
              <label htmlFor="i3-enfants">{t.enfants}</label>
              <Choix id="i3-enfants" value={k} onChange={setEnfants} options={Array.from({ length: maxK + 1 }, (_, i) => i).filter((i) => etat !== "monoparental" || i > 0).map((i) => ({ value: i, label: String(i) }))} />
            </div>
          ) : null}
        </div>
        {etat === "monoparental" && canton === "VD" ? <p className="note-outil">{t.enfantsVD}</p> : null}

        <div className="champ">
          <label htmlFor="i3-revenu">{t.revenu}</label>
          <Input id="i3-revenu" inputMode="numeric" placeholder="85000" value={revenu} onChange={(e) => setRevenu(e.target.value)} />
          <span className="aide">{t.revenuAide}</span>
        </div>
        <Depliable className="aide-revenus" titre={t.ifd}>
          <div className="champ">
            <label htmlFor="i3-ifd" className="visually-hidden">{t.ifd}</label>
            <Input id="i3-ifd" inputMode="numeric" placeholder="87000" value={revenuIfd} onChange={(e) => setRevenuIfd(e.target.value)} />
            <span className="aide">{t.ifdAide}</span>
          </div>
        </Depliable>

        <fieldset>
          <legend>{t.lpp}</legend>
          <ChoixBoutons
            variante="pastille"
            className="pastilles pastilles-2"
            name="i3-lpp"
            value={lpp ? "avec" : "sans"}
            onChange={(v) => {
              if (v === "avec") { setLpp(true); if (versement.trim()) setVersement(String(P26.avecLPP * (couple ? 2 : 1))); }
              else setLpp(false);
            }}
            options={[
              { value: "avec" as string, label: t.avecLpp },
              { value: "sans" as string, label: t.sansLpp },
            ]}
          />
        </fieldset>

        <div className="champ dernier">
          <label htmlFor="i3-versement">{t.versement}</label>
          <Input id="i3-versement" inputMode="numeric" placeholder={String(plafond)} value={versement} onChange={(e) => setVersement(e.target.value)} />
          <span className="aide">{lpp ? t.versementAide(nf.format(P26.avecLPP), couple) : t.sansLppAide(nf.format(P26.sansLPP))}</span>
        </div>
        </CardContent></Card>
      </form>

      <div className="apercu resultat-3a">
        {/* Seule ligne annoncée aux lecteurs d'écran : la phrase d'attente, puis le montant de l'économie (même nœud, toujours présent). */}
        <div aria-live="polite">
          {res ? (
            <Card className="economie">
              <CardContent>
                <h2>{t.economie}</h2>
                <p className="montant">
                  {nf.format(res.economie.total)} <small>{t.chf}</small>
                </p>
                <p className="soit">{t.soit(pct(res.part))}</p>
                {Number.isFinite(v) && v > plafond ? <Alert variant="attention" className="provisoire">{t.plafondDepasse(nf.format(plafondPers))}</Alert> : null}
              </CardContent>
            </Card>
          ) : (
            <p className="attente">{t.vide}</p>
          )}
        </div>
        {res ? (
          <>
            <Table variant="chiffres" className="detail-3a">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col"><span className="visually-hidden">{t.economie}</span></TableHead>
                  <TableHead scope="col">{t.avant}</TableHead>
                  <TableHead scope="col">{t.apres}</TableHead>
                  <TableHead scope="col">{locale === "fr" ? "Économie" : "Saving"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {([["ifd", t.ifdL], ["cantonal", t.cantonL], ["communal", t.communeL]] as const).map(([key, label]) => (
                  <TableRow key={key}>
                    <TableHead scope="row">{label}</TableHead>
                    <TableCell>{nf.format(res.avant[key])}</TableCell>
                    <TableCell>{nf.format(res.apres[key])}</TableCell>
                    <TableCell><b>{nf.format(res.economie[key])}</b></TableCell>
                  </TableRow>
                ))}
                <TableRow className="total">
                  <TableHead scope="row">Total</TableHead>
                  <TableCell>{nf.format(res.avant.total)}</TableCell>
                  <TableCell>{nf.format(res.apres.total)}</TableCell>
                  <TableCell><b>{nf.format(res.economie.total)}</b></TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p className="note-outil">{t.sansEglise[canton]}</p>

            <p className="rappel-liste">
              {t.rappelQ}{" "}
              <LienRappel locale={locale} emplacement="outil3a" sujet="prevoyance">
                <IconeTelephone size={16} />
                {t.rappel}
              </LienRappel>
            </p>
          </>
        ) : null}

        <Card size="sm">
        <CardContent>
        <Depliable className="retrait-3a" titre={t.retraitTitre}>
          <p className="note-outil">{t.retraitTexte}</p>
          <div className="champ champ-court">
            <label htmlFor="i3-capital">{t.capital}</label>
            <Input id="i3-capital" inputMode="numeric" placeholder="100000" value={capital} onChange={(e) => setCapital(e.target.value)} />
          </div>
          {retrait ? <p className="retrait-res"><b>{t.retraitRes(nf.format(retrait.total), pct(retrait.taux))}</b></p> : null}
          <p className="note-outil">{t.retraitNote}</p>
          {canton === "VS" ? <p className="note-outil">{t.retraitVS}</p> : null}
        </Depliable>
        </CardContent>
        </Card>

        <div className="integrite">
          <p>{t.limites}</p>
          {res ? (
            <p>
              <button type="button" className="lien-profil" onClick={copierLien}>{t.lien}</button>
              {copie ? <span className="copie-ok"> {t.lienOk}</span> : null}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
