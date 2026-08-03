import type { MetadataRoute } from "next";
import { hajiasalAbsoluteUrl } from "@/lib/paths";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/seller",
        "/login",
        "/register",
        "/forgot-password",
        "/account",
        "/checkout",
        "/cart",
        "/wishlist",
        "/api/",
      ],
    },
    sitemap: hajiasalAbsoluteUrl("/sitemap.xml"),
  };
}
