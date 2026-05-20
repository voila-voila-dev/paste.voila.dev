import { PasteNotFoundError } from "@paste.voila.dev/domain/errors";
import type { Paste, PasteRepository, PasteSummary } from "@paste.voila.dev/domain/paste";
import { desc, eq } from "drizzle-orm";
import type { Database } from "./client.ts";
import { pasteTable, type PasteRow } from "./tables/paste-table.ts";

function toPaste(row: PasteRow): Paste {
	return {
		id: row.id,
		content: row.content,
		editToken: row.editToken,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export class DrizzlePasteRepository implements PasteRepository {
	constructor(private readonly db: Database) {}

	async create(paste: Paste): Promise<Paste> {
		const [row] = await this.db
			.insert(pasteTable)
			.values({
				id: paste.id,
				content: paste.content,
				editToken: paste.editToken,
				createdAt: paste.createdAt,
				updatedAt: paste.updatedAt,
			})
			.returning();
		if (!row) throw new Error("Failed to insert paste");
		return toPaste(row);
	}

	async findById(id: string): Promise<Paste | null> {
		const [row] = await this.db.select().from(pasteTable).where(eq(pasteTable.id, id)).limit(1);
		return row ? toPaste(row) : null;
	}

	async findRecent(limit: number): Promise<PasteSummary[]> {
		const rows = await this.db
			.select({
				id: pasteTable.id,
				content: pasteTable.content,
				createdAt: pasteTable.createdAt,
				updatedAt: pasteTable.updatedAt,
			})
			.from(pasteTable)
			.orderBy(desc(pasteTable.createdAt))
			.limit(limit);
		return rows;
	}

	async update(id: string, content: string): Promise<Paste> {
		const [row] = await this.db
			.update(pasteTable)
			.set({ content, updatedAt: new Date() })
			.where(eq(pasteTable.id, id))
			.returning();
		if (!row) throw new PasteNotFoundError(id);
		return toPaste(row);
	}

	async delete(id: string): Promise<void> {
		await this.db.delete(pasteTable).where(eq(pasteTable.id, id));
	}
}
