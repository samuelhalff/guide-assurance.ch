import type { Metadata } from "next";
import { INDEXABLE, SITE_NAME, abs } from "@/lib/site";
import { autreLangue } from "@/lib/content/pages";

/* Métadonnées d'une page : titre exact, description, canonique, hreflang et Open Graph.
   Page française : fr-CH, en si la page existe en anglais, x-default sur la française.
   Page anglaise : en, fr-CH et x-default sur la page française équivalente.
   L'équivalent est trouvé tout seul (autreLangue) ; enPath / frPath le forcent. */
export function pageMetadata({
  title,
  description,
  path,
  enPath,
  frPath,
  locale = "fr",
}: {
  title: string;
  description: string;
  path: string;
  enPath?: string;
  frPath?: string;
  locale?: "fr" | "en";
}): Metadata {
  const fr = locale === "fr" ? path : (frPath ?? autreLangue(path, "en"));
  const en = locale === "en" ? path : (enPath ?? autreLangue(path, "fr"));
  const languages: Record<string, string> = {};
  if (fr) languages["fr-CH"] = abs(fr);
  if (en) languages.en = abs(en);
  if (fr) languages["x-default"] = abs(fr);
  const image = locale === "en" ? "/og/guide-assurance-en.png" : "/og/guide-assurance.png";
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: abs(path), languages },
    openGraph: {
      type: "website",
      locale: locale === "fr" ? "fr_CH" : "en_GB",
      alternateLocale: locale === "fr" ? (en ? ["en_GB"] : undefined) : fr ? ["fr_CH"] : undefined,
      siteName: SITE_NAME,
      title,
      description,
      url: abs(path),
      images: [{ url: abs(image), width: 1200, height: 630, alt: "Guide Assurance" }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export const robotsMeta: Metadata["robots"] = INDEXABLE
  ? { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 }
  : { index: false, follow: false };
