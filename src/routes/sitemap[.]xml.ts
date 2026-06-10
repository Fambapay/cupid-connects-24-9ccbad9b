import { createFileRoute } from "@tanstack/react-router";

const HOSTS: Record<string, { host: string; lang: string }> = {
  MZ: { host: "hunie.app", lang: "pt-MZ" },
  AO: { host: "ao.hunie.app", lang: "pt-AO" },
};

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/welcome", changefreq: "monthly", priority: "0.7" },
  { path: "/membership", changefreq: "monthly", priority: "0.8" },
  { path: "/shop", changefreq: "weekly", priority: "0.6" },
  { path: "/auth/login", changefreq: "yearly", priority: "0.3" },
  { path: "/auth/register", changefreq: "yearly", priority: "0.4" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = Object.values(HOSTS).flatMap(({ host, lang }) =>
          ENTRIES.map((e) => {
            const alternates = Object.values(HOSTS).map(
              ({ host: h, lang: l }) =>
                `    <xhtml:link rel="alternate" hreflang="${l}" href="https://${h}${e.path}" />`,
            );
            return [
              `  <url>`,
              `    <loc>https://${host}${e.path}</loc>`,
              ...alternates,
              `    <xhtml:link rel="alternate" hreflang="x-default" href="https://hunie.app${e.path}" />`,
              e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
              e.priority ? `    <priority>${e.priority}</priority>` : null,
              `  </url>`,
            ]
              .filter(Boolean)
              .join("\n");
          }),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        // Mark the host param as intentionally referenced
        void lang;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});

// `lang` is consumed inside the map; this re-declares it for the linter
// in case the outer reference is shadowed in some bundlers.
let lang: string;
