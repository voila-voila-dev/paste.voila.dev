import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const pasteTable = sqliteTable("pastes", {
	id: text("id").primaryKey(),
	content: text("content").notNull(),
	editToken: text("edit_token").notNull(),
	title: text("title"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export type PasteRow = typeof pasteTable.$inferSelect;
export type PasteInsert = typeof pasteTable.$inferInsert;
