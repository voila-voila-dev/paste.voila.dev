import { GithubLogo } from "@phosphor-icons/react";

export function SiteHeader() {
	return (
		<header className="mb-6 flex items-center justify-between">
			<h1 className="text-2xl font-semibold">paste.voila.dev</h1>
			<div className="flex items-center gap-3">
				<p className="text-sm text-muted-foreground">markdown pastebin · no auth</p>
				<a
					href="https://github.com/voila-voila-dev/paste.voila.dev"
					target="_blank"
					rel="noreferrer"
					aria-label="Source on GitHub"
					title="Source on GitHub"
					className="text-muted-foreground/60 transition-colors hover:text-foreground"
				>
					<GithubLogo className="size-5" weight="fill" />
				</a>
			</div>
		</header>
	);
}
