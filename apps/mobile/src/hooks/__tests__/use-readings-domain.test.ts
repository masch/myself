import { describe, expect, it } from "bun:test";
import {
  SEED_AUTHORS,
  SEED_READINGS,
  type MeditationReadingWithAuthor,
} from "@myself/shared";

describe("Mobile Domain & Reading Model Tests", () => {
  it("SEED_READINGS items correctly map with SEED_AUTHORS", () => {
    const authorMap = new Map(SEED_AUTHORS.map((a) => [a.id, a]));

    for (const reading of SEED_READINGS) {
      const author = authorMap.get(reading.author_id);
      expect(author).toBeDefined();
      expect(author?.name).toBeDefined();

      // Verify shape compatible with MeditationReadingWithAuthor
      const joined: MeditationReadingWithAuthor = {
        id: reading.id,
        author_id: reading.author_id,
        created_at: reading.createdAt,
        locale: "es",
        title: reading.translations.es.title,
        content: reading.translations.es.content,
        author_name: author!.name,
        author_bio: author!.bio,
        times_read: reading.readDates.length,
        last_read_at: reading.readDates[reading.readDates.length - 1] ?? null,
      };

      expect(joined.id).toBe(reading.id);
      expect(joined.author_name).toBe(author!.name);
      expect(typeof joined.times_read).toBe("number");
    }
  });

  it("calculates reading statistics correctly from readDates", () => {
    const dates = ["2026-08-20 08:30:00", "2026-08-24 07:45:00"];
    const timesRead = dates.length;
    const lastReadAt = dates[dates.length - 1] ?? null;

    expect(timesRead).toBe(2);
    expect(lastReadAt).toBe("2026-08-24 07:45:00");
  });

  it("handles empty readDates gracefully with 0 times_read and null last_read_at", () => {
    const dates: string[] = [];
    const timesRead = dates.length;
    const lastReadAt = dates[dates.length - 1] ?? null;

    expect(timesRead).toBe(0);
    expect(lastReadAt).toBeNull();
  });
});
