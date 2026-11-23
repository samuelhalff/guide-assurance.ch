import type { QuestionFaq } from "@/components/site/guide-page";

/* Questions fréquentes de l'accueil (FR et EN), dans le style des sections de l'accueil. Le même tableau alimente le
   nœud FAQPage du JSON-LD de la page (faqLd), donc le texte affiché et le texte balisé sont identiques. */
export function FaqAccueil({ titre, faq }: { titre: string; faq: QuestionFaq[] }) {
  return (
    <section className="questions-frequentes" id="questions" aria-labelledby="questions-titre">
      <div className="wrap">
        <h2 className="titre" id="questions-titre">{titre}</h2>
        {faq.map((f) => (
          <section className="q" key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </section>
        ))}
      </div>
    </section>
  );
}
