import { PageBarometre, metadataBarometre } from "@/components/barometre/page-barometre";

export const metadata = metadataBarometre("en");

export default function Page() {
  return <PageBarometre l="en" />;
}
