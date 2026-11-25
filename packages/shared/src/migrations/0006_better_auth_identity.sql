-- Better Auth identity replaces the legacy `users` table (S3). Every foreign key that
-- pointed at `users.id` is repointed at `user.id` (S4), and `reading_logs` gains a
-- nullable `user_id` (S12).
--
-- Two things shape this file:
--
--   1. D1 (binding decision): the local domain rows that referenced the legacy
--      `users` rows are discarded, not migrated. There are zero production users and
--      zero server-side rows, so the server loss is nil; on a device the loss is
--      intentional and accepted. The DELETEs run first, so no foreign key ever sees a
--      row that points at a dropped table.
--   2. SQLite cannot alter a foreign key, so the four referencing tables are rebuilt:
--      drop, then create with the new reference. They are emptied first, so nothing
--      is copied — which is exactly what makes the rebuild a single pass on a device
--      database that already holds data.
--
-- `reading_logs` keeps its rows and gets a NULL `user_id`: read history is shared
-- content, and deleting an identity detaches the log instead of deleting it.
DELETE FROM `user_reflection_items`;
--> statement-breakpoint
DELETE FROM `user_reflections`;
--> statement-breakpoint
DELETE FROM `user_theme_progress`;
--> statement-breakpoint
DELETE FROM `user_question_preferences`;
--> statement-breakpoint
DELETE FROM `tasks`;
--> statement-breakpoint
DROP TABLE IF EXISTS `user_reflection_items`;
--> statement-breakpoint
DROP TABLE IF EXISTS `user_reflections`;
--> statement-breakpoint
DROP TABLE IF EXISTS `user_theme_progress`;
--> statement-breakpoint
DROP TABLE IF EXISTS `user_question_preferences`;
--> statement-breakpoint
DROP TABLE IF EXISTS `tasks`;
--> statement-breakpoint
DROP TABLE IF EXISTS `users`;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`role` text,
	`banned` integer DEFAULT false,
	`ban_reason` text,
	`ban_expires` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `user_email_unique` ON `user` (`email`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`impersonated_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `session_token_unique` ON `session` (`token`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `session_userId_idx` ON `session` (`user_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `account_userId_idx` ON `account` (`user_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `verification_identifier_idx` ON `verification` (`identifier`);
--> statement-breakpoint
ALTER TABLE `reading_logs` ADD `user_id` text REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `reading_logs_user_idx` ON `reading_logs` (`user_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`description` text DEFAULT '',
	`is_done` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_question_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`question_id` text NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`is_pinned_shortcut` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `reflection_questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `user_question_preferences_user_question_idx` ON `user_question_preferences` (`user_id`,`question_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_theme_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`theme_id` text NOT NULL,
	`cohort_id` text NOT NULL,
	`cycle_run_number` integer DEFAULT 1 NOT NULL,
	`current_step` integer DEFAULT 1 NOT NULL,
	`answered_count` integer DEFAULT 0 NOT NULL,
	`skipped_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`theme_id`) REFERENCES `reflection_themes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cohort_id`) REFERENCES `theme_cohorts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_reflections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`question_id` text NOT NULL,
	`theme_id` text,
	`cycle_run_id` text,
	`status` text DEFAULT 'answered' NOT NULL,
	`content` text,
	`numeric_value` integer,
	`skip_reason` text,
	`for_date` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `reflection_questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`theme_id`) REFERENCES `reflection_themes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`cycle_run_id`) REFERENCES `user_theme_progress`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "numeric_value_range" CHECK("user_reflections"."numeric_value" IS NULL OR ("user_reflections"."numeric_value" >= 1 AND "user_reflections"."numeric_value" <= 10))
);
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
