CREATE TABLE `pastes` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`edit_token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
