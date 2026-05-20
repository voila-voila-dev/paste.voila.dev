import { Button } from "@paste.voila.dev/ui/components/button";
import { Textarea } from "@paste.voila.dev/ui/components/textarea";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { createPaste, listRecentPastes } from "../server/pastes.ts";

export const Route = createFileRoute("/")({
	loader: () => listRecentPastes(),
	component: NewPaste,
});

function extractTitle(content: string): string {
	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		return trimmed.replace(/^#+\s*/, "").slice(0, 80);
	}
	return "(empty paste)";
}

function timeAgo(date: Date): string {
	const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
	if (sec < 60) return `${sec}s ago`;
	if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
	if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
	return `${Math.floor(sec / 86400)}d ago`;
}

function NewPaste() {
	const router = useRouter();
	const recent = Route.useLoaderData();
	const [content, setContent] = useState("");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!content.trim()) return;
		setPending(true);
		setError(null);
		try {
			const paste = await createPaste({ data: { content } });
			router.navigate({ to: "/$id/edit", params: { id: paste.id }, hash: `tk=${paste.editToken}` });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create paste");
			setPending(false);
		}
	}

	return (
		<div className="mx-auto max-w-4xl p-6">
			<header className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-semibold">paste.voila.dev</h1>
				<p className="text-sm text-muted-foreground">markdown pastebin · no auth</p>
			</header>
			<form onSubmit={onSubmit} className="space-y-4">
				<Textarea
					value={content}
					onChange={(e) => setContent(e.target.value)}
					placeholder="# Paste your markdown here..."
					className="min-h-[40vh] font-mono text-sm"
					autoFocus
				/>
				<div className="flex items-center justify-between">
					<span className="text-xs text-muted-foreground">
						{error ?? `${content.length} chars`}
					</span>
					<Button type="submit" disabled={pending || !content.trim()}>
						{pending ? "Creating…" : "Create paste"}
					</Button>
				</div>
			</form>

			<section className="mt-12">
				<h2 className="mb-3 text-sm font-semibold text-muted-foreground">Recent pastes</h2>
				{recent.length === 0 ? (
					<p className="text-sm text-muted-foreground">No pastes yet — be the first.</p>
				) : (
					<ul className="divide-y rounded-md border">
						{recent.map((p) => (
							<li key={p.id}>
								<Link
									to="/$id"
									params={{ id: p.id }}
									className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent"
								>
									<span className="truncate font-medium">{extractTitle(p.content)}</span>
									<span className="ml-4 shrink-0 text-xs text-muted-foreground">
										{timeAgo(p.createdAt)}
									</span>
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
