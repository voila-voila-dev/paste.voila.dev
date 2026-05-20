import type { Visibility } from "@paste.voila.dev/domain/paste";
import { Button } from "@paste.voila.dev/ui/components/button";
import { Input } from "@paste.voila.dev/ui/components/input";
import { Textarea } from "@paste.voila.dev/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "@tanstack/react-router";
import { useRef } from "react";
import { detectH1, extractTitle } from "../../lib/format.ts";
import { rememberPaste } from "../../lib/local-pastes.ts";
import { createPaste } from "../../server/pastes.ts";
import { VisibilityToggle } from "./visibility-toggle.tsx";

type FormValues = {
	title: string;
	content: string;
	visibility: Visibility;
};

export function NewPasteForm() {
	const router = useRouter();
	const titleEditedManually = useRef(false);

	const initial: FormValues = { title: "", content: "", visibility: "public" };
	const form = useForm({
		defaultValues: initial,
		onSubmit: async ({ value, formApi }) => {
			const paste = await createPaste({
				data: {
					content: value.content,
					title: value.title || null,
					visibility: value.visibility,
				},
			});
			rememberPaste({
				id: paste.id,
				editToken: paste.editToken,
				title: paste.title ?? extractTitle(paste.content),
				createdAt: new Date(paste.createdAt).toISOString(),
			});
			formApi.reset();
			router.navigate({
				to: "/$id/edit",
				params: { id: paste.id },
				hash: `tk=${paste.editToken}`,
			});
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				void form.handleSubmit();
			}}
			className="space-y-3"
		>
			<form.Field name="title">
				{(field) => (
					<Input
						value={field.state.value}
						onChange={(e) => {
							titleEditedManually.current = true;
							field.handleChange(e.target.value);
						}}
						placeholder="Title (optional)"
						maxLength={120}
					/>
				)}
			</form.Field>

			<form.Field name="content">
				{(field) => (
					<Textarea
						value={field.state.value}
						onChange={(e) => {
							field.handleChange(e.target.value);
							if (!titleEditedManually.current) {
								form.setFieldValue("title", detectH1(e.target.value) ?? "");
							}
						}}
						placeholder="# Paste your markdown here..."
						className="min-h-[40vh] font-mono text-sm"
						autoFocus
					/>
				)}
			</form.Field>

			<form.Subscribe
				selector={(state) => [state.values.content, state.isSubmitting, state.errorMap] as const}
			>
				{([content, isSubmitting, errorMap]) => {
					const errorEntries = Object.values(errorMap).filter(Boolean);
					return (
						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-3 text-xs text-muted-foreground">
								<span>
									{errorEntries.length > 0 ? String(errorEntries[0]) : `${content.length} chars`}
								</span>
								<form.Field name="visibility">
									{(field) => (
										<VisibilityToggle
											value={field.state.value}
											onChange={field.handleChange}
										/>
									)}
								</form.Field>
							</div>
							<Button type="submit" disabled={isSubmitting || !content.trim()}>
								{isSubmitting ? "Creating…" : "Create paste"}
							</Button>
						</div>
					);
				}}
			</form.Subscribe>
		</form>
	);
}
