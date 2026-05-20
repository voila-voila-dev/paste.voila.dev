export class PasteNotFoundError extends Error {
	readonly _tag = "PasteNotFoundError";
	constructor(public readonly id: string) {
		super(`Paste not found: ${id}`);
	}
}

export class InvalidEditTokenError extends Error {
	readonly _tag = "InvalidEditTokenError";
	constructor(public readonly id: string) {
		super(`Invalid edit token for paste: ${id}`);
	}
}

export class PasteTooLargeError extends Error {
	readonly _tag = "PasteTooLargeError";
	constructor(
		public readonly size: number,
		public readonly maxSize: number,
	) {
		super(`Paste of size ${size} exceeds max size ${maxSize}`);
	}
}
