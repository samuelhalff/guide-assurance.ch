"use client";
import { suivre } from "@/lib/analytics";
import { useEffect, useRef, useState } from "react";
import * as D from "@/lib/engines/delais";
import { outils } from "@/lib/nav";
import type { Locale } from "@/lib/i18n";
import { IconeTelephone, LienRappel } from "@/components/demande/lien-rappel";
import { BoutonAgenda } from "@/components/outils/ajouter-agenda";
import { evenementLettre } from "@/lib/ics";
import { Choix } from "@/components/outils/choix";

/* Lettre de résiliation : interface de mockups/v2/lettre-resiliation.html, délais par src/lib/engines/delais.ts.
   La lettre est rédigée dans le navigateur ; rien n'est envoyé ni gardé. */
const NB = " ";
const fmt0 = new Intl.DateTimeFormat("fr-CH", { day: "numeric", month: "long", year: "numeric" });
const fmt = (d: Date) => fmt0.format(d).replace(/^1 /, "1er ");
const fmtEn0 = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });
const fmtEn = (d: Date) => fmtEn0.format(d);
const d0 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dv = (s: string) => (s ? new Date(`${s}T00:00`) : null);

const MSG_FR: Record<string, string> = {
  debut: "La date de début n’est pas indiquée. Si le contrat a moins de trois ans et que vos conditions générales ne prévoient rien, l’assureur peut refuser cette date ; la lettre demande alors la prochaine échéance possible.",
  preavis: "Un préavis plus court que la règle légale doit figurer dans vos conditions générales.",
  echeance: "Indiquez l’échéance ou la date de début du contrat pour calculer le délai.",
  aucune: "Aucune échéance n’a été trouvée dans les six prochaines années. Les dates saisies sont peut-être erronées.",
};

/* Version anglaise (/en/cancellation-letter/) : l'interface est en anglais, la lettre reste en français
   (elle part chez un assureur de Suisse romande). */
const MSG_EN: Record<string, string> = {
  debut: "The start date is missing. If the contract is less than three years old and your general terms and conditions say nothing, the insurer can refuse this date; the letter then asks for the next possible end date.",
  preavis: "A notice period shorter than the legal rule has to appear in your general terms and conditions.",
  echeance: "Enter the renewal date or the contract start date to calculate the deadline.",
  aucune: "No end date was found in the next six years. The dates you entered may be wrong.",
};
const BASE_EN: Record<string, string> = {
  "Art. 7, al. 2, LAMal.": "Art. 7 para. 2 LAMal.",
  "Art. 7, al. 2, LAMal ; art. 94 et 100 OAMal.": "Art. 7 para. 2 LAMal; art. 94 and 100 OAMal.",
  "Art. 7, al. 1, LAMal.": "Art. 7 para. 1 LAMal.",
  "Art. 35a LCA.": "Art. 35a LCA.",
  "Art. 35a, al. 1, LCA.": "Art. 35a para. 1 LCA.",
  "Vos conditions générales ; art. 35a, al. 2, LCA.": "Your general terms and conditions; art. 35a para. 2 LCA.",
};
const baseEn = (b: string) => BASE_EN[b.replace(/[\u202f\u00a0]/g, " ")] ?? b;

const Vide = ({ children }: { children: React.ReactNode }) => <span className="vide">{children}</span>;
const ou = (s: string, ph: string) => (s ? s : <Vide>{ph}</Vide>);
const Lignes = ({ s }: { s: string }) => (
  <>
    {s.split(/\n+/).map((l, i) => (
      <span key={i}>
        {i > 0 ? <br /> : null}
        {l}
      </span>
    ))}
  </>
);

type Champs = {
  nom: string; rue: string; npa: string; localite: string; numero: string;
  personnes: string; assureur: string; nouvel: string;
  debut: string; echeance: string; preavis: string; produits: string;
};

