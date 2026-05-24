import { createFileRoute } from "@tanstack/react-router";
import { getPasteRepository } from "../server/db.ts";

export const Route = createFileRoute("/$id/raw")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				const paste = await getPasteRepository().findById(params.id);
				if (!paste) return new Response("Not found", { status: 404 });
				const requested = new URL(request.url).searchParams.get("f");
				const file =
					(requested && paste.files.find((f) => f.path === requested)) ??
					paste.files.find((f) => f.path === paste.entryPath) ??
					paste.files[0];
				if (!file) return new Response("Not found", { status: 404 });
				return new Response(file.content, {
					headers: {
						"content-type": "text/markdown; charset=utf-8",
						"cache-control": "public, max-age=60",
					},
				});
			},
		},
	},
});
