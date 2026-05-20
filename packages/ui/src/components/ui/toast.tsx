import { Toast } from "@base-ui-components/react/toast";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils.ts";

export function ToastProvider({ children }: { children: React.ReactNode }) {
	return <Toast.Provider>{children}</Toast.Provider>;
}

export function ToastViewport({ className, ...props }: ComponentProps<typeof Toast.Viewport>) {
	return (
		<Toast.Viewport
			className={cn(
				"fixed bottom-4 right-4 z-50 flex w-96 max-w-[100vw] flex-col gap-2",
				className,
			)}
			{...props}
		/>
	);
}

export const ToastRoot = Toast.Root;
export const ToastTitle = Toast.Title;
export const ToastDescription = Toast.Description;
