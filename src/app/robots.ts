import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            // Superfícies internas: sem valor de pesquisa e não devem ser rastreadas.
            // O `noindex` do portal B2B continua a ser a defesa real — isto apenas
            // evita gastar orçamento de rastreio.
            disallow: ["/api/", "/partner/", "/internal/", "/master-admin/", "/drivers-pwa/"],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
