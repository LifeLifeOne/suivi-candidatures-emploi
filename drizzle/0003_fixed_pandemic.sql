CREATE TABLE `application_follow_ups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `application_follow_ups_application_idx` ON `application_follow_ups` (`application_id`);--> statement-breakpoint
CREATE INDEX `application_follow_ups_date_idx` ON `application_follow_ups` (`date`);