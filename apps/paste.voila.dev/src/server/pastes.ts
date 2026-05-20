import { PasteNotFoundError, PasteTooLargeError } from "@paste.voila.dev/domain/errors";
import {
	MAX_PASTE_SIZE,
	MAX_TITLE_LENGTH,
	newPaste,
	type Paste,
} from "@paste.voila.dev/domain/paste";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { getPasteRepository } from "./db.ts";

const titleField = z.string().max(MAX_TITLE_LENGTH).optional().nullable();

const createInput = z.object({
	content: z.string().min(1).max(MAX_PASTE_SIZE),
	title: titleField,
});

const updateInput = z.object({
	id: z.string(),
	editToken: z.string(),
	content: z.string().min(1).max(MAX_PASTE_SIZE),
	title: titleField,
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

export const listRecentPastes = createServerFn({ method: "GET" }).handler(async () => {
	return getPasteRepository().findRecent(50);
});

export const createPaste = createServerFn({ method: "POST" })
	.inputValidator(createInput)
	.handler(async ({ data }) => {
		await enforce(env.CREATE_LIMITER, `create:${clientIp()}`);
		if (data.content.length > MAX_PASTE_SIZE) {
			throw new PasteTooLargeError(data.content.length, MAX_PASTE_SIZE);
		}
		const paste = newPaste(data.content, data.title);
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
		return repo.update(data.id, data.content, normalizeTitle(data.title));
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
