import { PasteNotFoundError, PasteTooLargeError } from "@paste.voila.dev/domain/errors";
import { MAX_PASTE_SIZE, newPaste, type Paste } from "@paste.voila.dev/domain/paste";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { getPasteRepository } from "./db.ts";

const createInput = z.object({
	content: z.string().min(1).max(MAX_PASTE_SIZE),
});

const updateInput = z.object({
	id: z.string(),
	editToken: z.string(),
	content: z.string().min(1).max(MAX_PASTE_SIZE),
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
		const paste = newPaste(data.content);
		const saved = await getPasteRepository().create(paste);
		return saved;
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
		return repo.update(data.id, data.content);
	});
