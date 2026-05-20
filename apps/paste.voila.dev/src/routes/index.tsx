import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "../lib/seo.ts";
import { listRecentPastes } from "../server/pastes.ts";
import { NewPasteForm } from "./-home/new-paste-form.tsx";
import { RecentPastes } from "./-home/recent-pastes.tsx";
import { SiteHeader } from "./-home/site-header.tsx";
import { YourPastes } from "./-home/your-pastes.tsx";

export const Route = createFileRoute("/")({
	loader: () => listRecentPastes(),
	head: () => ({
		links: [{ rel: "canonical", href: SITE_URL }],
	}),
	component: HomePage,
});

function HomePage() {
	const recent = Route.useLoaderData();
	return (
		<div className="mx-auto max-w-4xl p-6">
			<SiteHeader />
			<NewPasteForm />
			<YourPastes />
			<RecentPastes pastes={recent} />
		</div>
	);
}
