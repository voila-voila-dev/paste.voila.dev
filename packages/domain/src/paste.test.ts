import { describe, expect, test } from "bun:test";
import { defaultEntryPath, entryContent, newPaste, toSummary } from "./paste.ts";

describe("defaultEntryPath", () => {
	test("prefers index.md, then README.md, else first file", () => {
		expect(
			defaultEntryPath([
				{ path: "a.md", content: "" },
				{ path: "index.md", content: "" },
			]),
		).toBe("index.md");
		expect(
			defaultEntryPath([
				{ path: "a.md", content: "" },
				{ path: "README.md", content: "" },
			]),
		).toBe("README.md");
		expect(
			defaultEntryPath([
				{ path: "first.md", content: "" },
				{ path: "z.md", content: "" },
			]),
		).toBe("first.md");
	});
});

describe("newPaste", () => {
	test("normalizes paths, sets default entry, mirrors entry content", () => {
		const paste = newPaste([
			{ path: "./README.md", content: "# Readme" },
			{ path: "docs//intro.md", content: "# Intro" },
		]);
		expect(paste.files.map((f) => f.path)).toEqual(["README.md", "docs/intro.md"]);
		expect(paste.entryPath).toBe("README.md");
		expect(paste.content).toBe("# Readme");
		expect(paste.editToken).toHaveLength(32);
		expect(paste.visibility).toBe("public");
	});

	test("honors a valid entryPath option and normalizes the title", () => {
		const paste = newPaste(
			[
				{ path: "a.md", content: "A" },
				{ path: "b.md", content: "B" },
			],
			{ entryPath: "b.md", title: "  Hello  " },
		);
		expect(paste.entryPath).toBe("b.md");
		expect(paste.content).toBe("B");
		expect(paste.title).toBe("Hello");
	});

	test("falls back to default entry when entryPath is not among the files", () => {
		const paste = newPaste([{ path: "index.md", content: "x" }], { entryPath: "missing.md" });
		expect(paste.entryPath).toBe("index.md");
	});
});

describe("toSummary", () => {
	test("drops editToken and files, adds fileCount", () => {
		const paste = newPaste([
			{ path: "index.md", content: "x" },
			{ path: "two.md", content: "y" },
		]);
		const summary = toSummary(paste);
		expect(summary).not.toHaveProperty("editToken");
		expect(summary).not.toHaveProperty("files");
		expect(summary.fileCount).toBe(2);
		expect(summary.content).toBe("x");
	});
});

describe("entryContent", () => {
	test("returns the entry file content, falling back to the first file", () => {
		const files = [
			{ path: "a.md", content: "A" },
			{ path: "b.md", content: "B" },
		];
		expect(entryContent(files, "b.md")).toBe("B");
		expect(entryContent(files, "missing.md")).toBe("A");
	});
});
