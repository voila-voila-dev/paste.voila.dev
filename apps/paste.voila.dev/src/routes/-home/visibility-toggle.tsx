import type { Visibility } from "@paste.voila.dev/domain/paste";

export function VisibilityToggle({
	value,
	onChange,
}: {
	value: Visibility;
	onChange: (v: Visibility) => void;
}) {
	const isUnlisted = value === "unlisted";
	return (
		<label className="inline-flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
			<input
				type="checkbox"
				className="size-3 accent-foreground"
				checked={isUnlisted}
				onChange={(e) => onChange(e.target.checked ? "unlisted" : "public")}
			/>
			<span>unlisted</span>
		</label>
	);
}
