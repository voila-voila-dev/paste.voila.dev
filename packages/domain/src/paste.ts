import { editToken, uuidv7 } from "./ids.ts";

export const MAX_PASTE_SIZE = 1024 * 1024; // 1 MB

export type Paste = {
	id: string;
	content: string;
	editToken: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PasteSummary = Omit<Paste, "editToken">;

export function toSummary(paste: Paste): PasteSummary {
	const { editToken: _t, ...rest } = paste;
	return rest;
}

export function newPaste(content: string): Paste {
	const now = new Date();
	return {
		id: uuidv7(),
		content,
		editToken: editToken(),
		createdAt: now,
		updatedAt: now,
	};
}

export interface PasteRepository {
	create(paste: Paste): Promise<Paste>;
	findById(id: string): Promise<Paste | null>;
	update(id: string, content: string): Promise<Paste>;
	delete(id: string): Promise<void>;
}
