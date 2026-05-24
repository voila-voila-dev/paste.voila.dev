import { describe, expect, test } from "bun:test";
import {
	entryContent,
	type Paste,
	type PasteFile,
	type PasteRepository,
	type PasteSummary,
	toSummary,
	type Visibility,
} from "@paste.voila.dev/domain/paste";
import { handleCreatePaste, handleGetPaste, type Limiter, SITE_URL } from "./api.ts";

class InMemoryPasteRepository implements PasteRepository {
	private readonly store = new Map<string, Paste>();

	async create(paste: Paste): Promise<Paste> {
		this.store.set(paste.id, paste);
		return paste;
	}
	async findById(id: string): Promise<Paste | null> {
		return this.store.get(id) ?? null;
	}
	async findRecent(limit: number): Promise<PasteSummary[]> {
		return [...this.store.values()].slice(0, limit).map(toSummary);
	}
	async update(
		id: string,
		patch: { files: PasteFile[]; entryPath: string; title: string | null; visibility: Visibility },
	): Promise<Paste> {
		const existing = this.store.get(id);
		if (!existing) throw new Error("not found");
		const updated: Paste = {
			...existing,
			files: patch.files,
			entryPath: patch.entryPath,
			content: entryContent(patch.files, patch.entryPath),
			title: patch.title,
			visibility: patch.visibility,
			updatedAt: new Date(),
		};
		this.store.set(id, updated);
		return updated;
	}
	async delete(id: string): Promise<void> {
		this.store.delete(id);
	}
}

const allow: Limiter = { limit: async () => ({ success: true }) };
const deny: Limiter = { limit: async () => ({ success: false }) };

function postRequest(body: unknown, headers: Record<string, string> = {}): Request {
	return new Request(`${SITE_URL}/api/pastes`, {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: typeof body === "string" ? body : JSON.stringify(body),
	});
}

describe("POST /api/pastes", () => {
	test("creates a multi-file paste and returns 201 with file paths + entry", async () => {
		const repo = new InMemoryPasteRepository();
		const res = await handleCreatePaste(
			postRequest({
				files: [
					{ path: "README.md", content: "# Readme" },
					{ path: "docs/intro.md", content: "# Intro" },
				],
			}),
			{ repo, limiter: allow },
		);

		expect(res.status).toBe(201);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.editToken).toHaveLength(32);
		expect(body.files).toEqual([{ path: "README.md" }, { path: "docs/intro.md" }]);
		// README.md is the default entry (no index.md present)
		expect(body.entryPath).toBe("README.md");

		const stored = await repo.findById(body.id as string);
		expect(stored?.files).toHaveLength(2);
	});

	test("legacy single `content` becomes index.md", async () => {
		const repo = new InMemoryPasteRepository();
		const res = await handleCreatePaste(postRequest({ content: "# hi" }), { repo, limiter: allow });
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.files).toEqual([{ path: "index.md" }]);
		expect(body.entryPath).toBe("index.md");
	});

	test("honors entryPath, title and visibility", async () => {
		const repo = new InMemoryPasteRepository();
		const res = await handleCreatePaste(
			postRequest({
				files: [
					{ path: "a.md", content: "a" },
					{ path: "b.md", content: "b" },
				],
				entryPath: "b.md",
				title: "  My note  ",
				visibility: "unlisted",
			}),
			{ repo, limiter: allow },
		);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.entryPath).toBe("b.md");
		expect(body.title).toBe("My note");
		expect(body.visibility).toBe("unlisted");
	});

	test("rejects duplicate paths", async () => {
		const repo = new InMemoryPasteRepository();
		const res = await handleCreatePaste(
			postRequest({ files: [{ path: "a.md", content: "1" }, { path: "a.md", content: "2" }] }),
			{ repo, limiter: allow },
		);
		expect(res.status).toBe(400);
		expect(((await res.json()) as Record<string, string>).error).toBe("invalid_input");
	});

	test("rejects invalid path (absolute)", async () => {
		const repo = new InMemoryPasteRepository();
		const res = await handleCreatePaste(
			postRequest({ files: [{ path: "/etc/passwd", content: "x" }] }),
			{ repo, limiter: allow },
		);
		expect(res.status).toBe(400);
	});

	test("returns 429 when rate limited and does not persist", async () => {
		const repo = new InMemoryPasteRepository();
		const res = await handleCreatePaste(postRequest({ content: "x" }), { repo, limiter: deny });
		expect(res.status).toBe(429);
		expect(res.headers.get("retry-after")).toBe("60");
		expect(await repo.findRecent(10)).toHaveLength(0);
	});

	test("returns 400 for invalid JSON", async () => {
		const repo = new InMemoryPasteRepository();
		const res = await handleCreatePaste(postRequest("{ not json"), { repo, limiter: allow });
		expect(res.status).toBe(400);
		expect(((await res.json()) as Record<string, string>).error).toBe("invalid_json");
	});

	test("returns 400 when neither files nor content provided", async () => {
		const repo = new InMemoryPasteRepository();
		const res = await handleCreatePaste(postRequest({ title: "x" }), { repo, limiter: allow });
		expect(res.status).toBe(400);
		expect(((await res.json()) as Record<string, string>).error).toBe("invalid_input");
	});
});

describe("GET /api/pastes/:id", () => {
	test("returns files with content + entry mirror, no edit token", async () => {
		const repo = new InMemoryPasteRepository();
		const created = await handleCreatePaste(
			postRequest({
				files: [
					{ path: "index.md", content: "home" },
					{ path: "other.md", content: "other" },
				],
			}),
			{ repo, limiter: allow },
		);
		const { id } = (await created.json()) as { id: string };

		const res = await handleGetPaste(id, { repo });
		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.id).toBe(id);
		expect(body.entryPath).toBe("index.md");
		expect(body.content).toBe("home");
		expect(body.files).toEqual([
			{ path: "index.md", content: "home" },
			{ path: "other.md", content: "other" },
		]);
		expect(body).not.toHaveProperty("editToken");
	});

	test("returns 404 for an unknown id", async () => {
		const repo = new InMemoryPasteRepository();
		const res = await handleGetPaste("does-not-exist", { repo });
		expect(res.status).toBe(404);
		expect(((await res.json()) as Record<string, string>).error).toBe("not_found");
	});
});
