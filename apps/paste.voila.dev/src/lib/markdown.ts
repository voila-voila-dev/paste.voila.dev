import { resolveRelativePath } from "@paste.voila.dev/domain/paths";
import hljs from "highlight.js";
import { Marked } from "marked";

export type LinkResolution = {
	pasteId: string;
	currentPath: string;
	filePaths: Set<string>;
};

/** Absolute URLs, protocol-relative, root-relative and pure-fragment links are left untouched. */
function isExternal(href: string): boolean {
	return (
		/^[a-z][a-z0-9+.-]*:/i.test(href) ||
		href.startsWith("//") ||
		href.startsWith("#") ||
		href.startsWith("/")
	);
}

/** Rewrite a relative link to another file in the same paste into an in-app `?f=` URL. */
export function rewriteHref(href: string, opts: LinkResolution): string {
	if (!href || isExternal(href)) return href;
	const hashIndex = href.indexOf("#");
	const pathPart = hashIndex === -1 ? href : href.slice(0, hashIndex);
	const frag = hashIndex === -1 ? "" : href.slice(hashIndex);
	if (!pathPart) return href;
	const resolved = resolveRelativePath(opts.currentPath, pathPart);
	if (!opts.filePaths.has(resolved)) return href;
	return `/${opts.pasteId}?f=${encodeURIComponent(resolved)}${frag}`;
}

function createMarked(opts?: LinkResolution): Marked {
	const marked = new Marked({
		gfm: true,
		breaks: false,
		walkTokens(token) {
			if (token.type === "html" || token.type === "inline_html") {
				token.text = "";
				token.raw = "";
				return;
			}
			if (opts && token.type === "link") {
				token.href = rewriteHref(token.href, opts);
			}
		},
	});

	marked.use({
		renderer: {
			code({ text, lang }) {
				const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
				const highlighted = hljs.highlight(text, { language, ignoreIllegals: true }).value;
				return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
			},
		},
	});

	return marked;
}

const defaultMarked = createMarked();

export function renderMarkdown(content: string, opts?: LinkResolution): string {
	const marked = opts ? createMarked(opts) : defaultMarked;
	return marked.parse(content, { async: false }) as string;
}
