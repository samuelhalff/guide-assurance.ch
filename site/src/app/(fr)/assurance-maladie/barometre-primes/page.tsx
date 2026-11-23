import { PageBarometre, metadataBarometre } from "@/components/barometre/page-barometre";

export const metadata = metadataBarometre("fr");

export default function Page() {
  return <PageBarometre l="fr" />;
}
