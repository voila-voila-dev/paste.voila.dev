import { Button } from "@paste.voila.dev/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { renderMarkdown } from "../lib/markdown.ts";
import { excerpt, OG_IMAGE_URL, SITE_NAME, SITE_URL } from "../lib/seo.ts";
import { getPaste } from "../server/pastes.ts";
import { FileTree } from "./-editor/file-tree.tsx";

export const Route = createFileRoute("/$id/")({
	validateSearch: (search: Record<string, unknown>): { f?: string } => ({
		f: typeof search.f === "string" ? search.f : undefined,
	}),
	loaderDeps: ({ search }) => ({ f: search.f }),
	loader: async ({ params, deps }) => {
		const paste = await getPaste({ data: { id: params.id } });
		const paths = paste.files.map((file) => file.path);
		const activePath = deps.f && paths.includes(deps.f) ? deps.f : paste.entryPath;
		const active = paste.files.find((file) => file.path === activePath) ?? paste.files[0];
		const html = renderMarkdown(active?.content ?? "", {
			pasteId: paste.id,
			currentPath: activePath,
			filePaths: new Set(paths),
		});
		return {
			id: paste.id,
			title: paste.title,
			content: paste.content,
			html,
			paths,
			activePath,
			entryPath: paste.entryPath,
			visibility: paste.visibility,
			createdAt: paste.createdAt,
			updatedAt: paste.updatedAt,
		};
	},
	head: ({ loaderData }) => {
		if (!loaderData) return { meta: [] };
		const shortId = loaderData.id.slice(0, 8);
		const title = loaderData.title
			? `${loaderData.title} · ${SITE_NAME}`
			: `Paste ${shortId} · ${SITE_NAME}`;
		const description = excerpt(loaderData.content) || `Markdown paste on ${SITE_NAME}.`;
		const url = `${SITE_URL}/${loaderData.id}`;
		const isUnlisted = loaderData.visibility === "unlisted";
		const robots = isUnlisted ? "noindex, nofollow" : "index, follow, max-image-preview:large";
		const jsonLd = {
			"@context": "https://schema.org",
			"@type": "Article",
			headline: loaderData.title ?? `Paste ${shortId}`,
			description,
			url,
			datePublished: new Date(loaderData.createdAt).toISOString(),
			dateModified: new Date(loaderData.updatedAt).toISOString(),
			publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
		};
		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ name: "robots", content: robots },
				{ property: "og:type", content: "article" },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ property: "og:url", content: url },
				{ property: "og:image", content: OG_IMAGE_URL },
				{
					property: "article:published_time",
					content: new Date(loaderData.createdAt).toISOString(),
				},
				{
					property: "article:modified_time",
					content: new Date(loaderData.updatedAt).toISOString(),
				},
				{ name: "twitter:title", content: title },
				{ name: "twitter:description", content: description },
				{ name: "twitter:image", content: OG_IMAGE_URL },
			],
			links: isUnlisted ? [] : [{ rel: "canonical", href: url }],
			scripts: isUnlisted
				? []
				: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
		};
	},
	component: ViewPaste,
});

function ViewPaste() {
	const { id, title, html, paths, activePath, entryPath, updatedAt } = Route.useLoaderData();
	const navigate = Route.useNavigate();
	const multiFile = paths.length > 1;
	const fileSuffix = activePath === entryPath ? "" : `?f=${encodeURIComponent(activePath)}`;

	async function copyLink() {
		await navigator.clipboard.writeText(window.location.href);
	}

	return (
		<div className="mx-auto max-w-5xl p-6">
			<header className="mb-6 border-b pb-4">
				<div className="flex items-center justify-between">
					<Link to="/" className="text-sm font-semibold hover:underline">
						← paste.voila.dev
					</Link>
					<div className="flex items-center gap-2">
						<Button size="sm" variant="ghost" onClick={copyLink}>
							Copy link
						</Button>
						<a
							href={`/${id}/raw${fileSuffix}`}
							className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium hover:bg-accent"
						>
							Raw
						</a>
						<a
							href={`/${id}/download${fileSuffix}`}
							className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
						>
							Download
						</a>
					</div>
				</div>
				{title && (
					<div className="mt-3 flex items-baseline gap-2">
						<span className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
							Title
						</span>
						<h1 className="text-sm font-medium">{title}</h1>
					</div>
				)}
			</header>

			<div className={multiFile ? "flex gap-6" : ""}>
				{multiFile && (
					<aside className="w-56 shrink-0">
						<div className="sticky top-6 rounded-md border bg-muted/20 py-2">
							<div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
								Files
							</div>
							<FileTree
								paths={paths}
								activePath={activePath}
								entryPath={entryPath}
								onSelect={(p) =>
									navigate({
										to: "/$id",
										params: { id },
										search: { f: p === entryPath ? undefined : p },
									})
								}
							/>
						</div>
					</aside>
				)}
				<div className="min-w-0 flex-1">
					{multiFile && (
						<p className="mb-3 font-mono text-xs text-muted-foreground">{activePath}</p>
					)}
					<article
						className="prose prose-neutral dark:prose-invert max-w-none"
						dangerouslySetInnerHTML={{ __html: html }}
					/>
				</div>
			</div>

			<footer className="mt-8 border-t pt-4 text-xs text-muted-foreground">
				updated {new Date(updatedAt).toLocaleString()}
			</footer>
		</div>
	);
}
