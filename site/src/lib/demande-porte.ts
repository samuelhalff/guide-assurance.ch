/* Adresse d'une porte de la demande d'offres (/demande/<porte>/, /en/request/<porte>/), avec paramètres éventuels.
   Module serveur et client : les pages statiques l'appellent au rendu, les outils dans le navigateur. */
export const DEMANDE_PORTE = {
  fr: (porte: string, q?: Record<string, string>) => `/demande/${porte}/${q ? `?${new URLSearchParams(q)}` : ""}`,
  en: (porte: string, q?: Record<string, string>) => `/en/request/${porte}/${q ? `?${new URLSearchParams(q)}` : ""}`,
};
