import { Button } from "@paste.voila.dev/ui/components/button";
import { Input } from "@paste.voila.dev/ui/components/input";
import { Textarea } from "@paste.voila.dev/ui/components/textarea";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { renderMarkdown } from "../lib/markdown.ts";
import { forgetPaste, rememberPaste } from "../lib/local-pastes.ts";
import { deletePaste, getPaste, updatePaste } from "../server/pastes.ts";

export const Route = createFileRoute("/$id/edit")({
	loader: async ({ params }) => {
		const paste = await getPaste({ data: { id: params.id } });
		return { id: paste.id, content: paste.content, title: paste.title };
	},
	head: ({ params }) => ({ meta: [{ title: `edit · ${params.id.slice(0, 8)}` }] }),
	component: EditPaste,
});

function readTokenFromHash(): string {
	if (typeof window === "undefined") return "";
	const hash = window.location.hash.replace(/^#/, "");
	return new URLSearchParams(hash).get("tk") ?? "";
}

function extractFirstLine(content: string): string {
	for (const line of content.split("\n")) {
		const t = line.trim();
		if (t) return t.replace(/^#+\s*/, "").slice(0, 80);
	}
	return "(empty paste)";
}

function EditPaste() {
	const router = useRouter();
	const { id, content: initial, title: initialTitle } = Route.useLoaderData();
	const [content, setContent] = useState(initial);
	const [title, setTitle] = useState(initialTitle ?? "");
	const [token, setToken] = useState("");
	const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const [showShare, setShowShare] = useState(false);

	useEffect(() => {
		setToken(readTokenFromHash());
	}, []);

	const html = useMemo(() => renderMarkdown(content), [content]);

	const viewUrl = typeof window !== "undefined" ? `${window.location.origin}/${id}` : `/${id}`;
	const editUrl = `${viewUrl}/edit#tk=${token}`;

	async function save() {
		if (!token) {
			setStatus("error");
			return;
		}
		setStatus("saving");
		try {
			const saved = await updatePaste({
				data: { id, editToken: token, content, title: title || null },
			});
			rememberPaste({
				id: saved.id,
				editToken: token,
				title: saved.title ?? extractFirstLine(saved.content),
				createdAt: new Date(saved.createdAt).toISOString(),
			});
			setStatus("saved");
		} catch {
			setStatus("error");
		}
	}

	async function doDelete() {
		if (!token) return;
		try {
			await deletePaste({ data: { id, editToken: token } });
			forgetPaste(id);
			router.navigate({ to: "/" });
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
						{status === "error" && token && "operation failed"}
					</span>
					<Button size="sm" variant="ghost" onClick={() => setShowShare((s) => !s)}>
						Share
					</Button>
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

			{showShare && (
				<div className="border-b bg-muted/40 px-4 py-3 text-xs">
					<ShareRow label="Read-only URL" url={viewUrl} />
					<ShareRow label="Edit URL (keep secret)" url={editUrl} muted />
					<p className="mt-2 text-muted-foreground/80">
						Share the read-only link to publish. Share the edit link only with people who should be
						able to change this paste.
					</p>
				</div>
			)}

			<div className="border-b bg-background px-4 py-2">
				<Input
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					placeholder="Title (optional)"
					maxLength={120}
					className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
				/>
			</div>

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

			<footer className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
				<span>Cmd/Ctrl+S to save</span>
				{confirmingDelete ? (
					<div className="flex items-center gap-2">
						<span>Delete this paste?</span>
						<Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>
							Cancel
						</Button>
						<Button size="sm" variant="destructive" onClick={doDelete} disabled={!token}>
							Delete forever
						</Button>
					</div>
				) : (
					<Button
						size="sm"
						variant="ghost"
						onClick={() => setConfirmingDelete(true)}
						disabled={!token}
					>
						Delete paste
					</Button>
				)}
			</footer>
		</div>
	);
}

function ShareRow({ label, url, muted }: { label: string; url: string; muted?: boolean }) {
	const [copied, setCopied] = useState(false);
	async function copy() {
		await navigator.clipboard.writeText(url);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}
	return (
		<div className="flex items-center gap-2 py-1">
			<span className="w-44 shrink-0 text-muted-foreground">{label}</span>
			<code
				className={`flex-1 truncate rounded border bg-background px-2 py-1 ${muted ? "text-muted-foreground" : ""}`}
			>
				{url}
			</code>
			<Button size="sm" variant="ghost" onClick={copy}>
				{copied ? "Copied" : "Copy"}
			</Button>
		</div>
	);
}
