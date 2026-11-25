CREATE TABLE `application_tags` (
	`application_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`application_id`, `tag_id`),
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `application_tags_tag_idx` ON `application_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_normalized_name_unique` ON `tags` (`normalized_name`);--> statement-breakpoint
ALTER TABLE `applications` ADD `city_code` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `latitude` real;--> statement-breakpoint
ALTER TABLE `applications` ADD `longitude` real;--> statement-breakpoint
ALTER TABLE `applications` ADD `work_mode` text DEFAULT 'unspecified' NOT NULL;--> statement-breakpoint
INSERT INTO `tags` (`name`, `normalized_name`, `created_at`)
SELECT 'À classer', 'à classer', CAST(strftime('%s', 'now') AS integer) * 1000
WHERE EXISTS (SELECT 1 FROM `applications`);--> statement-breakpoint
INSERT INTO `application_tags` (`application_id`, `tag_id`)
SELECT `applications`.`id`, `tags`.`id`
FROM `applications`, `tags`
WHERE `tags`.`normalized_name` = 'à classer';
