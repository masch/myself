CREATE TABLE `authors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`bio` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `authors_name_unique` ON `authors` (`name`);--> statement-breakpoint
CREATE TABLE `meditation_reading_translations` (
	`reading_id` text NOT NULL,
	`locale` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	PRIMARY KEY(`reading_id`, `locale`),
	FOREIGN KEY (`reading_id`) REFERENCES `meditation_readings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `meditation_readings` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `authors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reading_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`reading_id` text NOT NULL,
	`read_at` text NOT NULL,
	FOREIGN KEY (`reading_id`) REFERENCES `meditation_readings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`avatar_url` text,
	`created_at` text NOT NULL,
	CONSTRAINT "users_name_not_empty" CHECK(length(trim("name")) > 0),
	CONSTRAINT "users_email_not_empty" CHECK(length(trim("email")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);