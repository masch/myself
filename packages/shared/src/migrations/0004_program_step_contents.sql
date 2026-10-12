CREATE TABLE IF NOT EXISTS `program_step_contents` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`video_url` text,
	`preparatory_text` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `reflection_questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `program_step_contents_question_idx` ON `program_step_contents` (`question_id`);
