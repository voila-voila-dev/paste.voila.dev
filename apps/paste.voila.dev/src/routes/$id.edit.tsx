import { Button } from "@paste.voila.dev/ui/components/button";
import { Textarea } from "@paste.voila.dev/ui/components/textarea";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { renderMarkdown } from "../lib/markdown.ts";
import { getPaste, updatePaste } from "../server/pastes.ts";

export const Route = createFileRoute("/$id/edit")({
	loader: async ({ params }) => {
		const paste = await getPaste({ data: { id: params.id } });
		return { id: paste.id, content: paste.content };
	},
	head: ({ params }) => ({ meta: [{ title: `edit · ${params.id.slice(0, 8)}` }] }),
	component: EditPaste,
});

function readTokenFromHash(): string {
	if (typeof window === "undefined") return "";
	const hash = window.location.hash.replace(/^#/, "");
	const params = new URLSearchParams(hash);
	return params.get("tk") ?? "";
}

function EditPaste() {
	const { id, content: initial } = Route.useLoaderData();
	const [content, setContent] = useState(initial);
	const [token, setToken] = useState("");
	const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

	useEffect(() => {
		setToken(readTokenFromHash());
	}, []);

	const html = useMemo(() => renderMarkdown(content), [content]);

	async function save() {
		if (!token) {
			setStatus("error");
			return;
		}
		setStatus("saving");
		try {
			await updatePaste({ data: { id, editToken: token, content } });
			setStatus("saved");
		} catch {
			setStatus("error");
		}
	}

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === "s") {
				e.preventDefault();
				void save();
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	return (
		<div className="flex h-screen flex-col">
			<header className="flex items-center justify-between border-b px-4 py-2">
				<div className="flex items-center gap-4">
					<Link to="/" className="text-sm font-semibold hover:underline">
						← paste.voila.dev
					</Link>
					<span className="text-xs text-muted-foreground">editing {id.slice(0, 8)}</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs text-muted-foreground">
						{status === "saved" && "saved"}
						{status === "saving" && "saving…"}
						{status === "error" && !token && "missing edit token"}
						{status === "error" && token && "save failed"}
					</span>
					<Link
						to="/$id"
						params={{ id }}
						className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium hover:bg-accent"
					>
						View
					</Link>
					<Button size="sm" onClick={save} disabled={!token || status === "saving"}>
						Save
					</Button>
				</div>
			</header>
			<div className="grid flex-1 grid-cols-2 overflow-hidden">
				<Textarea
					value={content}
					onChange={(e) => setContent(e.target.value)}
					className="h-full resize-none rounded-none border-0 border-r font-mono text-sm focus-visible:ring-0"
				/>
				<article
					className="prose prose-neutral dark:prose-invert max-w-none overflow-auto p-6"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			</div>
		</div>
	);
}
