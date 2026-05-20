import type { Visibility } from "@paste.voila.dev/domain/paste";
import { Button } from "@paste.voila.dev/ui/components/button";
import { Input } from "@paste.voila.dev/ui/components/input";
import { Textarea } from "@paste.voila.dev/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { renderMarkdown } from "../lib/markdown.ts";
import { forgetPaste, rememberPaste } from "../lib/local-pastes.ts";
import { VisibilityToggle } from "./-home/visibility-toggle.tsx";
import { deletePaste, getPaste, updatePaste } from "../server/pastes.ts";

export const Route = createFileRoute("/$id/edit")({
	loader: async ({ params }) => {
		const paste = await getPaste({ data: { id: params.id } });
		return {
			id: paste.id,
			content: paste.content,
			title: paste.title,
			visibility: paste.visibility,
		};
	},
	head: ({ params }) => ({ meta: [{ title: `edit · ${params.id.slice(0, 8)}` }] }),
	component: EditPaste,
});

type FormValues = {
	content: string;
	title: string;
	visibility: Visibility;
};

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
	const data = Route.useLoaderData();
	const [token, setToken] = useState("");
	const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const [showShare, setShowShare] = useState(false);

	useEffect(() => {
		setToken(readTokenFromHash());
	}, []);

	const form = useForm({
		defaultValues: {
			content: data.content,
			title: data.title ?? "",
			visibility: data.visibility,
		} satisfies FormValues,
		onSubmit: async ({ value }) => {
			if (!token) {
				setStatus("error");
				return;
			}
			setStatus("saving");
			try {
				const saved = await updatePaste({
					data: {
						id: data.id,
						editToken: token,
						content: value.content,
						title: value.title || null,
						visibility: value.visibility,
					},
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
		},
	});

	async function doDelete() {
		if (!token) return;
		try {
			await deletePaste({ data: { id: data.id, editToken: token } });
			forgetPaste(data.id);
			router.navigate({ to: "/" });
		} catch {
			setStatus("error");
		}
	}

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === "s") {
				e.preventDefault();
				void form.handleSubmit();
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	const viewUrl =
		typeof window !== "undefined" ? `${window.location.origin}/${data.id}` : `/${data.id}`;
	const editUrl = `${viewUrl}/edit#tk=${token}`;

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				void form.handleSubmit();
			}}
			className="flex h-screen flex-col"
		>
			<header className="flex items-center justify-between border-b px-4 py-2">
				<div className="flex items-center gap-4">
					<Link to="/" className="text-sm font-semibold hover:underline">
						← paste.voila.dev
					</Link>
					<span className="text-xs text-muted-foreground">editing {data.id.slice(0, 8)}</span>
				</div>
				<div className="flex items-center gap-2">
					<form.Subscribe selector={(s) => s.isSubmitting}>
						{(isSubmitting) => (
							<span className="text-xs text-muted-foreground">
								{isSubmitting && "saving…"}
								{!isSubmitting && status === "saved" && "saved"}
								{!isSubmitting && status === "error" && !token && "missing edit token"}
								{!isSubmitting && status === "error" && token && "operation failed"}
							</span>
						)}
					</form.Subscribe>
					<Button type="button" size="sm" variant="ghost" onClick={() => setShowShare((s) => !s)}>
						Share
					</Button>
					<Link
						to="/$id"
						params={{ id: data.id }}
						className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium hover:bg-accent"
					>
						View
					</Link>
					<form.Subscribe selector={(s) => s.isSubmitting}>
						{(isSubmitting) => (
							<Button type="submit" size="sm" disabled={!token || isSubmitting}>
								Save
							</Button>
						)}
					</form.Subscribe>
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

			<div className="flex items-center gap-3 border-b bg-background px-4 py-2">
				<form.Field name="title">
					{(field) => (
						<Input
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="Title (optional)"
							maxLength={120}
							className="h-8 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
						/>
					)}
				</form.Field>
				<form.Field name="visibility">
					{(field) => (
						<VisibilityToggle value={field.state.value} onChange={field.handleChange} />
					)}
				</form.Field>
			</div>

			<div className="grid flex-1 grid-cols-2 overflow-hidden">
				<form.Field name="content">
					{(field) => (
						<Textarea
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							className="h-full resize-none rounded-none border-0 border-r font-mono text-sm focus-visible:ring-0"
						/>
					)}
				</form.Field>
				<form.Subscribe selector={(s) => s.values.content}>
					{(content) => (
						<article
							className="prose prose-neutral dark:prose-invert max-w-none overflow-auto p-6"
							// biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized
							dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
						/>
					)}
				</form.Subscribe>
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
		</form>
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
			<Button type="button" size="sm" variant="ghost" onClick={copy}>
				{copied ? "Copied" : "Copy"}
			</Button>
		</div>
	);
}
