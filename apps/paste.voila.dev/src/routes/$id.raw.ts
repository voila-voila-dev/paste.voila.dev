import { createFileRoute } from "@tanstack/react-router";
import { getPasteRepository } from "../server/db.ts";

export const Route = createFileRoute("/$id/raw")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const paste = await getPasteRepository().findById(params.id);
				if (!paste) return new Response("Not found", { status: 404 });
				return new Response(paste.content, {
					headers: {
						"content-type": "text/markdown; charset=utf-8",
						"cache-control": "public, max-age=60",
					},
				});
			},
		},
	},
});
