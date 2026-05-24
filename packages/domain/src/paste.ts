import { editToken, uuidv7 } from "./ids.ts";
import { normalizePath } from "./paths.ts";

export const MAX_PASTE_SIZE = 1024 * 1024; // 1 MB (total across files)
export const MAX_TITLE_LENGTH = 120;
export const MAX_FILES = 50;

export type Visibility = "public" | "unlisted";

export type PasteFile = {
	path: string;
	content: string;
};

export type Paste = {
	id: string;
	files: PasteFile[];
	/** Path of the "home" file shown by default and mirrored into `content`. */
	entryPath: string;
	/** Denormalized copy of the entry file's content (back-compat for single-file consumers). */
	content: string;
	editToken: string;
	title: string | null;
	visibility: Visibility;
	createdAt: Date;
	updatedAt: Date;
};

export type PasteSummary = Omit<Paste, "editToken" | "files"> & { fileCount: number };

export function toSummary(paste: Paste): PasteSummary {
	const { editToken: _t, files, ...rest } = paste;
	return { ...rest, fileCount: files.length };
}

/** Pick the default entry file: prefer index.md, then README.md, else the first file. */
export function defaultEntryPath(files: PasteFile[]): string {
	const paths = files.map((f) => f.path);
	if (paths.includes("index.md")) return "index.md";
	if (paths.includes("README.md")) return "README.md";
	return paths[0] ?? "index.md";
}

export function entryContent(files: PasteFile[], entryPath: string): string {
	return files.find((f) => f.path === entryPath)?.content ?? files[0]?.content ?? "";
}

function normalizeTitle(title?: string | null): string | null {
	if (!title) return null;
	const trimmed = title.trim();
	if (!trimmed) return null;
	return trimmed.slice(0, MAX_TITLE_LENGTH);
}

export function newPaste(
	files: PasteFile[],
	options: { title?: string | null; visibility?: Visibility; entryPath?: string } = {},
): Paste {
	const normalized = files.map((f) => ({ path: normalizePath(f.path), content: f.content }));
	const requested = options.entryPath ? normalizePath(options.entryPath) : undefined;
	const entryPath =
		requested && normalized.some((f) => f.path === requested)
			? requested
			: defaultEntryPath(normalized);
	const now = new Date();
	return {
		id: uuidv7(),
		files: normalized,
		entryPath,
		content: entryContent(normalized, entryPath),
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
		patch: {
			files: PasteFile[];
			entryPath: string;
			title: string | null;
			visibility: Visibility;
		},
	): Promise<Paste>;
	delete(id: string): Promise<void>;
}
