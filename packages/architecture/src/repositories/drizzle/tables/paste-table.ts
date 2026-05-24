import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const pasteTable = sqliteTable("pastes", {
	id: text("id").primaryKey(),
	content: text("content").notNull(),
	entryPath: text("entry_path"),
	editToken: text("edit_token").notNull(),
	title: text("title"),
	visibility: text("visibility", { enum: ["public", "unlisted"] })
		.notNull()
		.default("public"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export type PasteRow = typeof pasteTable.$inferSelect;
export type PasteInsert = typeof pasteTable.$inferInsert;
