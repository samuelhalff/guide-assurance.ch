import "../../globals.css";
import { RacineDemande, metadataDemande } from "@/components/demande/racine-demande";
import { baseViewport } from "@/lib/layout-metadata";

export const metadata = metadataDemande;
export const viewport = baseViewport;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RacineDemande locale="fr">{children}</RacineDemande>;
}
