import { Button } from "@paste.voila.dev/ui/components/button";
import { Input } from "@paste.voila.dev/ui/components/input";
import { Textarea } from "@paste.voila.dev/ui/components/textarea";
import { useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { detectH1, extractTitle } from "../../lib/format.ts";
import { rememberPaste } from "../../lib/local-pastes.ts";
import { createPaste } from "../../server/pastes.ts";

export function NewPasteForm() {
	const router = useRouter();
	const [content, setContent] = useState("");
	const [title, setTitle] = useState("");
	const titleEditedManually = useRef(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function onContentChange(value: string) {
		setContent(value);
		if (!titleEditedManually.current) {
			setTitle(detectH1(value) ?? "");
		}
	}

	function onTitleChange(value: string) {
		titleEditedManually.current = true;
		setTitle(value);
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!content.trim()) return;
		setPending(true);
		setError(null);
		try {
			const paste = await createPaste({ data: { content, title: title || null } });
			rememberPaste({
				id: paste.id,
				editToken: paste.editToken,
				title: paste.title ?? extractTitle(paste.content),
				createdAt: new Date(paste.createdAt).toISOString(),
			});
			router.navigate({
				to: "/$id/edit",
				params: { id: paste.id },
				hash: `tk=${paste.editToken}`,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create paste");
			setPending(false);
		}
	}

	return (
		<form onSubmit={onSubmit} className="space-y-3">
			<Input
				value={title}
				onChange={(e) => onTitleChange(e.target.value)}
				placeholder="Title (optional)"
				maxLength={120}
			/>
			<Textarea
				value={content}
				onChange={(e) => onContentChange(e.target.value)}
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
	);
}
