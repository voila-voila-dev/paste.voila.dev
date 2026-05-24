import { describe, expect, test } from "bun:test";
import { type LinkResolution, renderMarkdown, rewriteHref } from "./markdown.ts";

const opts: LinkResolution = {
	pasteId: "abc",
	currentPath: "docs/intro.md",
	filePaths: new Set(["docs/intro.md", "docs/setup.md", "README.md"]),
};

describe("rewriteHref", () => {
	test("rewrites a relative link to a known file into an in-app ?f= URL", () => {
		expect(rewriteHref("./setup.md", opts)).toBe("/abc?f=docs%2Fsetup.md");
		expect(rewriteHref("../README.md", opts)).toBe("/abc?f=README.md");
	});
	test("preserves a fragment", () => {
		expect(rewriteHref("./setup.md#install", opts)).toBe("/abc?f=docs%2Fsetup.md#install");
	});
	test("leaves external, absolute, anchor and unknown links untouched", () => {
		expect(rewriteHref("https://example.com", opts)).toBe("https://example.com");
		expect(rewriteHref("/other", opts)).toBe("/other");
		expect(rewriteHref("#section", opts)).toBe("#section");
		expect(rewriteHref("mailto:a@b.c", opts)).toBe("mailto:a@b.c");
		expect(rewriteHref("./missing.md", opts)).toBe("./missing.md");
	});
});

describe("renderMarkdown", () => {
	test("rewrites intra-paste links in rendered HTML", () => {
		const html = renderMarkdown("[setup](./setup.md)", opts);
		expect(html).toContain('href="/abc?f=docs%2Fsetup.md"');
	});
	test("without opts, leaves relative links as-is", () => {
		const html = renderMarkdown("[setup](./setup.md)");
		expect(html).toContain('href="./setup.md"');
	});
});
