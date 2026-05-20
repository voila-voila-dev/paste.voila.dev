import { Link } from "@tanstack/react-router";
import { timeAgo } from "../../lib/format.ts";
import { type LocalPaste, useLocalPastes } from "../../lib/local-pastes.ts";
import { Section, SectionHeader, SectionNote } from "./section.tsx";

export function YourPastes() {
	const mine = useLocalPastes();
	if (mine.length === 0) return null;

	return (
		<Section>
			<SectionHeader title="Your pastes" trailing={mine.length} />
			<ul className="divide-y rounded-md border">
				{mine.map((p) => (
					<YourPasteRow key={p.id} paste={p} />
				))}
			</ul>
			<SectionNote>
				Stored only in this browser's local storage. Clear your browser data and these links are
				gone — copy the edit URL somewhere safe if you want to come back to it later.
			</SectionNote>
		</Section>
	);
}

function YourPasteRow({ paste }: { paste: LocalPaste }) {
	return (
		<li className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent">
			<Link
				to="/$id/edit"
				params={{ id: paste.id }}
				hash={`tk=${paste.editToken}`}
				className="flex-1 truncate font-medium"
			>
				{paste.title}
			</Link>
			<div className="ml-4 flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
				<Link to="/$id" params={{ id: paste.id }} className="hover:underline">
					view
				</Link>
				<span>{timeAgo(paste.createdAt)}</span>
			</div>
		</li>
	);
}
