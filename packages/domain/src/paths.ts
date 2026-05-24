export const MAX_PATH_LENGTH = 200;

/** Allowed characters per path segment: letters, digits, dot, dash, underscore, space. */
const SEGMENT_RE = /^[A-Za-z0-9._ -]+$/;

/** Canonical form for a stored file path: forward slashes, collapsed, no leading `./` or trailing `/`. */
export function normalizePath(path: string): string {
	return path
		.trim()
		.replace(/\\/g, "/")
		.replace(/\/+/g, "/")
		.replace(/^\.\//, "")
		.replace(/\/+$/, "");
}

/** A path is valid when it is a relative, non-empty, dot-segment-free path of safe segments. */
export function isValidPath(path: string): boolean {
	if (typeof path !== "string") return false;
	const p = normalizePath(path);
	if (!p || p.length > MAX_PATH_LENGTH) return false;
	if (p.startsWith("/")) return false;
	for (const seg of p.split("/")) {
		if (!seg || seg === "." || seg === "..") return false;
		if (!SEGMENT_RE.test(seg)) return false;
	}
	return true;
}

export function dirname(path: string): string {
	const i = path.lastIndexOf("/");
	return i === -1 ? "" : path.slice(0, i);
}

export function basename(path: string): string {
	const i = path.lastIndexOf("/");
	return i === -1 ? path : path.slice(i + 1);
}

/**
 * Resolve a relative link `href` against the file `fromPath` lives in, collapsing
 * `.` and `..` segments. Used to point intra-paste markdown links at the right file.
 * `href` should be a path only (strip any `#fragment`/`?query` beforehand).
 */
export function resolveRelativePath(fromPath: string, href: string): string {
	const combined = href.startsWith("/")
		? href.slice(1)
		: dirname(fromPath)
			? `${dirname(fromPath)}/${href}`
			: href;
	const segments: string[] = [];
	for (const seg of combined.split("/")) {
		if (seg === "" || seg === ".") continue;
		if (seg === "..") {
			segments.pop();
			continue;
		}
		segments.push(seg);
	}
	return segments.join("/");
}
