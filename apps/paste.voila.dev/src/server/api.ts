import {
	MAX_PASTE_SIZE,
	MAX_TITLE_LENGTH,
	newPaste,
	type PasteRepository,
	toSummary,
} from "@paste.voila.dev/domain/paste";
import { z } from "zod";

export const SITE_URL = "https://paste.voila.dev";

const createBody = z.object({
	content: z.string().min(1).max(MAX_PASTE_SIZE),
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

	const created = await repo.create(
		newPaste(parsed.data.content, {
			title: parsed.data.title,
			visibility: parsed.data.visibility,
		}),
	);

	return json(
		{
			id: created.id,
			url: `${SITE_URL}/${created.id}`,
			rawUrl: `${SITE_URL}/${created.id}/raw`,
			editToken: created.editToken,
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

	const summary = toSummary(paste);
	return json(
		{
			id: summary.id,
			url: `${SITE_URL}/${summary.id}`,
			rawUrl: `${SITE_URL}/${summary.id}/raw`,
			content: summary.content,
			title: summary.title,
			visibility: summary.visibility,
			createdAt: summary.createdAt.toISOString(),
			updatedAt: summary.updatedAt.toISOString(),
		},
		{ status: 200, headers: { "cache-control": "public, max-age=60" } },
	);
}
