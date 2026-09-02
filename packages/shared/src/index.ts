export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const APP_NAME = "myself";

/**
 * Localization & Language Types
 */
export type SupportedLocale = "es" | "en";

/**
 * User & Task Domain Entities
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface TaskItem {
  id: string;
  user_id: string;
  title: string;
  category: string;
  description: string;
  is_done: number;
  created_at: string;
}

/**
 * Author & Meditation Reading Entities
 */
export interface Author {
  id: string;
  name: string;
  bio?: string;
  created_at: string;
}

export interface MeditationReading {
  id: string;
  author_id: string;
  created_at: string;
}

export interface MeditationReadingTranslation {
  reading_id: string;
  locale: SupportedLocale;
  title: string;
  content: string;
}

export interface ReadingLog {
  id: string;
  reading_id: string;
  read_at: string;
}

export interface MeditationReadingWithAuthor extends MeditationReading {
  locale: SupportedLocale;
  title: string;
  content: string;
  author_name: string;
  author_bio?: string;
  times_read: number;
  last_read_at: string | null;
}

/**
 * Seed & Creation Input Types
 */
export interface ReadingTranslationInput {
  title: string;
  content: string;
}

export interface SeedAuthor {
  id: string;
  name: string;
  bio?: string;
}

export interface SeedTask {
  title: string;
  category: "Work" | "Personal" | "Shopping" | "Design" | "General";
  description: string;
  is_done: number;
}

export interface SeedUser {
  id: string;
  name: string;
  email: string;
  tasks: SeedTask[];
}

export interface SeedReading {
  id: string;
  author_id: string;
  createdAt: string;
  readDates: string[];
  translations: {
    es: ReadingTranslationInput;
    en?: ReadingTranslationInput;
  };
}
