import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard/",
        "/checkout/",
        "/admin/",
        "/sign-in/",
        "/sign-up/",
      ],
    },
    sitemap: "https://port67.ai/sitemap.xml",
  };
}
