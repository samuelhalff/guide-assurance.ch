import { ListeActualites, metadataListe } from "@/components/actualites/liste-actualites";
import { articlesPublies } from "@/lib/actualites";

export const metadata = metadataListe("en", articlesPublies("en"));

export default function Page() {
  return <ListeActualites l="en" articles={articlesPublies("en")} />;
}
