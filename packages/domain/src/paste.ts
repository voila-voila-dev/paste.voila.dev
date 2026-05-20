import { editToken, uuidv7 } from "./ids.ts";

export const MAX_PASTE_SIZE = 1024 * 1024; // 1 MB
export const MAX_TITLE_LENGTH = 120;

export type Visibility = "public" | "unlisted";

export type Paste = {
	id: string;
	content: string;
	editToken: string;
	title: string | null;
	visibility: Visibility;
	createdAt: Date;
	updatedAt: Date;
};

export type PasteSummary = Omit<Paste, "editToken">;

export function toSummary(paste: Paste): PasteSummary {
	const { editToken: _t, ...rest } = paste;
	return rest;
}

function normalizeTitle(title?: string | null): string | null {
	if (!title) return null;
	const trimmed = title.trim();
	if (!trimmed) return null;
	return trimmed.slice(0, MAX_TITLE_LENGTH);
}

export function newPaste(
	content: string,
	options: { title?: string | null; visibility?: Visibility } = {},
): Paste {
	const now = new Date();
	return {
		id: uuidv7(),
		content,
		editToken: editToken(),
		title: normalizeTitle(options.title),
		visibility: options.visibility ?? "public",
		createdAt: now,
		updatedAt: now,
	};
}

export interface PasteRepository {
	create(paste: Paste): Promise<Paste>;
	findById(id: string): Promise<Paste | null>;
	findRecent(limit: number): Promise<PasteSummary[]>;
	update(
		id: string,
		patch: { content: string; title: string | null; visibility: Visibility },
	): Promise<Paste>;
	delete(id: string): Promise<void>;
}
