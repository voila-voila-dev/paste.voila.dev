import { Button } from "@paste.voila.dev/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { renderMarkdown } from "../lib/markdown.ts";
import { getPaste } from "../server/pastes.ts";

export const Route = createFileRoute("/$id/")({
	loader: async ({ params }) => {
		const paste = await getPaste({ data: { id: params.id } });
		const html = renderMarkdown(paste.content);
		return { id: paste.id, content: paste.content, html, updatedAt: paste.updatedAt };
	},
	head: ({ params }) => ({ meta: [{ title: `paste · ${params.id.slice(0, 8)}` }] }),
	component: ViewPaste,
});

function ViewPaste() {
	const { id, html, updatedAt } = Route.useLoaderData();

	async function copyLink() {
		await navigator.clipboard.writeText(window.location.href);
	}

	return (
		<div className="mx-auto max-w-4xl p-6">
			<header className="mb-6 flex items-center justify-between border-b pb-4">
				<Link to="/" className="text-sm font-semibold hover:underline">
					← paste.voila.dev
				</Link>
				<div className="flex items-center gap-2">
					<Button size="sm" variant="ghost" onClick={copyLink}>
						Copy link
					</Button>
					<a
						href={`/${id}/raw`}
						className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium hover:bg-accent"
					>
						Raw
					</a>
					<a
						href={`/${id}/download`}
						className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
					>
						Download .md
					</a>
				</div>
			</header>
			<article
				className="prose prose-neutral dark:prose-invert max-w-none"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by DOMPurify
				dangerouslySetInnerHTML={{ __html: html }}
			/>
			<footer className="mt-8 border-t pt-4 text-xs text-muted-foreground">
				updated {new Date(updatedAt).toLocaleString()}
			</footer>
		</div>
	);
}
