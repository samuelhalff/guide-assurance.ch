import { PageIntegrer, metadataIntegrer } from "@/components/widget/page-integrer";

export const metadata = metadataIntegrer("en");

export default function Page() {
  return <PageIntegrer l="en" />;
}
