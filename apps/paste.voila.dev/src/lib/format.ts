export function extractTitle(content: string): string {
	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		return trimmed.replace(/^#+\s*/, "").slice(0, 80);
	}
	return "(empty paste)";
}

/**
 * If the first 10 lines contain a `# h1` markdown heading, return its text.
 * Used to auto-fill the title input as the user types markdown.
 */
export function detectH1(content: string): string | null {
	const lines = content.split("\n", 11).slice(0, 10);
	for (const line of lines) {
		const match = /^\s*#\s+(.+?)\s*$/.exec(line);
		if (match?.[1]) return match[1].slice(0, 120);
	}
	return null;
}

export function timeAgo(date: Date | string): string {
	const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
	if (sec < 60) return `${sec}s ago`;
	if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
	if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
	return `${Math.floor(sec / 86400)}d ago`;
}
