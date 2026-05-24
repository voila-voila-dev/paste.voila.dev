import { useRouter } from "@tanstack/react-router";
import { extractTitle } from "../../lib/format.ts";
import { rememberPaste } from "../../lib/local-pastes.ts";
import { createPaste } from "../../server/pastes.ts";
import { type EditorSnapshot, PasteEditor } from "../-editor/paste-editor.tsx";

const INITIAL: EditorSnapshot = {
	files: [{ path: "index.md", content: "" }],
	entryPath: "index.md",
	title: "",
	visibility: "public",
};

export function NewPasteForm() {
	const router = useRouter();

	async function handleSave(snapshot: EditorSnapshot) {
		const paste = await createPaste({
			data: {
				files: snapshot.files,
				entryPath: snapshot.entryPath,
				title: snapshot.title || null,
				visibility: snapshot.visibility,
			},
		});
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
	}

	return (
		<div className="mb-8 h-[60vh] overflow-hidden rounded-md border">
			<PasteEditor mode="create" initial={INITIAL} onSave={handleSave} />
		</div>
	);
}
