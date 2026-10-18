CREATE TABLE IF NOT EXISTS `program_step_resources` (
	`id` text PRIMARY KEY NOT NULL,
	`step_content_id` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`step_content_id`) REFERENCES `program_step_contents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `program_step_resources_step_content_idx` ON `program_step_resources` (`step_content_id`);
