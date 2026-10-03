ALTER TABLE `reflection_questions` ADD `config` text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_reflection_items` (
	`id` text PRIMARY KEY NOT NULL,
	`reflection_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`reflection_id`) REFERENCES `user_reflections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_reflection_items_reflection_idx` ON `user_reflection_items` (`reflection_id`);
