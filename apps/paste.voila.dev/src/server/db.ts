import { createDatabase } from "@paste.voila.dev/architecture/repositories/drizzle/client";
import { DrizzlePasteRepository } from "@paste.voila.dev/architecture/repositories/drizzle/paste-repository";
import { env } from "cloudflare:workers";

export function getPasteRepository(): DrizzlePasteRepository {
	const db = createDatabase(env.DB);
	return new DrizzlePasteRepository(db);
}
