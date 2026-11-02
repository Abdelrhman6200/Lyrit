import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const isProd = process.env.APP_ENV === "production";
  return {
    rules: isProd
      ? [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/cart", "/checkout", "/order", "/api", "/search"] }]
      : [{ userAgent: "*", disallow: "/" }], // keep staging out of search engines
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
