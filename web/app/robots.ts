import type { MetadataRoute } from "next";

// Keeps the admin dashboard and staff login out of search results — the
// public landing page (/), shop directory (/shops), and storefronts
// (/shop/[slug]) are the only routes meant to be indexed.
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            { userAgent: "*", allow: "/", disallow: ["/admin", "/admin/", "/login"] }
        ]
    };
}
