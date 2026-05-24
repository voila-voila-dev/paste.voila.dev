CREATE TABLE `paste_files` (
	`id` text PRIMARY KEY NOT NULL,
	`paste_id` text NOT NULL,
	`path` text NOT NULL,
	`content` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`paste_id`) REFERENCES `pastes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `paste_files_paste_id_path_unq` ON `paste_files` (`paste_id`,`path`);--> statement-breakpoint
CREATE INDEX `paste_files_paste_id_idx` ON `paste_files` (`paste_id`);--> statement-breakpoint
ALTER TABLE `pastes` ADD `entry_path` text;--> statement-breakpoint
INSERT INTO `paste_files` (`id`, `paste_id`, `path`, `content`, `position`)
SELECT `id` || ':index.md', `id`, 'index.md', `content`, 0 FROM `pastes`;--> statement-breakpoint
UPDATE `pastes` SET `entry_path` = 'index.md';