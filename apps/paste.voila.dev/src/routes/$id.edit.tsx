import { Button } from "@paste.voila.dev/ui/components/button";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { extractTitle } from "../lib/format.ts";
import { forgetPaste, rememberPaste } from "../lib/local-pastes.ts";
import { deletePaste, getPaste, updatePaste } from "../server/pastes.ts";
import { type EditorSnapshot, PasteEditor } from "./-editor/paste-editor.tsx";

export const Route = createFileRoute("/$id/edit")({
	loader: async ({ params }) => {
		const paste = await getPaste({ data: { id: params.id } });
		return {
			id: paste.id,
			files: paste.files,
			entryPath: paste.entryPath,
			title: paste.title,
			visibility: paste.visibility,
		};
	},
	head: ({ params }) => ({
		meta: [{ title: `edit · ${params.id.slice(0, 8)}` }],
	}),
	component: EditPaste,
});

function readTokenFromHash(): string {
	if (typeof window === "undefined") return "";
	const hash = window.location.hash.replace(/^#/, "");
	return new URLSearchParams(hash).get("tk") ?? "";
}

function EditPaste() {
	const router = useRouter();
	const data = Route.useLoaderData();
	const [token, setToken] = useState("");
	const [showShare, setShowShare] = useState(false);
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	useEffect(() => {
		setToken(readTokenFromHash());
	}, []);

	const initial: EditorSnapshot = {
		files: data.files,
		entryPath: data.entryPath,
		title: data.title ?? "",
		visibility: data.visibility,
	};

	async function handleSave(snapshot: EditorSnapshot) {
		if (!token) throw new Error("missing edit token");
		const saved = await updatePaste({
			data: {
				id: data.id,
				editToken: token,
				files: snapshot.files,
				entryPath: snapshot.entryPath,
				title: snapshot.title || null,
				visibility: snapshot.visibility,
			},
		});
		rememberPaste({
			id: saved.id,
			editToken: token,
			title: saved.title ?? extractTitle(saved.content),
			createdAt: new Date(saved.createdAt).toISOString(),
		});
	}

	async function doDelete() {
		if (!token) return;
		await deletePaste({ data: { id: data.id, editToken: token } });
		forgetPaste(data.id);
		router.navigate({ to: "/" });
	}

	const viewUrl =
		typeof window !== "undefined"
			? `${window.location.origin}/${data.id}`
			: `/${data.id}`;
	const editUrl = `${viewUrl}/edit#tk=${token}`;

	return (
		<div className="flex h-screen flex-col">
			<header className="flex items-center justify-between border-b px-4 py-2">
				<div className="flex items-center gap-4">
					<Link to="/" className="text-sm font-semibold hover:underline">
						← paste.voila.dev
					</Link>
					<span className="text-xs text-muted-foreground">
						editing {data.id.slice(0, 8)}
					</span>
					{!token && (
						<span className="text-xs text-destructive">missing edit token</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						size="sm"
						variant="ghost"
						onClick={() => setShowShare((s) => !s)}
					>
						Share
					</Button>
					<Link
						to="/$id"
						params={{ id: data.id }}
						className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium hover:bg-accent"
					>
						View
					</Link>
				</div>
			</header>

			{showShare && (
				<div className="border-b bg-muted/40 px-4 py-3 text-xs">
					<ShareRow label="Read-only URL" url={viewUrl} />
					<ShareRow label="Edit URL (keep secret)" url={editUrl} muted />
					<p className="mt-2 text-muted-foreground/80">
						Share the read-only link to publish. Share the edit link only with
						people who should be able to change this paste.
					</p>
				</div>
			)}

			<div className="min-h-0 flex-1">
				<PasteEditor
					mode="edit"
					pasteId={data.id}
					initial={initial}
					onSave={handleSave}
				/>
			</div>

			<footer className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
				<span>Cmd/Ctrl+S to save</span>
				{confirmingDelete ? (
					<div className="flex items-center gap-2">
						<span>Delete this paste?</span>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={() => setConfirmingDelete(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							size="sm"
							variant="destructive"
							onClick={doDelete}
							disabled={!token}
						>
							Delete forever
						</Button>
					</div>
				) : (
					<Button
						type="button"
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

function ShareRow({
	label,
	url,
	muted,
}: {
	label: string;
	url: string;
	muted?: boolean;
}) {
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
			<Button type="button" size="sm" variant="ghost" onClick={copy}>
				{copied ? "Copied" : "Copy"}
			</Button>
		</div>
	);
}
