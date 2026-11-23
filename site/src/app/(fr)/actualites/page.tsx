import { ListeActualites, metadataListe } from "@/components/actualites/liste-actualites";
import { articlesPublies } from "@/lib/actualites";

export const metadata = metadataListe("fr", articlesPublies("fr"));

export default function Page() {
  return <ListeActualites l="fr" articles={articlesPublies("fr")} />;
}
