import type { Porte } from "@shared/demande/portes";
import { CtaDemande } from "@/components/demande/cta-demande";
import { estPorteOffre } from "@/lib/demande";

/* Corps HTML d'un guide. Pour une porte d'offre directe (ménage et RC, protection juridique, auto), l'appel au formulaire
   suit le premier paragraphe : l'introduction répond à la question, l'action vient juste après. */
export function CorpsAvecAppel({ html, porte, locale }: { html: string; porte?: Porte; locale: "fr" | "en" }) {
  const fin = html.indexOf("</p>");
  if (!estPorteOffre(porte) || fin === -1) return <div dangerouslySetInnerHTML={{ __html: html }} />;
  const coupe = fin + "</p>".length;
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html.slice(0, coupe) }} />
      <CtaDemande locale={locale} porte={porte} emplacement="guide" />
      <div dangerouslySetInnerHTML={{ __html: html.slice(coupe) }} />
    </>
  );
}
