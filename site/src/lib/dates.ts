/* Dates affichées, sans Intl ni toLocaleDateString : l'ICU de Node (build statique) et celle de Safari diffèrent
   (virgule après le jour en anglais, abréviations), d'où des textes différents et l'erreur d'hydratation 418.
   « mardi 1er décembre 2026 » ; « Tuesday 1 December 2026 ». */
type Locale = "fr" | "en";

const MOIS = {
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const JOURS = {
  fr: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

export function dateTexte(d: Date, locale: Locale, o: { jour?: boolean; annee?: boolean } = {}): string {
  const { jour = false, annee = true } = o;
  const j = d.getDate();
  const n = locale === "fr" && j === 1 ? "1er" : String(j);
  const s = `${n} ${MOIS[locale][d.getMonth()]}${annee ? ` ${d.getFullYear()}` : ""}`;
  return jour ? `${JOURS[locale][d.getDay()]} ${s}` : s;
}
