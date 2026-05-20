export const SITE_URL = "https://paste.voila.dev";
export const SITE_NAME = "paste.voila.dev";
export const SITE_TAGLINE = "markdown pastebin, no auth";
export const SITE_DESCRIPTION =
	"Minimal markdown pastebin. No accounts, no expiry. Edit token lives in the URL fragment so it never touches the server. Free and open source, deployed on Cloudflare Workers.";
export const OG_IMAGE_URL = `${SITE_URL}/og.svg`;

export function excerpt(markdown: string, max = 160): string {
	const stripped = markdown
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/`[^`]*`/g, " ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
		.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
		.replace(/[#>*_~`-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (stripped.length <= max) return stripped;
	return `${stripped.slice(0, max - 1).trimEnd()}…`;
}
