import { editToken, uuidv7 } from "./ids.ts";

export const MAX_PASTE_SIZE = 1024 * 1024; // 1 MB
export const MAX_TITLE_LENGTH = 120;

export type Paste = {
	id: string;
	content: string;
	editToken: string;
	title: string | null;
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

export function newPaste(content: string, title?: string | null): Paste {
	const now = new Date();
	return {
		id: uuidv7(),
		content,
		editToken: editToken(),
		title: normalizeTitle(title),
		createdAt: now,
		updatedAt: now,
	};
}

export interface PasteRepository {
	create(paste: Paste): Promise<Paste>;
	findById(id: string): Promise<Paste | null>;
	findRecent(limit: number): Promise<PasteSummary[]>;
	update(id: string, content: string, title: string | null): Promise<Paste>;
	delete(id: string): Promise<void>;
}
