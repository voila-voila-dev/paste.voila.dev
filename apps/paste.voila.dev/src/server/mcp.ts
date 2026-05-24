import { type ApiDeps, handleCreatePaste, handleGetPaste, SITE_URL } from "./api.ts";

/**
 * Minimal stateless MCP server over the Streamable HTTP transport.
 * Exposes paste.voila.dev as tools (create_paste, get_paste) for MCP clients
 * such as Claude Code. Tool calls reuse the public API handlers, so they
 * inherit the same validation and rate limiting.
 */

const DEFAULT_PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "paste.voila.dev", version: "1.0.0" };

const CORS: Record<string, string> = {
	"access-control-allow-origin": "*",
	"access-control-allow-methods": "POST, GET, OPTIONS",
	"access-control-allow-headers": "content-type, mcp-session-id, mcp-protocol-version",
};

const TOOLS = [
	{
		name: "create_paste",
		description:
			"Create a markdown paste on paste.voila.dev. Provide either a single `content` string or a `files` array for a multi-file paste. Returns the public URL and a secret editToken (needed to edit or delete later).",
		inputSchema: {
			type: "object",
			properties: {
				content: {
					type: "string",
					description: "Markdown content for a single-file paste (becomes index.md).",
				},
				files: {
					type: "array",
					description: "Files for a multi-file paste. Use instead of `content`.",
					items: {
						type: "object",
						properties: {
							path: { type: "string", description: "Relative path, e.g. docs/intro.md" },
							content: { type: "string" },
						},
						required: ["path", "content"],
					},
				},
				title: { type: "string", description: "Optional title." },
				visibility: {
					type: "string",
					enum: ["public", "unlisted"],
					description: "public (listed) or unlisted. Defaults to public.",
				},
				entryPath: {
					type: "string",
					description: "Which file is the home/entry file (multi-file only).",
				},
			},
		},
	},
	{
		name: "get_paste",
		description: "Fetch a paste from paste.voila.dev by its id. Returns its files and metadata.",
		inputSchema: {
			type: "object",
			properties: { id: { type: "string", description: "The paste id (UUID)." } },
			required: ["id"],
		},
	},
];

type JsonRpcId = string | number | null;
type JsonRpcMessage = {
	jsonrpc?: string;
	id?: JsonRpcId;
	method?: string;
	params?: Record<string, unknown>;
};

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json; charset=utf-8", ...CORS },
	});
}

function rpcResult(id: JsonRpcId, result: unknown) {
	return { jsonrpc: "2.0" as const, id, result };
}

function rpcError(id: JsonRpcId, code: number, message: string) {
	return { jsonrpc: "2.0" as const, id, error: { code, message } };
}

function toolText(id: JsonRpcId, text: string, isError = false) {
	return rpcResult(id, { content: [{ type: "text", text }], isError });
}

/** Forward the caller's IP so create_paste rate-limits per end user. */
function forwardHeaders(request: Request): Headers {
	const h = new Headers({ "content-type": "application/json" });
	const ip = request.headers.get("cf-connecting-ip");
	if (ip) h.set("cf-connecting-ip", ip);
	const xff = request.headers.get("x-forwarded-for");
	if (xff) h.set("x-forwarded-for", xff);
	return h;
}

async function callTool(
	id: JsonRpcId,
	params: Record<string, unknown> | undefined,
	request: Request,
	deps: ApiDeps,
) {
	const name = params?.name;
	const args = (params?.arguments ?? {}) as Record<string, unknown>;

	if (name === "create_paste") {
		const req = new Request(`${SITE_URL}/api/pastes`, {
			method: "POST",
			headers: forwardHeaders(request),
			body: JSON.stringify(args),
		});
		const res = await handleCreatePaste(req, deps);
		const data = (await res.json()) as Record<string, unknown>;
		if (!res.ok) return toolText(id, String(data.message ?? "Failed to create paste."), true);
		return toolText(id, JSON.stringify(data, null, 2));
	}

	if (name === "get_paste") {
		if (typeof args.id !== "string") return toolText(id, "`id` is required.", true);
		const res = await handleGetPaste(args.id, { repo: deps.repo });
		const data = (await res.json()) as Record<string, unknown>;
		if (!res.ok) return toolText(id, String(data.message ?? "Paste not found."), true);
		return toolText(id, JSON.stringify(data, null, 2));
	}

	return rpcError(id, -32602, `Unknown tool: ${String(name)}`);
}

async function dispatch(msg: JsonRpcMessage, request: Request, deps: ApiDeps) {
	const id = msg.id ?? null;
	const isNotification = msg.id === undefined || msg.id === null;

	switch (msg.method) {
		case "initialize":
			return rpcResult(id, {
				protocolVersion: (msg.params?.protocolVersion as string) ?? DEFAULT_PROTOCOL_VERSION,
				capabilities: { tools: {} },
				serverInfo: SERVER_INFO,
			});
		case "ping":
			return rpcResult(id, {});
		case "tools/list":
			return rpcResult(id, { tools: TOOLS });
		case "tools/call":
			return await callTool(id, msg.params, request, deps);
		default:
			// Notifications (notifications/initialized, etc.) get no response.
			if (isNotification) return null;
			return rpcError(id, -32601, `Method not found: ${String(msg.method)}`);
	}
}

export async function handleMcp(request: Request, deps: ApiDeps): Promise<Response> {
	if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
	if (request.method !== "POST") {
		return new Response("Method Not Allowed", {
			status: 405,
			headers: { ...CORS, allow: "POST, OPTIONS" },
		});
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return jsonResponse(rpcError(null, -32700, "Parse error"), 400);
	}

	if (Array.isArray(body)) {
		const responses = [];
		for (const msg of body as JsonRpcMessage[]) {
			const r = await dispatch(msg, request, deps);
			if (r) responses.push(r);
		}
		return responses.length ? jsonResponse(responses) : new Response(null, { status: 202 });
	}

	const r = await dispatch(body as JsonRpcMessage, request, deps);
	if (!r) return new Response(null, { status: 202, headers: CORS });
	return jsonResponse(r);
}
