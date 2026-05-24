import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { handleCreatePaste } from "../server/api.ts";
import { getPasteRepository } from "../server/db.ts";

export const Route = createFileRoute("/api/pastes")({
	server: {
		handlers: {
			POST: ({ request }) =>
				handleCreatePaste(request, {
					repo: getPasteRepository(),
					limiter: env.CREATE_LIMITER,
				}),
		},
	},
});
