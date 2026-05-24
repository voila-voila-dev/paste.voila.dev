import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { pasteTable } from "./paste-table.ts";

export const pasteFileTable = sqliteTable(
	"paste_files",
	{
		id: text("id").primaryKey(),
		pasteId: text("paste_id")
			.notNull()
			.references(() => pasteTable.id, { onDelete: "cascade" }),
		path: text("path").notNull(),
		content: text("content").notNull(),
		position: integer("position").notNull(),
	},
	(t) => [
		uniqueIndex("paste_files_paste_id_path_unq").on(t.pasteId, t.path),
		index("paste_files_paste_id_idx").on(t.pasteId),
	],
);

export type PasteFileRow = typeof pasteFileTable.$inferSelect;
export type PasteFileInsert = typeof pasteFileTable.$inferInsert;
