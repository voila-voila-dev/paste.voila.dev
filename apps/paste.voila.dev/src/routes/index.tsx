import { Button } from "@paste.voila.dev/ui/components/button";
import { Textarea } from "@paste.voila.dev/ui/components/textarea";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { createPaste } from "../server/pastes.ts";

export const Route = createFileRoute("/")({ component: NewPaste });

function NewPaste() {
	const router = useRouter();
	const [content, setContent] = useState("");
	const [pending, setPending] = useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!content.trim()) return;
		setPending(true);
		try {
			const paste = await createPaste({ data: { content } });
			router.navigate({ to: "/$id/edit", params: { id: paste.id }, hash: `tk=${paste.editToken}` });
		} finally {
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
					className="min-h-[60vh] font-mono text-sm"
					autoFocus
				/>
				<div className="flex items-center justify-between">
					<span className="text-xs text-muted-foreground">{content.length} chars</span>
					<Button type="submit" disabled={pending || !content.trim()}>
						{pending ? "Creating…" : "Create paste"}
					</Button>
				</div>
			</form>
		</div>
	);
}
