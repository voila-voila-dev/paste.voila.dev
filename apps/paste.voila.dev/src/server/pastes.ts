import { env } from "cloudflare:workers";
import { PasteNotFoundError } from "@paste.voila.dev/domain/errors";
import {
	defaultEntryPath,
	MAX_FILES,
	MAX_PASTE_SIZE,
	MAX_TITLE_LENGTH,
	newPaste,
	type Paste,
} from "@paste.voila.dev/domain/paste";
import { isValidPath, normalizePath } from "@paste.voila.dev/domain/paths";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { getPasteRepository } from "./db.ts";

const titleField = z.string().max(MAX_TITLE_LENGTH).optional().nullable();
const visibilityField = z.enum(["public", "unlisted"]).optional().default("public");

const fileField = z.object({
	path: z.string().refine(isValidPath, "Invalid file path"),
	content: z.string(),
});

const filesField = z
	.array(fileField)
	.min(1)
	.max(MAX_FILES)
	.superRefine((files, ctx) => {
		const total = files.reduce((sum, f) => sum + f.content.length, 0);
		if (total > MAX_PASTE_SIZE) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Paste exceeds 1 MB" });
		}
		const seen = new Set<string>();
		for (const f of files) {
			const p = normalizePath(f.path);
			if (seen.has(p)) {
				ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate path: ${p}` });
			}
			seen.add(p);
		}
	});

const createInput = z.object({
	files: filesField,
	entryPath: z.string().optional(),
	title: titleField,
	visibility: visibilityField,
});

const updateInput = z.object({
	id: z.string(),
	editToken: z.string(),
	files: filesField,
	entryPath: z.string().optional(),
	title: titleField,
	visibility: visibilityField,
});

const deleteInput = z.object({
	id: z.string(),
	editToken: z.string(),
});

const idInput = z.object({ id: z.string() });

function clientIp(): string {
	const headers = getRequest().headers;
	return headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for") ?? "local";
}

class RateLimitedError extends Error {
	readonly _tag = "RateLimitedError";
	constructor(message = "Too many requests — please slow down.") {
		super(message);
	}
}

async function enforce(limiter: RateLimit, key: string): Promise<void> {
	const { success } = await limiter.limit({ key });
	if (!success) throw new RateLimitedError();
}

function normalizeTitle(input: string | null | undefined): string | null {
	if (!input) return null;
	const t = input.trim();
	return t ? t.slice(0, MAX_TITLE_LENGTH) : null;
}

/** Normalize incoming file paths and resolve the entry file. */
function prepareFiles(files: { path: string; content: string }[], entryPath?: string) {
	const normalized = files.map((f) => ({ path: normalizePath(f.path), content: f.content }));
	const requested = entryPath ? normalizePath(entryPath) : undefined;
	const resolvedEntry =
		requested && normalized.some((f) => f.path === requested)
			? requested
			: defaultEntryPath(normalized);
	return { files: normalized, entryPath: resolvedEntry };
}

export const listRecentPastes = createServerFn({ method: "GET" }).handler(async () => {
	return getPasteRepository().findRecent(50);
});

export const createPaste = createServerFn({ method: "POST" })
	.inputValidator(createInput)
	.handler(async ({ data }) => {
		await enforce(env.CREATE_LIMITER, `create:${clientIp()}`);
		const paste = newPaste(data.files, {
			title: data.title,
			visibility: data.visibility,
			entryPath: data.entryPath,
		});
		return getPasteRepository().create(paste);
	});

export const getPaste = createServerFn({ method: "GET" })
	.inputValidator(idInput)
	.handler(async ({ data }): Promise<Paste> => {
		const paste = await getPasteRepository().findById(data.id);
		if (!paste) throw new PasteNotFoundError(data.id);
		return paste;
	});

export const updatePaste = createServerFn({ method: "POST" })
	.inputValidator(updateInput)
	.handler(async ({ data }) => {
		await enforce(env.UPDATE_LIMITER, `update:${clientIp()}:${data.id}`);
		const repo = getPasteRepository();
		const existing = await repo.findById(data.id);
		if (!existing) throw new PasteNotFoundError(data.id);
		if (existing.editToken !== data.editToken) {
			throw new Error("Invalid edit token");
		}
		const { files, entryPath } = prepareFiles(data.files, data.entryPath);
		return repo.update(data.id, {
			files,
			entryPath,
			title: normalizeTitle(data.title),
			visibility: data.visibility,
		});
	});

export const deletePaste = createServerFn({ method: "POST" })
	.inputValidator(deleteInput)
	.handler(async ({ data }) => {
		await enforce(env.UPDATE_LIMITER, `delete:${clientIp()}:${data.id}`);
		const repo = getPasteRepository();
		const existing = await repo.findById(data.id);
		if (!existing) throw new PasteNotFoundError(data.id);
		if (existing.editToken !== data.editToken) {
			throw new Error("Invalid edit token");
		}
		await repo.delete(data.id);
		return { ok: true as const };
	});
