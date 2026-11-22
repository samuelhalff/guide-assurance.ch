import type { ReactNode } from "react";

/* Questions fréquentes d'une page outil : une section par question (H2), réponse en un ou plusieurs paragraphes,
   ligne de sources facultative. Le même tableau alimente le JSON-LD FAQPage (faqOutilLd), donc le texte est identique. */
export type FaqOutil = { q: string; a: string[]; src?: ReactNode };

export const faqOutilLd = (faq: FaqOutil[]) => faq.map((f) => ({ q: f.q, a: f.a.join(" ") }));

export function FaqSections({ faq }: { faq: FaqOutil[] }) {
  return (
    <>
      {faq.map((f) => (
        <section key={f.q}>
          <h2>{f.q}</h2>
          {f.a.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {f.src ? <p className="src">{f.src}</p> : null}
        </section>
      ))}
    </>
  );
}
