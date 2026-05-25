import { useEffect, useState } from "react";

const STORAGE_KEY = "paste.voila.dev:my-pastes";

export type LocalPaste = {
	id: string;
	/** Present when the user has edit rights (created it, or arrived via an edit link). */
	editToken?: string;
	title: string;
	createdAt: string;
};

function read(): LocalPaste[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function write(pastes: LocalPaste[]): void {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pastes));
	window.dispatchEvent(new Event("paste-voila:storage"));
}

export function rememberPaste(p: LocalPaste): void {
	const all = read();
	const existing = all.find((x) => x.id === p.id);
	// Merge so re-viewing a paste you own never drops its edit token.
	const merged: LocalPaste = {
		...existing,
		...p,
		editToken: p.editToken ?? existing?.editToken,
	};
	write([merged, ...all.filter((x) => x.id !== p.id)].slice(0, 100));
}

export function forgetPaste(id: string): void {
	write(read().filter((p) => p.id !== id));
}

export function getEditToken(id: string): string | undefined {
	return read().find((p) => p.id === id)?.editToken;
}

export function useLocalPastes(): LocalPaste[] {
	const [pastes, setPastes] = useState<LocalPaste[]>([]);

	useEffect(() => {
		setPastes(read());
		function refresh() {
			setPastes(read());
		}
		window.addEventListener("paste-voila:storage", refresh);
		window.addEventListener("storage", refresh);
		return () => {
			window.removeEventListener("paste-voila:storage", refresh);
			window.removeEventListener("storage", refresh);
		};
	}, []);

	return pastes;
}
