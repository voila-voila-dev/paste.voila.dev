import type { PasteSummary } from "@paste.voila.dev/domain/paste";
import { Link } from "@tanstack/react-router";
import { extractTitle, timeAgo } from "../../lib/format.ts";
import { Section, SectionHeader } from "./section.tsx";

export function RecentPastes({ pastes }: { pastes: PasteSummary[] }) {
	return (
		<Section>
			<SectionHeader title="Recent pastes" />
			{pastes.length === 0 ? (
				<p className="text-sm text-muted-foreground">No pastes yet — be the first.</p>
			) : (
				<ul className="divide-y rounded-md border">
					{pastes.map((p) => (
						<RecentPasteRow
							key={p.id}
							id={p.id}
							title={p.title}
							content={p.content}
							fileCount={p.fileCount}
							createdAt={p.createdAt}
						/>
					))}
				</ul>
			)}
		</Section>
	);
}

function RecentPasteRow({
	id,
	title,
	content,
	fileCount,
	createdAt,
}: {
	id: string;
	title: string | null;
	content: string;
	fileCount: number;
	createdAt: Date | string;
}) {
	return (
		<li>
			<Link
				to="/$id"
				params={{ id }}
				className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent"
			>
				<span className="truncate font-medium">{title ?? extractTitle(content)}</span>
				<span className="ml-4 flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
					{fileCount > 1 && <span>{fileCount} files</span>}
					{timeAgo(createdAt)}
				</span>
			</Link>
		</li>
	);
}