export function LettreResiliation({ aujourdhuiIso, locale = "fr" }: { aujourdhuiIso: string; locale?: Locale }) {
  const isEn = locale === "en";
  const MSG = isEn ? MSG_EN : MSG_FR;
  const fmtUI = isEn ? fmtEn : fmt;
  const OUTILS = outils(locale);
  const [today, setToday] = useState(() => d0(new Date(`${aujourdhuiIso}T00:00`)));
  useEffect(() => setToday(d0(new Date())), []);
  const [type, setType] = useState<"lamal" | "lca">("lamal");
  const [modele, setModele] = useState<"standard" | "autre">("autre");
  const [annuel, setAnnuel] = useState<"non" | "oui">("non");
  const [v, setV] = useState<Champs>({
    nom: "", rue: "", npa: "", localite: "", numero: "", personnes: "", assureur: "", nouvel: "",
    debut: "", echeance: "", preavis: "3", produits: "",
  });
  const [copie, setCopie] = useState("");
  /* Lettre copiée ou imprimée : l'appel « Être rappelé » apparaît sous les boutons. */
  const [faite, setFaite] = useState(false);
  const lettre = useRef<HTMLElement>(null);
  const set = (k: keyof Champs) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setV((o) => ({ ...o, [k]: e.target.value }));
  const t = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x.trim()])) as Champs;

  const r =
    type === "lamal"
      ? D.lamal(today, modele === "standard")
      : D.lca(today, { echeance: dv(t.echeance), debut: dv(t.debut), preavis: +t.preavis, annuel: annuel === "oui" });

  /* Encadré du délai */
  let delai: React.ReactNode;
  let urgent = false;
  if (!r.fin || !r.dl || !r.poster) {
    delai = MSG[r.incertain[0]] || MSG.aucune;
  } else {
    const j = D.jours(today, r.dl);
    const jp = D.jours(today, r.poster);
    urgent = jp <= 2;
    delai = (
      <>
        {r.manque ? (
          <span className="manque">
            {isEn ? (
              <>The deadline for {fmtUI(r.manque.fin)} has passed (the letter had to be received by {fmtUI(r.manque.dl)}). The calculation moves to the next end date.</>
            ) : (
              <>
                Le délai pour le {fmt(r.manque.fin)} est dépassé (la lettre devait être reçue le {fmt(r.manque.dl)}). Le calcul passe à l’échéance suivante.
              </>
            )}
          </span>
        ) : null}
        {isEn ? (
          <>
            Your letter must be <b>received</b> by <strong>{fmtUI(r.dl)}</strong> at the latest, for the contract to end on {fmtUI(r.fin)}.
            {j <= 14 ? ` ${j} day${j > 1 ? "s" : ""} left.` : ""}
            {jp < 0 ? (
              <> <b>Post it today by registered mail</b>, or hand it to the insurer against an acknowledgement of receipt.</>
            ) : jp === 0 ? (
              <> <b>Post it today.</b></>
            ) : jp <= 14 ? (
              ` Post it by ${fmtUI(r.poster)} at the latest.`
            ) : null}
            <span className="base">
              {baseEn(r.base)}
              {jp <= 14 ? " The suggested posting date leaves one week of margin. This margin is our own recommendation and does not come from the law." : ""}
            </span>
          </>
        ) : (
          <>
            Votre lettre doit être <b>reçue</b> au plus tard le <strong>{fmt(r.dl)}</strong>, pour une fin de contrat le {fmt(r.fin)}.
            {j <= 14 ? ` Encore ${j} jour${j > 1 ? "s" : ""}.` : ""}
            {jp < 0 ? (
              <> <b>Postez-la aujourd’hui en recommandé</b>, ou remettez-la à l’assureur contre accusé de réception.</>
            ) : jp === 0 ? (
              <> <b>Postez-la aujourd’hui.</b></>
            ) : jp <= 14 ? (
              ` Postez-la au plus tard le ${fmt(r.poster)}.`
            ) : null}
            <span className="base">
              {r.base}
              {jp <= 14 ? " Le jour de poste conseillé laisse une semaine de marge. Cette marge est une recommandation de notre part et ne découle pas de la loi." : ""}
            </span>
          </>
        )}
      </>
    );
  }

  /* Points à vérifier */
  const av: string[] = [];
  r.incertain.forEach((k) => {
    if (k !== "echeance" && k !== "aucune") av.push(MSG[k]);
  });
  if (!t.nom || !t.rue || !t.npa || !t.localite) av.push(isEn ? "Complete your address." : "Complétez votre adresse.");
  if (!t.numero) av.push(isEn ? "Add your insured person or policy number, which the insurer uses to find your contract." : "Ajoutez votre numéro d’assuré ou de police, qui permet à l’assureur de retrouver votre contrat.");
  if (!t.assureur) av.push(isEn ? "Add your insurer’s address (on your policy)." : "Ajoutez l’adresse de votre assureur (sur votre police).");

  const dates = r.fin ? fmt(r.fin) : <Vide>date à préciser</Vide>;
  const qui = t.personnes ? (
    <>pour moi-même et pour les personnes suivantes{NB}:</>
  ) : null;
  const lendemain = r.fin ? new Date(r.fin.getFullYear(), r.fin.getMonth(), r.fin.getDate() + 1) : null;
  const prodListe = t.produits && !/^toutes?$/i.test(t.produits);

  async function copier() {
    suivre("lettre_copiee");
    setFaite(true);
    const txt = (lettre.current?.innerText || "").replace(/\n{3,}/g, "\n\n");
    try {
      await navigator.clipboard.writeText(txt);
      setCopie(isEn ? "Text copied." : "Texte copié.");
    } catch {
      setCopie(isEn ? "Copying did not work. Select the text by hand." : "La copie n’a pas fonctionné. Sélectionnez le texte à la main.");
    }
  }

  return (
    <div className="ph-sensitive outil" data-ph-mask>
      <form className="form" autoComplete="on" noValidate onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend><span className="n">{isEn ? "1 of 3" : "1 sur 3"}</span>{isEn ? "What do you want to cancel?" : "Que voulez-vous résilier ?"}</legend>
          <div className="choix-liste">
            <label className="option">
              <input type="radio" name="type" value="lamal" checked={type === "lamal"} onChange={() => setType("lamal")} />
              <span className="repere" aria-hidden="true" />
              <span className="libelle">{isEn ? "Basic health insurance (LAMal)" : "L’assurance de base (LAMal)"}</span>
            </label>
            <label className="option">
              <input type="radio" name="type" value="lca" checked={type === "lca"} onChange={() => setType("lca")} />
              <span className="repere" aria-hidden="true" />
              <span className="libelle">{isEn ? "A supplementary insurance (LCA)" : "Une complémentaire (LCA)"}<small>{isEn ? "Hospital, dental care, complementary medicine…" : "Hospitalisation, soins dentaires, médecines douces…"}</small></span>
            </label>
          </div>
        </fieldset>

        <fieldset hidden={type !== "lamal"}>
          <legend><span className="n">{isEn ? "2 of 3" : "2 sur 3"}</span>{isEn ? "Which contract do you have?" : "Quel est votre contrat ?"}</legend>
          <div className="choix-liste">
            <label className="option">
              <input type="radio" name="modele" value="standard" checked={modele === "standard"} onChange={() => setModele("standard")} />
              <span className="repere" aria-hidden="true" />
              <span className="libelle">{isEn ? "Deductible of CHF 300 and free choice of doctor" : "Franchise de 300 francs et libre choix du médecin"}</span>
            </label>
            <label className="option">
              <input type="radio" name="modele" value="autre" checked={modele === "autre"} onChange={() => setModele("autre")} />
              <span className="repere" aria-hidden="true" />
              <span className="libelle">{isEn ? "Another deductible, or a family doctor, HMO or Telmed model" : "Autre franchise, ou modèle médecin de famille, HMO ou Telmed"}<small>{isEn ? "If you are not sure, keep this choice, which covers the most common case." : "Dans le doute, gardez ce choix, qui correspond au cas le plus courant."}</small></span>
            </label>
          </div>
        </fieldset>

        <fieldset hidden={type !== "lca"}>
          <legend><span className="n">{isEn ? "2 of 3" : "2 sur 3"}</span>{isEn ? "Your contract" : "Votre contrat"}</legend>
          <div className="champ">
            <label htmlFor="debut">{isEn ? "Contract start date" : "Début du contrat"}</label>
            <input className="saisie" type="date" id="debut" name="debut" placeholder={isEn ? "dd.mm.yyyy" : "jj.mm.aaaa"} value={v.debut} onChange={set("debut")} />
            <span className="aide">{isEn ? "The date is on your policy. The law allows cancellation only from the end of the third year, unless your general terms and conditions give you more." : "La date figure sur votre police. La loi ne permet de résilier qu’à partir de la fin de la troisième année, sauf si vos conditions générales prévoient mieux."}</span>
          </div>
          <div className="champ">
            <label htmlFor="echeance">{isEn ? "Annual renewal date" : "Échéance annuelle"}</label>
            <input className="saisie" type="date" id="echeance" name="echeance" placeholder={isEn ? "dd.mm.yyyy" : "jj.mm.aaaa"} value={v.echeance} onChange={set("echeance")} />
            <span className="aide">{isEn ? "It is often 31 December. If you do not know it, leave the field empty." : "C’est souvent le 31 décembre. Si vous ne la connaissez pas, laissez le champ vide."}</span>
          </div>
          <div className="choix-liste" role="radiogroup" aria-labelledby="t-cg">
            <p id="t-cg" className="sous-q">{isEn ? "Do your general terms and conditions allow you to cancel every year?" : "Vos conditions générales permettent-elles de résilier chaque année ?"}</p>
            <label className="option">
              <input type="radio" name="annuel" value="non" checked={annuel === "non"} onChange={() => setAnnuel("non")} />
              <span className="repere" aria-hidden="true" />
              <span className="libelle">{isEn ? "No, or I do not know" : "Non, ou je ne sais pas"}<small>{isEn ? "The legal three-year rule applies." : "On applique la règle légale des trois ans."}</small></span>
            </label>
            <label className="option">
              <input type="radio" name="annuel" value="oui" checked={annuel === "oui"} onChange={() => setAnnuel("oui")} />
              <span className="repere" aria-hidden="true" />
              <span className="libelle">{isEn ? "Yes, every year" : "Oui, chaque année"}</span>
            </label>
          </div>
          <div className="champ" style={{ marginTop: "var(--s3)" }}>
            <label htmlFor="preavis">{isEn ? "Notice period" : "Délai de préavis"}</label>
            <Choix id="preavis" name="preavis" value={v.preavis} onChange={(x) => setV((cur) => ({ ...cur, preavis: x }))} options={[
              { value: "3", label: isEn ? "3 months (legal rule)" : "3 mois (règle légale)" },
              { value: "2", label: isEn ? "2 months (under my contract)" : "2 mois (selon mon contrat)" },
              { value: "1", label: isEn ? "1 month (under my contract)" : "1 mois (selon mon contrat)" },
            ]} />
          </div>
          <div className="champ">
            <label htmlFor="produits">{isEn ? "Supplementary insurance to cancel" : "Complémentaires à résilier"}</label>
            <input className="saisie" type="text" id="produits" name="produits" value={v.produits} onChange={set("produits")} placeholder={isEn ? "Leave empty for all, or in French, e.g. hospitalisation, dentaire" : "Toutes, ou par exemple : hospitalisation, dentaire"} />
          </div>
        </fieldset>

        <div className={`delai alerte${urgent ? " urgent" : ""}`} role="status">
          {delai}
        </div>

        <fieldset className="dernier">
          <legend><span className="n">{isEn ? "3 of 3" : "3 sur 3"}</span>{isEn ? "Your details" : "Vos coordonnées"}</legend>
          <div className="champ"><label htmlFor="nom">{isEn ? "First name and surname" : "Prénom et nom"}</label><input className="saisie" type="text" id="nom" name="name" autoComplete="name" placeholder="Marie Dupont" value={v.nom} onChange={set("nom")} /></div>
          <div className="champ"><label htmlFor="rue">{isEn ? "Street and number" : "Rue et numéro"}</label><input className="saisie" type="text" id="rue" name="street-address" autoComplete="street-address" placeholder={isEn ? "12 Rue du Lac" : "Rue du Lac 12"} value={v.rue} onChange={set("rue")} /></div>
          <div className="deux">
            <div className="champ"><label htmlFor="npa">{isEn ? "Postcode (NPA)" : "NPA"}</label><input className="saisie" type="text" id="npa" name="postal-code" autoComplete="postal-code" placeholder="1201" inputMode="numeric" value={v.npa} onChange={set("npa")} /></div>
            <div className="champ"><label htmlFor="localite">{isEn ? "Town" : "Localité"}</label><input className="saisie" type="text" id="localite" name="address-level2" autoComplete="address-level2" placeholder={isEn ? "Geneva" : "Genève"} value={v.localite} onChange={set("localite")} /></div>
          </div>
          <div className="champ"><label htmlFor="numero">{isEn ? "Insured person or policy number" : "Numéro d’assuré ou de police"}</label><input className="saisie" type="text" id="numero" name="numero" placeholder={isEn ? "Shown on your policy" : "Indiqué sur votre police"} value={v.numero} onChange={set("numero")} /></div>
          <div className="champ">
            <label htmlFor="personnes">{isEn ? "Other people covered by this contract" : "Autres personnes couvertes par ce contrat"}</label>
            <textarea className="saisie" id="personnes" name="personnes" placeholder={isEn ? "One per line, with their date of birth" : "Une par ligne, avec sa date de naissance"} value={v.personnes} onChange={set("personnes")} />
            <span className="aide">{isEn ? "Leave empty if the letter only concerns you." : "Laissez vide si la lettre ne concerne que vous."}</span>
          </div>
          <div className="champ">
            <label htmlFor="assureur">{isEn ? "Your current insurer and its address" : "Votre assureur actuel et son adresse"}</label>
            <textarea className="saisie" id="assureur" name="assureur" placeholder={isEn ? "Insurer name\nPO box (case postale)\nPostcode and town" : "Nom de l’assureur\nCase postale\nNPA Localité"} value={v.assureur} onChange={set("assureur")} />
            <span className="aide">{isEn ? "The address is on your policy or your latest statement." : "L’adresse se trouve sur votre police ou votre dernier décompte."}</span>
          </div>
          <div className="champ" hidden={type !== "lamal"}>
            <label htmlFor="nouvel">{isEn ? "New insurer (optional)" : "Nouvel assureur (facultatif)"}</label>
            <input className="saisie" type="text" id="nouvel" name="nouvel" placeholder={isEn ? "Insurer name" : "Nom de l’assureur"} value={v.nouvel} onChange={set("nouvel")} />
            <span className="aide">{isEn ? "It will confirm your continued cover to the old insurer." : "Il confirmera la suite de votre couverture à l’ancien assureur."}</span>
          </div>
        </fieldset>
      </form>

      <section className="apercu" aria-labelledby="t-apercu">
        <div className="recap" aria-labelledby="t-recap">
          <h2 id="t-recap">{isEn ? "Summary" : "Récapitulatif"}</h2>
          <dl>
            <dt>{isEn ? "Contract" : "Contrat"}</dt><dd>{type === "lamal" ? (isEn ? "Basic health insurance (LAMal)" : "Assurance de base (LAMal)") : isEn ? "Supplementary insurance (LCA)" : "Complémentaire (LCA)"}</dd>
            <dt>{isEn ? "Contract ends" : "Fin du contrat"}</dt><dd>{r.fin ? fmtUI(r.fin) : isEn ? "to be confirmed" : "à préciser"}</dd>
            <dt>{isEn ? "Received by" : "Reçue au plus tard"}</dt><dd>{r.dl ? fmtUI(r.dl) : isEn ? "to be confirmed" : "à préciser"}</dd>
            <dt>{isEn ? "Post before" : "À poster avant"}</dt><dd>{r.poster ? fmtUI(r.poster) : isEn ? "to be confirmed" : "à préciser"}</dd>
            <dt>{isEn ? "Recipient" : "Destinataire"}</dt><dd>{t.assureur ? t.assureur.split("\n")[0] : isEn ? "to be completed" : "à compléter"}</dd>
          </dl>
          {av.length ? (
            <ul className="a-verifier">
              {av.map((x) => <li key={x}>{x}</li>)}
            </ul>
          ) : null}
        </div>
        <h2 id="t-apercu">{isEn ? "Preview of your letter" : "Aperçu de votre lettre"}</h2>
        {isEn ? (
          <p className="note-outil" style={{ margin: "0 0 var(--s3)" }}>
            The letter stays in French because it goes to an insurer in French-speaking Switzerland.
          </p>
        ) : null}
        <article className="lettre" ref={lettre} lang="fr">
          <p className="exp">
            {ou(t.nom, "Prénom Nom")}<br />
            {ou(t.rue, "Rue et numéro")}<br />
            {ou(t.npa, "NPA")} {ou(t.localite, "Localité")}
          </p>
          <p className="dest">{t.assureur ? <Lignes s={t.assureur} /> : <Vide>Assureur<br />Adresse</Vide>}</p>
          <p className="lieu">{ou(t.localite, "Localité")}, le {fmt(today)}</p>
          {type === "lamal" ? (
            <>
              <p className="objet">Recommandé<br />Résiliation de l’assurance obligatoire des soins (LAMal), n°{NB}{ou(t.numero, "d’assuré")}</p>
              <p>Madame, Monsieur,</p>
              {qui ? (
                <>
                  <p>Je résilie l’assurance obligatoire des soins {qui}</p>
                  <p><Lignes s={t.personnes} /></p>
                  <p>pour le {dates}, conformément à l’art. 7 LAMal.</p>
                </>
              ) : (
                <p>Je résilie l’assurance obligatoire des soins pour le {dates}, conformément à l’art. 7 LAMal.</p>
              )}
              {t.nouvel && lendemain ? (
                <p>{t.nouvel} m’assurera dès le {fmt(lendemain)} et vous confirmera la poursuite de la couverture (art. 7, al. 5, LAMal).</p>
              ) : null}
              <p>Mes assurances complémentaires ne sont pas concernées par cette résiliation.</p>
            </>
          ) : (
            <>
              <p className="objet">Recommandé<br />Résiliation d’assurances complémentaires, police n°{NB}{ou(t.numero, "de police")}</p>
              <p>Madame, Monsieur,</p>
              {(() => {
                const objet = prodListe ? `les assurances complémentaires suivantes${NB}: ${t.produits},` : "toutes les assurances complémentaires de cette police";
                const suite = <>pour le {dates} ou, si cette date n’est pas possible, pour la prochaine échéance possible, conformément à l’art. 35a LCA et à vos conditions générales.</>;
                return qui ? (
                  <>
                    <p>Je résilie {objet} {qui}</p>
                    <p><Lignes s={t.personnes} /></p>
                    <p>{suite}</p>
                  </>
                ) : (
                  <p>Je résilie {objet} {suite}</p>
                );
              })()}
            </>
          )}
          <p>Je vous remercie de me confirmer par écrit cette résiliation et sa date d’effet.</p>
          <p>Veuillez agréer, Madame, Monsieur, mes salutations distinguées.</p>
          <p className="sign">{ou(t.nom, "Prénom Nom")}<br /><Vide>Signature</Vide></p>
        </article>
        <div className="actions">
          <button type="button" className="bouton" onClick={() => { suivre("lettre_imprimee"); setFaite(true); window.print(); }}>{isEn ? "Print or save as PDF" : "Imprimer ou enregistrer en PDF"}</button>
          <button type="button" className="bouton second" onClick={copier}>{isEn ? "Copy the text" : "Copier le texte"}</button>
          <span className="copie-ok" role="status">{copie}</span>
        </div>
        {r.dl && r.fin ? (
          <div className="actions actions-agenda">
            <BoutonAgenda
              locale={locale}
              type={type === "lamal" ? "lettre_lamal" : "lettre_lca"}
              fichier={isEn ? "cancellation-deadline.ics" : "delai-resiliation.ics"}
              evenements={() => (r.dl && r.fin ? [evenementLettre(type, r.dl, r.fin, isEn ? "en" : "fr")] : [])}
            >
              {isEn ? `Add ${fmtUI(r.dl)} to my calendar` : `Ajouter le ${fmt(r.dl)} à mon agenda`}
            </BoutonAgenda>
          </div>
        ) : null}
        {faite ? (
          <p className="rappel-liste rappel-lettre">
            {type === "lamal"
              ? isEn
                ? "Supplementary insurance is best cancelled once the new insurer has accepted you, since it can turn an application down. If you would like to talk it through, an adviser can call you back. "
                : "Une complémentaire se résilie de préférence après l’acceptation par le nouvel assureur, car celui-ci peut refuser une demande. Si vous voulez en parler, un conseiller vous rappelle. "
              : isEn
                ? "Looking for new supplementary insurance? An adviser can call you back to talk it through before you send the letter. "
                : "Vous cherchez une nouvelle complémentaire\u202f? Un conseiller peut vous rappeler pour en parler avant que vous envoyiez la lettre. "}
            <LienRappel locale={locale} emplacement="lettre" sujet="sante">
              <IconeTelephone size={16} />
              {isEn ? "Call me back" : "Être rappelé"}
            </LienRappel>
          </p>
        ) : null}
        <div className="apres">
          <h3>{isEn ? "What is left to do" : "Ce qu’il reste à faire"}</h3>
          {type === "lamal" ? (
            <ol>
              <li><b>{isEn ? "Sign up with the new insurer now" : "Inscrivez-vous dès maintenant auprès du nouvel assureur"}</b>{isEn ? ", without waiting for the old one to reply. The new insurer confirms your membership to the old insurer (art. 7 para. 5 LAMal)." : ", sans attendre la réponse de l’ancien. C’est lui qui confirmera votre affiliation à l’ancien assureur (art. 7, al. 5, LAMal)."}</li>
              <li>{isEn ? "Check that your premiums are paid. With arrears, the change is blocked (art. 64a para. 6 LAMal)." : "Vérifiez que vos primes sont payées. Avec des arriérés, le changement est bloqué (art. 64a, al. 6, LAMal)."}</li>
              <li>{isEn ? "Sign the letter and send it by registered mail. Keep the receipt." : "Signez la lettre et envoyez-la en recommandé. Gardez le récépissé."}</li>
              <li>{isEn ? "Track the letter on the Swiss Post website until it is delivered." : "Suivez l’envoi sur le site de La Poste jusqu’à la distribution."}</li>
              <li>{isEn ? "Check the written confirmation from the old insurer. You stay covered without interruption until the change." : "Contrôlez la confirmation écrite de l’ancien assureur. Vous restez couvert sans interruption jusqu’au changement."}</li>
            </ol>
          ) : (
            <ol>
              <li><b>{isEn ? "Wait for written acceptance from the new insurer" : "Attendez l’acceptation écrite du nouvel assureur"}</b>{isEn ? " before you send the letter. For supplementary insurance, it can refuse you or add exclusions based on your health." : " avant d’envoyer la lettre. Pour une complémentaire, il peut refuser ou poser des réserves selon votre état de santé."}</li>
              <li>{isEn ? "Sign the letter and send it by registered mail. Keep the receipt." : "Signez la lettre et envoyez-la en recommandé. Gardez le récépissé."}</li>
              <li>{isEn ? "Track the letter until it is delivered." : "Suivez l’envoi jusqu’à la distribution."}</li>
              <li>{isEn ? "Check the written confirmation. Your basic health insurance is not affected." : "Contrôlez la confirmation écrite. Votre assurance de base n’est pas touchée."}</li>
            </ol>
          )}
        </div>
        <aside className="conseil" aria-label={isEn ? "After the letter" : "Après la lettre"}>
          <p><b>{isEn ? "What next?" : "Et ensuite ?"}</b>{isEn ? " Before you send your letter, it is worth comparing the 2027 premiums. If you are a cross-border worker, the calculator compares LAMal and French health insurance for your whole household." : " Avant d’envoyer votre lettre, il est utile de comparer les primes 2027. Si vous êtes frontalier, le simulateur compare la LAMal et l’assurance française pour tout votre foyer."}</p>
          <a href={OUTILS.simulateur}>{isEn ? "Open the cross-border calculator" : "Ouvrir le simulateur frontalier"}</a>
        </aside>
      </section>
    </div>
  );
}
