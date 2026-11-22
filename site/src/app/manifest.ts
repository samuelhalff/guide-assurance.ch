import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/* Icône d'application : tuile encre, bouquetin ocre (docs/decisions.md §8 duodecies). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Guide Assurance",
    short_name: "Guide Assurance",
    description: "Les assurances en Suisse romande, expliquées à partir des données officielles.",
    start_url: "/",
    display: "browser",
    lang: "fr-CH",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
