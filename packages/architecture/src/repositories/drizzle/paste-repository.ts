import { PasteNotFoundError } from "@paste.voila.dev/domain/errors";
import {
	entryContent,
	type Paste,
	type PasteFile,
	type PasteRepository,
	type PasteSummary,
	type Visibility,
} from "@paste.voila.dev/domain/paste";
import { count, desc, eq } from "drizzle-orm";
import type { Database } from "./client.ts";
import { type PasteFileRow, pasteFileTable } from "./tables/paste-files-table.ts";
import { type PasteRow, pasteTable } from "./tables/paste-table.ts";

function toPaste(row: PasteRow, fileRows: PasteFileRow[]): Paste {
	const files: PasteFile[] = fileRows
		.slice()
		.sort((a, b) => a.position - b.position)
		.map((f) => ({ path: f.path, content: f.content }));
	return {
		id: row.id,
		files,
		entryPath: row.entryPath ?? "index.md",
		content: row.content,
		editToken: row.editToken,
		title: row.title,
		visibility: row.visibility,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export class DrizzlePasteRepository implements PasteRepository {
	constructor(private readonly db: Database) {}

	async create(paste: Paste): Promise<Paste> {
		const mirror = entryContent(paste.files, paste.entryPath);
		const fileInserts = paste.files.map((f, i) =>
			this.db.insert(pasteFileTable).values({
				id: `${paste.id}:${f.path}`,
				pasteId: paste.id,
				path: f.path,
				content: f.content,
				position: i,
			}),
		);
		await this.db.batch([
			this.db.insert(pasteTable).values({
				id: paste.id,
				content: mirror,
				entryPath: paste.entryPath,
				editToken: paste.editToken,
				title: paste.title,
				visibility: paste.visibility,
				createdAt: paste.createdAt,
				updatedAt: paste.updatedAt,
			}),
			...fileInserts,
		]);
		return { ...paste, content: mirror };
	}

	async findById(id: string): Promise<Paste | null> {
		const [row] = await this.db.select().from(pasteTable).where(eq(pasteTable.id, id)).limit(1);
		if (!row) return null;
		const fileRows = await this.db
			.select()
			.from(pasteFileTable)
			.where(eq(pasteFileTable.pasteId, id))
			.orderBy(pasteFileTable.position);
		return toPaste(row, fileRows);
	}

	async findRecent(limit: number): Promise<PasteSummary[]> {
		const fc = this.db
			.select({ pasteId: pasteFileTable.pasteId, n: count().as("n") })
			.from(pasteFileTable)
			.groupBy(pasteFileTable.pasteId)
			.as("fc");

		const rows = await this.db
			.select({
				id: pasteTable.id,
				content: pasteTable.content,
				entryPath: pasteTable.entryPath,
				title: pasteTable.title,
				visibility: pasteTable.visibility,
				createdAt: pasteTable.createdAt,
				updatedAt: pasteTable.updatedAt,
				fileCount: fc.n,
			})
			.from(pasteTable)
			.leftJoin(fc, eq(fc.pasteId, pasteTable.id))
			.where(eq(pasteTable.visibility, "public"))
			.orderBy(desc(pasteTable.createdAt))
			.limit(limit);

		return rows.map((r) => ({
			id: r.id,
			content: r.content,
			entryPath: r.entryPath ?? "index.md",
			title: r.title,
			visibility: r.visibility,
			createdAt: r.createdAt,
			updatedAt: r.updatedAt,
			fileCount: r.fileCount ?? 0,
		}));
	}

	async update(
		id: string,
		patch: {
			files: PasteFile[];
			entryPath: string;
			title: string | null;
			visibility: Visibility;
		},
	): Promise<Paste> {
		// Pre-check existence so the batch never inserts file rows for a missing paste.
		const [existing] = await this.db
			.select({ id: pasteTable.id })
			.from(pasteTable)
			.where(eq(pasteTable.id, id))
			.limit(1);
		if (!existing) throw new PasteNotFoundError(id);

		const mirror = entryContent(patch.files, patch.entryPath);
		const now = new Date();
		const fileInserts = patch.files.map((f, i) =>
			this.db.insert(pasteFileTable).values({
				id: `${id}:${f.path}`,
				pasteId: id,
				path: f.path,
				content: f.content,
				position: i,
			}),
		);

		const [updated] = await this.db.batch([
			this.db
				.update(pasteTable)
				.set({
					content: mirror,
					entryPath: patch.entryPath,
					title: patch.title,
					visibility: patch.visibility,
					updatedAt: now,
				})
				.where(eq(pasteTable.id, id))
				.returning(),
			this.db.delete(pasteFileTable).where(eq(pasteFileTable.pasteId, id)),
			...fileInserts,
		]);

		const row = updated[0];
		if (!row) throw new PasteNotFoundError(id);
		return toPaste(
			row,
			patch.files.map((f, i) => ({
				id: `${id}:${f.path}`,
				pasteId: id,
				path: f.path,
				content: f.content,
				position: i,
			})),
		);
	}

	async delete(id: string): Promise<void> {
		await this.db.batch([
			this.db.delete(pasteFileTable).where(eq(pasteFileTable.pasteId, id)),
			this.db.delete(pasteTable).where(eq(pasteTable.id, id)),
		]);
	}
}
