import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "understand",
    "automate",
    "explain",
    "work",
    "process",
    "contact",
  ].map((route) => ({ url: `https://port67.ai/${route ? route : ""}` }));
}
