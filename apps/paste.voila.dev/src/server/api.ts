import {
	MAX_FILES,
	MAX_PASTE_SIZE,
	MAX_TITLE_LENGTH,
	newPaste,
	type PasteFile,
	type PasteRepository,
} from "@paste.voila.dev/domain/paste";
import { isValidPath, normalizePath } from "@paste.voila.dev/domain/paths";
import { z } from "zod";

export const SITE_URL = "https://paste.voila.dev";

const fileSchema = z.object({
	path: z.string().refine(isValidPath, "Invalid file path"),
	content: z.string(),
});

const createBody = z.object({
	files: z.array(fileSchema).min(1).max(MAX_FILES).optional(),
	content: z.string().min(1).max(MAX_PASTE_SIZE).optional(),
	entryPath: z.string().optional(),
	title: z.string().max(MAX_TITLE_LENGTH).optional().nullable(),
	visibility: z.enum(["public", "unlisted"]).optional().default("public"),
});

/** Minimal shape of a Cloudflare rate-limit binding — keeps this module testable. */
export interface Limiter {
	limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface ApiDeps {
	repo: PasteRepository;
	limiter: Limiter;
}

function clientIp(request: Request): string {
	const h = request.headers;
	return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for") ?? "local";
}

function json(body: unknown, init: ResponseInit = {}): Response {
	return new Response(JSON.stringify(body), {
		...init,
		headers: {
			"content-type": "application/json; charset=utf-8",
			...init.headers,
		},
	});
}

/** Accept either an explicit `files` array or a legacy single `content` string. */
function collectFiles(data: z.infer<typeof createBody>): PasteFile[] {
	if (data.files && data.files.length > 0) return data.files;
	if (data.content != null) return [{ path: "index.md", content: data.content }];
	return [];
}

export async function handleCreatePaste(
	request: Request,
	{ repo, limiter }: ApiDeps,
): Promise<Response> {
	const { success } = await limiter.limit({ key: `api-create:${clientIp(request)}` });
	if (!success) {
		return json(
			{ error: "rate_limited", message: "Too many requests — please slow down." },
			{ status: 429, headers: { "retry-after": "60" } },
		);
	}

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return json(
			{ error: "invalid_json", message: "Request body must be valid JSON." },
			{ status: 400 },
		);
	}

	const parsed = createBody.safeParse(raw);
	if (!parsed.success) {
		return json(
			{ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Invalid input." },
			{ status: 400 },
		);
	}

	const files = collectFiles(parsed.data);
	if (files.length === 0) {
		return json(
			{ error: "invalid_input", message: "Provide a `files` array or a `content` string." },
			{ status: 400 },
		);
	}

	const seen = new Set<string>();
	for (const f of files) {
		const p = normalizePath(f.path);
		if (seen.has(p)) {
			return json({ error: "invalid_input", message: `Duplicate path: ${p}` }, { status: 400 });
		}
		seen.add(p);
	}

	const total = files.reduce((sum, f) => sum + f.content.length, 0);
	if (total > MAX_PASTE_SIZE) {
		return json(
			{ error: "too_large", message: `Total content exceeds ${MAX_PASTE_SIZE} bytes.` },
			{ status: 413 },
		);
	}

	const created = await repo.create(
		newPaste(files, {
			title: parsed.data.title,
			visibility: parsed.data.visibility,
			entryPath: parsed.data.entryPath,
		}),
	);

	return json(
		{
			id: created.id,
			url: `${SITE_URL}/${created.id}`,
			rawUrl: `${SITE_URL}/${created.id}/raw`,
			editToken: created.editToken,
			entryPath: created.entryPath,
			files: created.files.map((f) => ({ path: f.path })),
			title: created.title,
			visibility: created.visibility,
			createdAt: created.createdAt.toISOString(),
		},
		{ status: 201 },
	);
}

export async function handleGetPaste(
	id: string,
	{ repo }: Pick<ApiDeps, "repo">,
): Promise<Response> {
	const paste = await repo.findById(id);
	if (!paste) {
		return json({ error: "not_found", message: `Paste not found: ${id}` }, { status: 404 });
	}

	return json(
		{
			id: paste.id,
			url: `${SITE_URL}/${paste.id}`,
			rawUrl: `${SITE_URL}/${paste.id}/raw`,
			entryPath: paste.entryPath,
			files: paste.files.map((f) => ({ path: f.path, content: f.content })),
			content: paste.content,
			title: paste.title,
			visibility: paste.visibility,
			createdAt: paste.createdAt.toISOString(),
			updatedAt: paste.updatedAt.toISOString(),
		},
		{ status: 200, headers: { "cache-control": "public, max-age=60" } },
	);
}
