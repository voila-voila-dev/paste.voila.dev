import { describe, expect, test } from "bun:test";
import {
	type Paste,
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
		patch: { content: string; title: string | null; visibility: Visibility },
	): Promise<Paste> {
		const existing = this.store.get(id);
		if (!existing) throw new Error("not found");
		const updated: Paste = { ...existing, ...patch, updatedAt: new Date() };
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
	test("creates a paste and returns 201 with id, urls and edit token", async () => {
		const repo = new InMemoryPasteRepository();
		const res = await handleCreatePaste(postRequest({ content: "# hello" }), {
			repo,
			limiter: allow,
		});

		expect(res.status).toBe(201);
		const body = (await res.json()) as Record<string, string>;
		expect(body.id).toBeString();
		expect(body.url).toBe(`${SITE_URL}/${body.id}`);
		expect(body.rawUrl).toBe(`${SITE_URL}/${body.id}/raw`);
		expect(body.editToken).toHaveLength(32);
		expect(body.visibility).toBe("public");

		const stored = await repo.findById(body.id);
		expect(stored?.content).toBe("# hello");
	});

	test("honors title and visibility", async () => {
		const repo = new InMemoryPasteRepository();
		const res = await handleCreatePaste(
			postRequest({ content: "x", title: "  My note  ", visibility: "unlisted" }),
			{ repo, limiter: allow },
		);

		const body = (await res.json()) as Record<string, string>;
		expect(body.title).toBe("My note");
		expect(body.visibility).toBe("unlisted");
	});

	test("returns 429 when rate limited and does not persist", async () => {
		const repo = new InMemoryPasteRepository();
		const res = await handleCreatePaste(postRequest({ content: "x" }), { repo, limiter: deny });

		expect(res.status).toBe(429);
		expect(res.headers.get("retry-after")).toBe("60");
		const body = (await res.json()) as Record<string, string>;
		expect(body.error).toBe("rate_limited");
		expect(await repo.findRecent(10)).toHaveLength(0);
	});

	test("returns 400 for invalid JSON", async () => {
		const repo = new InMemoryPasteRepository();
		const res = await handleCreatePaste(postRequest("{ not json"), { repo, limiter: allow });

		expect(res.status).toBe(400);
		expect(((await res.json()) as Record<string, string>).error).toBe("invalid_json");
	});

	test("returns 400 for empty content", async () => {
		const repo = new InMemoryPasteRepository();
		const res = await handleCreatePaste(postRequest({ content: "" }), { repo, limiter: allow });

		expect(res.status).toBe(400);
		expect(((await res.json()) as Record<string, string>).error).toBe("invalid_input");
	});
});

describe("GET /api/pastes/:id", () => {
	test("returns the paste as JSON without leaking the edit token", async () => {
		const repo = new InMemoryPasteRepository();
		const created = await handleCreatePaste(
			postRequest({ content: "body", title: "t" }),
			{ repo, limiter: allow },
		);
		const { id } = (await created.json()) as { id: string };

		const res = await handleGetPaste(id, { repo });
		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.id).toBe(id);
		expect(body.content).toBe("body");
		expect(body.title).toBe("t");
		expect(body).not.toHaveProperty("editToken");
	});

	test("returns 404 for an unknown id", async () => {
		const repo = new InMemoryPasteRepository();
		const res = await handleGetPaste("does-not-exist", { repo });

		expect(res.status).toBe(404);
		expect(((await res.json()) as Record<string, string>).error).toBe("not_found");
	});
});
