import { describe, expect, test } from "bun:test";
import { basename, dirname, isValidPath, normalizePath, resolveRelativePath } from "./paths.ts";

describe("normalizePath", () => {
	test("collapses slashes and strips ./ and trailing /", () => {
		expect(normalizePath("./docs//intro.md")).toBe("docs/intro.md");
		expect(normalizePath("docs/")).toBe("docs");
		expect(normalizePath("  a/b.md  ")).toBe("a/b.md");
	});
});

describe("isValidPath", () => {
	test("accepts nested relative paths", () => {
		expect(isValidPath("index.md")).toBe(true);
		expect(isValidPath("docs/intro.md")).toBe(true);
		expect(isValidPath("a/b/c-d_e.txt")).toBe(true);
	});
	test("rejects absolute, traversal, empty and unsafe paths", () => {
		expect(isValidPath("/etc/passwd")).toBe(false);
		expect(isValidPath("../secret.md")).toBe(false);
		expect(isValidPath("a/../b.md")).toBe(false);
		expect(isValidPath("")).toBe(false);
		expect(isValidPath("a/<b>.md")).toBe(false);
	});
});

describe("dirname / basename", () => {
	test("split a path", () => {
		expect(dirname("docs/a/b.md")).toBe("docs/a");
		expect(dirname("b.md")).toBe("");
		expect(basename("docs/a/b.md")).toBe("b.md");
		expect(basename("b.md")).toBe("b.md");
	});
});

describe("resolveRelativePath", () => {
	test("resolves ./, ../ and bare links against the source file dir", () => {
		expect(resolveRelativePath("docs/intro.md", "./setup.md")).toBe("docs/setup.md");
		expect(resolveRelativePath("docs/intro.md", "../README.md")).toBe("README.md");
		expect(resolveRelativePath("docs/intro.md", "guide/a.md")).toBe("docs/guide/a.md");
		expect(resolveRelativePath("README.md", "docs/intro.md")).toBe("docs/intro.md");
		expect(resolveRelativePath("a/b/c.md", "../../top.md")).toBe("top.md");
	});
});
