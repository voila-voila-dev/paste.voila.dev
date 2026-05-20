import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "../lib/seo.ts";
import { getPasteRepository } from "../server/db.ts";

function escapeXml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async () => {
				const pastes = await getPasteRepository().findRecent(1000);
				const now = new Date().toISOString();
				const entries = [
					`<url><loc>${escapeXml(SITE_URL)}/</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
					...pastes.map((p) => {
						const lastmod = new Date(p.updatedAt).toISOString();
						return `<url><loc>${escapeXml(`${SITE_URL}/${p.id}`)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`;
					}),
				];
				const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
				return new Response(body, {
					headers: {
						"content-type": "application/xml; charset=utf-8",
						"cache-control": "public, max-age=300, s-maxage=300",
					},
				});
			},
		},
	},
});
