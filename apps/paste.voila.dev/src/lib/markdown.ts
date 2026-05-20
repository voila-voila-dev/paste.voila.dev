import hljs from "highlight.js";
import { Marked } from "marked";

const marked = new Marked({
	gfm: true,
	breaks: false,
	walkTokens(token) {
		if (token.type === "html" || token.type === "inline_html") {
			token.text = "";
			token.raw = "";
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

export function renderMarkdown(content: string): string {
	return marked.parse(content, { async: false }) as string;
}
