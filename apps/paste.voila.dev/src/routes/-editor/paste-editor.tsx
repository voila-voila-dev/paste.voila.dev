import type { Visibility } from "@paste.voila.dev/domain/paste";
import { isValidPath, normalizePath } from "@paste.voila.dev/domain/paths";
import { Button } from "@paste.voila.dev/ui/components/button";
import { Input } from "@paste.voila.dev/ui/components/input";
import { Textarea } from "@paste.voila.dev/ui/components/textarea";
import { Plus, Star, TrashSimple } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { detectH1 } from "../../lib/format.ts";
import { renderMarkdown } from "../../lib/markdown.ts";
import { VisibilityToggle } from "../-home/visibility-toggle.tsx";
import { FileTree } from "./file-tree.tsx";

export type EditorFile = { path: string; content: string };
export type EditorSnapshot = {
	files: EditorFile[];
	entryPath: string;
	title: string;
	visibility: Visibility;
};

export function PasteEditor({
	mode,
	pasteId,
	initial,
	onSave,
}: {
	mode: "create" | "edit";
	pasteId?: string;
	initial: EditorSnapshot;
	onSave: (snapshot: EditorSnapshot) => Promise<void>;
}) {
	const [files, setFiles] = useState<EditorFile[]>(initial.files);
	const [entryPath, setEntryPath] = useState(initial.entryPath);
	const [activePath, setActivePath] = useState(initial.entryPath);
	const [title, setTitle] = useState(initial.title);
	const [visibility, setVisibility] = useState<Visibility>(initial.visibility);
	const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
		"idle",
	);
	const [error, setError] = useState<string | null>(null);
	const [newPath, setNewPath] = useState("");
	const [renaming, setRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState("");
	const titleEdited = useRef(mode === "edit" && initial.title.length > 0);

	const paths = files.map((f) => f.path);
	const active = files.find((f) => f.path === activePath) ?? files[0];

	function updateActiveContent(content: string) {
		setFiles((prev) =>
			prev.map((f) => (f.path === activePath ? { ...f, content } : f)),
		);
		if (activePath === entryPath && !titleEdited.current) {
			setTitle(detectH1(content) ?? "");
		}
		setStatus("idle");
	}

	function addFile() {
		const p = normalizePath(newPath);
		if (!isValidPath(p)) return setError("Invalid file path");
		if (paths.includes(p))
			return setError("A file with that path already exists");
		setFiles((prev) => [...prev, { path: p, content: "" }]);
		setActivePath(p);
		setNewPath("");
		setError(null);
	}

	function deleteActive() {
		if (files.length <= 1) return;
		const remaining = files.filter((f) => f.path !== activePath);
		setFiles(remaining);
		setActivePath(remaining[0].path);
		if (entryPath === activePath) setEntryPath(remaining[0].path);
	}

	function commitRename() {
		const p = normalizePath(renameValue);
		if (!isValidPath(p)) return setError("Invalid file path");
		if (p !== activePath && paths.includes(p)) {
			return setError("A file with that path already exists");
		}
		setFiles((prev) =>
			prev.map((f) => (f.path === activePath ? { ...f, path: p } : f)),
		);
		if (entryPath === activePath) setEntryPath(p);
		setActivePath(p);
		setRenaming(false);
		setError(null);
	}

	async function save() {
		if (files.every((f) => !f.content.trim())) {
			setStatus("error");
			setError("Add some content first.");
			return;
		}
		setStatus("saving");
		setError(null);
		try {
			await onSave({ files, entryPath, title, visibility });
			setStatus("saved");
		} catch (e) {
			setStatus("error");
			setError(e instanceof Error ? e.message : "Save failed");
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

	const previewId = pasteId ?? "preview";
	const previewHtml = renderMarkdown(active?.content ?? "", {
		pasteId: previewId,
		currentPath: activePath,
		filePaths: new Set(paths),
	});

	function onPreviewClick(e: React.MouseEvent<HTMLElement>) {
		const anchor = (e.target as HTMLElement).closest("a");
		if (!anchor) return;
		const href = anchor.getAttribute("href") ?? "";
		if (!href.startsWith(`/${previewId}?f=`)) return;
		e.preventDefault();
		const match = href.match(/[?&]f=([^&#]+)/);
		if (!match) return;
		const target = decodeURIComponent(match[1]);
		if (paths.includes(target)) setActivePath(target);
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex items-center gap-3 border-b bg-background px-4 py-2">
				<Input
					value={title}
					onChange={(e) => {
						titleEdited.current = true;
						setTitle(e.target.value);
					}}
					placeholder="Title (optional)"
					maxLength={120}
					className="h-8 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
				/>
				<VisibilityToggle value={visibility} onChange={setVisibility} />
				<span className="text-xs text-muted-foreground">
					{status === "saving" && "saving…"}
					{status === "saved" && "saved"}
					{status === "error" && (error ?? "failed")}
				</span>
				<Button
					type="button"
					size="sm"
					onClick={save}
					disabled={status === "saving"}
				>
					{mode === "create" ? "Create paste" : "Save"}
				</Button>
			</div>

			<div className="flex min-h-0 flex-1">
				<aside className="flex w-56 shrink-0 flex-col border-r bg-muted/20">
					<div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
						Files
					</div>
					<div className="flex-1 overflow-auto">
						<FileTree
							paths={paths}
							activePath={activePath}
							entryPath={entryPath}
							onSelect={(p) => {
								setActivePath(p);
								setRenaming(false);
							}}
						/>
					</div>
					<div className="flex items-center gap-1 border-t p-2">
						<Input
							value={newPath}
							onChange={(e) => setNewPath(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									addFile();
								}
							}}
							placeholder="path/to/file.md"
							className="h-7 text-xs"
						/>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							className="size-7 shrink-0"
							onClick={addFile}
							aria-label="Add file"
						>
							<Plus className="size-4" />
						</Button>
					</div>
				</aside>

				<div className="flex min-w-0 flex-1 flex-col">
					<div className="flex items-center gap-2 border-b bg-background px-3 py-1.5 text-xs">
						{renaming ? (
							<Input
								value={renameValue}
								autoFocus
								onChange={(e) => setRenameValue(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										commitRename();
									}
									if (e.key === "Escape") setRenaming(false);
								}}
								onBlur={commitRename}
								className="h-7 flex-1 font-mono text-xs"
							/>
						) : (
							<button
								type="button"
								className="truncate font-mono hover:underline"
								onClick={() => {
									setRenameValue(activePath);
									setRenaming(true);
								}}
								title="Rename"
							>
								{activePath}
							</button>
						)}
						<div className="ml-auto flex items-center gap-1">
							<Button
								type="button"
								size="sm"
								variant="ghost"
								className="h-7 gap-1 px-2"
								onClick={() => setEntryPath(activePath)}
								disabled={activePath === entryPath}
								title="Set as home file"
							>
								<Star
									weight={activePath === entryPath ? "fill" : "regular"}
									className="size-3.5"
								/>
								{activePath === entryPath ? "Home" : "Set home"}
							</Button>
							<Button
								type="button"
								size="icon"
								variant="ghost"
								className="size-7"
								onClick={deleteActive}
								disabled={files.length <= 1}
								aria-label="Delete file"
							>
								<TrashSimple className="size-4" />
							</Button>
						</div>
					</div>

					<div className="grid min-h-0 flex-1 grid-cols-2">
						<Textarea
							value={active?.content ?? ""}
							onChange={(e) => updateActiveContent(e.target.value)}
							placeholder="# Markdown…"
							className="h-full resize-none rounded-none border-0 border-r font-mono text-sm focus-visible:ring-0"
						/>
						{/* biome-ignore lint/a11y/useKeyWithClickEvents: link interception only */}
						<article
							onClick={onPreviewClick}
							className="prose prose-neutral dark:prose-invert max-w-none overflow-auto p-6"
							// biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized
							dangerouslySetInnerHTML={{ __html: previewHtml }}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
