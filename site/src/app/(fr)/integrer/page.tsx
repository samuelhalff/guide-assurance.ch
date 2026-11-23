import { PageIntegrer, metadataIntegrer } from "@/components/widget/page-integrer";

export const metadata = metadataIntegrer("fr");

export default function Page() {
  return <PageIntegrer l="fr" />;
}
