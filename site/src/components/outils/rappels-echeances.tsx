"use client";
import { useEffect, useState } from "react";
import { BoutonAgenda } from "@/components/outils/ajouter-agenda";
import { NOM_CONTRAT, evenementContrat, evenementFixe, prochain, type Contrat, type TypeContrat, type TypeFixe } from "@/lib/ics";
import type { Locale } from "@/lib/i18n";

/* Page « Rappels d'échéance » : échéances légales cochées, puis contrats saisis par le visiteur.
   Tout reste dans le navigateur : aucune valeur n'est envoyée, gardée ou mesurée. */
const N = " ";
const d0 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const TYPES: TypeContrat[] = ["auto", "menage", "complementaire", "juridique", "vie", "autre"];
type Ligne = { id: number; type: TypeContrat; nom: string; echeance: string; preavis: string };
const vide = (id: number): Ligne => ({ id, type: "auto", nom: "", echeance: "", preavis: "3" });

export function RappelsEcheances({ aujourdhuiIso, locale = "fr" }: { aujourdhuiIso: string; locale?: Locale }) {
  const en = locale === "en";
  const l = en ? "en" : "fr";
  const [today, setToday] = useState(() => d0(new Date(`${aujourdhuiIso}T00:00`)));
  useEffect(() => setToday(d0(new Date())), []);
  const fmt = (d: Date) =>
    en
      ? d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : d.toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).replace(/ 1 /, " 1er ");

  const [fixes, setFixes] = useState<Record<TypeFixe, boolean>>({ lamal: true, "3a": true, semestre: false });
  const FIXES: { t: TypeFixe; titre: string; texte: string; date: Date }[] = [
    {
      t: "lamal",
      date: prochain(today, 10, 30),
      titre: en ? "Basic health insurance, change on 1 January" : "Assurance de base, changement au 1er janvier",
      texte: en
        ? "Your insurer must receive the cancellation letter by 30 November (art. 7 para. 2 LAMal). Reminders 14 and 7 days before."
        : `L’assureur doit recevoir la lettre de résiliation au plus tard le 30 novembre (art. 7, al. 2, LAMal). Rappels 14 et 7 jours avant.`,
    },
    {
      t: "3a",
      date: prochain(today, 11, 31),
      titre: en ? "Pillar 3a payment for the current tax year" : "Versement 3a pour l’année fiscale en cours",
      texte: en
        ? "The payment must be credited by 31 December, and banks often set an earlier cut-off for transfers. Reminders 21 and 7 days before."
        : "Le versement doit être crédité le 31 décembre au plus tard, et les banques fixent souvent une date limite plus tôt pour les virements. Rappels 21 et 7 jours avant.",
    },
    {
      t: "semestre",
      date: prochain(today, 2, 31),
      titre: en ? "Basic health insurance, change on 1 July" : "Assurance de base, changement au 1er juillet",
      texte: en
        ? "Only with the CHF 300 deductible and free choice of doctor: the letter must arrive by 31 March (art. 7 para. 1 LAMal)."
        : "Seulement avec la franchise de 300 francs et le libre choix du médecin : la lettre doit arriver le 31 mars au plus tard (art. 7, al. 1, LAMal).",
    },
  ];
  const choisis = FIXES.filter((f) => fixes[f.t]);

  const [lignes, setLignes] = useState<Ligne[]>([vide(1)]);
  const [suivant, setSuivant] = useState(2);
  const maj = (id: number, k: keyof Ligne) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setLignes((ls) => ls.map((x) => (x.id === id ? { ...x, [k]: e.target.value } : x)));
  const valides = lignes.filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.echeance));
  const contrats: Contrat[] = valides.map((x) => ({ type: x.type, nom: x.nom, echeance: new Date(`${x.echeance}T00:00`), preavis: +x.preavis }));
  const apercu = contrats.map((c, i) => evenementContrat(c, i, today, l));

  return (
    <div className="ph-sensitive outil outil-rappels" data-ph-mask>
      <section className="form bloc-rappels" aria-labelledby="t-fixes">
        <h2 id="t-fixes">{en ? "Which deadlines come back every year?" : `Quelles échéances reviennent chaque année${N}?`}</h2>
        <p className="aide-bloc">
          {en
            ? "Three dates set by law or by tax rules. Tick the ones that concern you; each one repeats every year in your calendar."
            : "Trois dates fixées par la loi ou par les règles fiscales. Cochez celles qui vous concernent ; chacune revient chaque année dans votre agenda."}
        </p>
        <div className="cases-fixes">
          {FIXES.map((f) => (
            <label key={f.t} className="case">
              <input type="checkbox" checked={fixes[f.t]} onChange={(e) => setFixes((o) => ({ ...o, [f.t]: e.target.checked }))} />
              <span>
                <b>{f.titre}</b>
                <small>
                  {en ? "Next one: " : `Prochaine${N}: `}
                  {fmt(f.date)}. {f.texte}
                </small>
              </span>
            </label>
          ))}
        </div>
        <div className="actions">
          <BoutonAgenda
            locale={locale}
            type="echeances"
            className="bouton"
            fichier={en ? "insurance-deadlines.ics" : "echeances-assurance.ics"}
            disabled={!choisis.length}
            evenements={() => choisis.map((f) => evenementFixe(f.t, today, l))}
          >
            {en ? "Add these dates to my calendar" : "Ajouter ces dates à mon agenda"}
          </BoutonAgenda>
        </div>
      </section>

      <section className="form bloc-rappels" aria-labelledby="t-contrats">
        <h2 id="t-contrats">{en ? "What about your other contracts?" : `Et vos autres contrats${N}?`}</h2>
        <p className="aide-bloc">
          {en
            ? "Car, household, supplementary health insurance: each contract has its own renewal date, shown on the policy. Enter it with the notice period, and the reminder falls on the last day the insurer can receive your cancellation, with alerts one month and one week before."
            : "Auto, ménage, complémentaire santé : chaque contrat a sa propre échéance, inscrite sur la police. Saisissez-la avec le délai de préavis ; le rappel tombe le dernier jour où l’assureur peut recevoir votre résiliation, avec une alerte un mois puis une semaine avant."}
        </p>
        {lignes.map((x, i) => (
          <fieldset key={x.id} className="contrat-ligne">
            <legend>
              <span className="n">{i + 1}</span>
              {en ? "Contract" : "Contrat"}
            </legend>
            <div className="deux">
              <div className="champ">
                <label htmlFor={`type-${x.id}`}>{en ? "Type of insurance" : "Type d’assurance"}</label>
                <select className="saisie" id={`type-${x.id}`} value={x.type} onChange={maj(x.id, "type")}>
                  {TYPES.map((t) => (
                    <option key={t} value={t}>{NOM_CONTRAT[t][l]}</option>
                  ))}
                </select>
              </div>
              <div className="champ">
                <label htmlFor={`nom-${x.id}`}>{en ? "Name in your calendar (optional)" : "Nom dans votre agenda (facultatif)"}</label>
                <input className="saisie" type="text" id={`nom-${x.id}`} maxLength={80} placeholder={en ? "Family car" : "Voiture familiale"} value={x.nom} onChange={maj(x.id, "nom")} />
              </div>
            </div>
            <div className="deux">
              <div className="champ">
                <label htmlFor={`ech-${x.id}`}>{en ? "Renewal date" : "Échéance du contrat"}</label>
                <input className="saisie" type="date" id={`ech-${x.id}`} placeholder={en ? "31.12.2027" : "31.12.2027"} value={x.echeance} onChange={maj(x.id, "echeance")} />
              </div>
              <div className="champ">
                <label htmlFor={`pre-${x.id}`}>{en ? "Notice period" : "Délai de préavis"}</label>
                <select className="saisie" id={`pre-${x.id}`} value={x.preavis} onChange={maj(x.id, "preavis")}>
                  <option value="3">{en ? "3 months (legal rule)" : "3 mois (règle légale)"}</option>
                  <option value="1">{en ? "1 month" : "1 mois"}</option>
                  <option value="2">{en ? "2 months" : "2 mois"}</option>
                  <option value="6">{en ? "6 months" : "6 mois"}</option>
                </select>
              </div>
            </div>
            {apercu[valides.indexOf(x)] ? (
              <p className="note-outil rappel-calcule">
                {en ? "Reminder on " : "Rappel le "}
                <b>{fmt(apercu[valides.indexOf(x)].date)}</b>
                {en ? ", then every year." : ", puis chaque année."}
              </p>
            ) : null}
            {lignes.length > 1 ? (
              <button type="button" className="commande plus retirer" onClick={() => setLignes((ls) => ls.filter((y) => y.id !== x.id))}>
                {en ? "Remove this contract" : "Retirer ce contrat"}
              </button>
            ) : null}
          </fieldset>
        ))}
        <button
          type="button"
          className="commande plus"
          disabled={lignes.length >= 12}
          onClick={() => {
            setLignes((ls) => [...ls, vide(suivant)]);
            setSuivant((n) => n + 1);
          }}
        >
          {en ? "+ Add a contract" : "+ Ajouter un contrat"}
        </button>
        <div className="actions">
          <BoutonAgenda
            locale={locale}
            type="contrats"
            className="bouton"
            fichier={en ? "contract-reminders.ics" : "rappels-contrats.ics"}
            disabled={!contrats.length}
            evenements={() => contrats.map((c, i) => evenementContrat(c, i, today, l))}
          >
            {en ? "Download my reminders (.ics)" : "Télécharger mes rappels (.ics)"}
          </BoutonAgenda>
        </div>
        {!contrats.length ? (
          <p className="note-outil">{en ? "Enter at least one renewal date to create the file." : "Saisissez au moins une échéance pour créer le fichier."}</p>
        ) : null}
      </section>
    </div>
  );
}
