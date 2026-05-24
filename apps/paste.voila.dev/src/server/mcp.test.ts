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
import { type Limiter, SITE_URL } from "./api.ts";
import { handleMcp } from "./mcp.ts";

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
			...patch,
			content: entryContent(patch.files, patch.entryPath),
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

function rpc(message: unknown): Request {
	return new Request(`${SITE_URL}/mcp`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(message),
	});
}

function deps() {
	return { repo: new InMemoryPasteRepository(), limiter: allow };
}

// biome-ignore lint/suspicious/noExplicitAny: test reads loose JSON-RPC shapes
async function callJson(res: Response): Promise<any> {
	return res.json();
}

describe("MCP handshake", () => {
	test("initialize returns server info and tools capability", async () => {
		const res = await handleMcp(
			rpc({
				jsonrpc: "2.0",
				id: 1,
				method: "initialize",
				params: { protocolVersion: "2025-06-18" },
			}),
			deps(),
		);
		const body = await callJson(res);
		expect(body.result.serverInfo.name).toBe("paste.voila.dev");
		expect(body.result.capabilities.tools).toBeDefined();
		expect(body.result.protocolVersion).toBe("2025-06-18");
	});

	test("notifications get no response (202)", async () => {
		const res = await handleMcp(
			rpc({ jsonrpc: "2.0", method: "notifications/initialized" }),
			deps(),
		);
		expect(res.status).toBe(202);
	});

	test("tools/list returns create_paste and get_paste", async () => {
		const res = await handleMcp(rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }), deps());
		const body = await callJson(res);
		const names = body.result.tools.map((t: { name: string }) => t.name);
		expect(names).toEqual(["create_paste", "get_paste"]);
	});

	test("OPTIONS preflight returns CORS", async () => {
		const res = await handleMcp(new Request(`${SITE_URL}/mcp`, { method: "OPTIONS" }), deps());
		expect(res.status).toBe(204);
		expect(res.headers.get("access-control-allow-origin")).toBe("*");
	});

	test("unknown method returns -32601", async () => {
		const res = await handleMcp(rpc({ jsonrpc: "2.0", id: 9, method: "bogus" }), deps());
		const body = await callJson(res);
		expect(body.error.code).toBe(-32601);
	});
});

describe("MCP tools", () => {
	test("create_paste then get_paste round-trips through one repo", async () => {
		const d = deps();
		const created = await handleMcp(
			rpc({
				jsonrpc: "2.0",
				id: 1,
				method: "tools/call",
				params: { name: "create_paste", arguments: { content: "# Hi", title: "t" } },
			}),
			d,
		);
		const createdBody = await callJson(created);
		expect(createdBody.result.isError).toBe(false);
		const payload = JSON.parse(createdBody.result.content[0].text);
		expect(payload.url).toBe(`${SITE_URL}/${payload.id}`);
		expect(payload.editToken).toHaveLength(32);

		const got = await handleMcp(
			rpc({
				jsonrpc: "2.0",
				id: 2,
				method: "tools/call",
				params: { name: "get_paste", arguments: { id: payload.id } },
			}),
			d,
		);
		const gotPayload = JSON.parse((await callJson(got)).result.content[0].text);
		expect(gotPayload.files).toEqual([{ path: "index.md", content: "# Hi" }]);
	});

	test("create_paste with files array", async () => {
		const res = await handleMcp(
			rpc({
				jsonrpc: "2.0",
				id: 1,
				method: "tools/call",
				params: {
					name: "create_paste",
					arguments: {
						files: [
							{ path: "README.md", content: "x" },
							{ path: "a.md", content: "y" },
						],
					},
				},
			}),
			deps(),
		);
		const payload = JSON.parse((await callJson(res)).result.content[0].text);
		expect(payload.files).toEqual([{ path: "README.md" }, { path: "a.md" }]);
	});

	test("get_paste with unknown id reports a tool error", async () => {
		const res = await handleMcp(
			rpc({
				jsonrpc: "2.0",
				id: 1,
				method: "tools/call",
				params: { name: "get_paste", arguments: { id: "nope" } },
			}),
			deps(),
		);
		const body = await callJson(res);
		expect(body.result.isError).toBe(true);
	});
});
