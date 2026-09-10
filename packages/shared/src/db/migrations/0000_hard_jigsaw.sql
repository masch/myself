CREATE TABLE IF NOT EXISTS `authors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`bio` text,
	`created_at` text NOT NULL,
	CONSTRAINT "authors_name_not_empty" CHECK(length(trim("authors"."name")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `authors_name_unique` ON `authors` (`name`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `meditation_reading_translations` (
	`reading_id` text NOT NULL,
	`locale` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	PRIMARY KEY(`reading_id`, `locale`),
	FOREIGN KEY (`reading_id`) REFERENCES `meditation_readings`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "locale_valid" CHECK("meditation_reading_translations"."locale" IN ('es', 'en'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `meditation_readings` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `authors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `reading_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`reading_id` text NOT NULL,
	`read_at` text NOT NULL,
	FOREIGN KEY (`reading_id`) REFERENCES `meditation_readings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`avatar_url` text,
	`created_at` text NOT NULL,
	CONSTRAINT "users_name_not_empty" CHECK(length(trim("users"."name")) > 0),
	CONSTRAINT "users_email_not_empty" CHECK(length(trim("users"."email")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`description` text DEFAULT '',
	`is_done` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
