import type { ReactNode } from "react";

export function Section({ children }: { children: ReactNode }) {
	return <section className="mt-10">{children}</section>;
}

export function SectionHeader({ title, trailing }: { title: string; trailing?: ReactNode }) {
	return (
		<div className="mb-3 flex items-baseline justify-between">
			<h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
			{trailing != null && (
				<span className="text-xs text-muted-foreground/70">{trailing}</span>
			)}
		</div>
	);
}

export function SectionNote({ children }: { children: ReactNode }) {
	return <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/70">{children}</p>;
}
