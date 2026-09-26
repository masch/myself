CREATE TABLE IF NOT EXISTS `reflection_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `reflection_categories_slug_unique` ON `reflection_categories` (`slug`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `reflection_themes` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '',
	`target_question_count` integer NOT NULL,
	`catch_up_window_days` integer DEFAULT 2 NOT NULL,
	`edit_window_days` integer DEFAULT 3 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `reflection_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `theme_cohorts` (
	`id` text PRIMARY KEY NOT NULL,
	`theme_id` text NOT NULL,
	`name` text NOT NULL,
	`enrollment_start_date` text NOT NULL,
	`enrollment_end_date` text NOT NULL,
	`program_start_date` text NOT NULL,
	`status` text DEFAULT 'upcoming' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`theme_id`) REFERENCES `reflection_themes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `reflection_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`theme_id` text,
	`prompt` text NOT NULL,
	`periodicity` text NOT NULL,
	`preferred_time_of_day` text,
	`response_type` text DEFAULT 'text' NOT NULL,
	`is_default_suggested` integer DEFAULT 0 NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `reflection_categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`theme_id`) REFERENCES `reflection_themes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_question_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`question_id` text NOT NULL,
	`is_enabled` integer DEFAULT 1 NOT NULL,
	`is_pinned_shortcut` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `reflection_questions`(`id`) ON UPDATE no action ON DELETE cascade
);
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
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
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
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `reflection_questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`theme_id`) REFERENCES `reflection_themes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`cycle_run_id`) REFERENCES `user_theme_progress`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "numeric_value_range" CHECK("user_reflections"."numeric_value" IS NULL OR ("user_reflections"."numeric_value" >= 1 AND "user_reflections"."numeric_value" <= 10))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `user_question_preferences_user_question_idx` ON `user_question_preferences` (`user_id`, `question_id`);

