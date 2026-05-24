import { createFileRoute } from "@tanstack/react-router";
import { handleGetPaste } from "../server/api.ts";
import { getPasteRepository } from "../server/db.ts";

export const Route = createFileRoute("/api/pastes/$id")({
	server: {
		handlers: {
			GET: ({ params }) => handleGetPaste(params.id, { repo: getPasteRepository() }),
		},
	},
});
