import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { getPasteRepository } from "../server/db.ts";
import { handleMcp } from "../server/mcp.ts";

function deps() {
	return { repo: getPasteRepository(), limiter: env.CREATE_LIMITER };
}

export const Route = createFileRoute("/mcp")({
	server: {
		handlers: {
			POST: ({ request }) => handleMcp(request, deps()),
			GET: ({ request }) => handleMcp(request, deps()),
			OPTIONS: ({ request }) => handleMcp(request, deps()),
		},
	},
});
