import { describe, expect, it } from "bun:test";
import { Author, Reading, User } from "../index";
import { DateTime } from "../../utils/date";
import type { EntityId } from "../../schemas";

describe("Shared Kernel Domain Entities", () => {
  it("should create and access Author properties", () => {
    const createdAt = DateTime.from("2026-01-01T00:00:00.000Z");
    const authorId = "a0000000-0000-4000-8000-000000000001" as EntityId;
    const author = new Author({
      id: authorId,
      name: "Marcus Aurelius",
      bio: "Stoic philosopher and Roman emperor",
      createdAt,
    });

    expect(author.id).toBe(authorId);
    expect(author.name).toBe("Marcus Aurelius");
    expect(author.bio).toBe("Stoic philosopher and Roman emperor");
    expect(author.createdAt.equals(createdAt)).toBe(true);
  });

  it("should reject creating Author with invalid or empty name", () => {
    const createdAt = DateTime.now();
    const authorId = "a0000000-0000-4000-8000-000000000001" as EntityId;
    expect(
      () =>
        new Author({
          id: authorId,
          name: "   ",
          createdAt,
        }),
    ).toThrow();
  });

  it("should create and access Reading properties and methods", () => {
    const now = DateTime.now();
    const readingId = "b0000000-0000-4000-8000-000000000001" as EntityId;
    const authorId = "a0000000-0000-4000-8000-000000000001" as EntityId;
    const reading = new Reading({
      id: readingId,
      authorId,
      createdAt: now,
      readDates: [now],
      translations: {
        es: { title: "Meditación matutina", content: "Respira hondo..." },
        en: { title: "Morning meditation", content: "Breathe deeply..." },
      },
    });

    expect(reading.id).toBe(readingId);
    expect(reading.authorId).toBe(authorId);
    expect(reading.getTranslation("es")?.title).toBe("Meditación matutina");
    expect(reading.getTranslation("en")?.title).toBe("Morning meditation");
    expect(reading.isCompletedToday()).toBe(true);
  });

  it("should reject creating Reading with invalid translation or missing author", () => {
    const readingId = "b0000000-0000-4000-8000-000000000001" as EntityId;
    const authorId = "a0000000-0000-4000-8000-000000000001" as EntityId;
    expect(
      () =>
        new Reading({
          id: readingId,
          authorId,
          createdAt: DateTime.now(),
          readDates: [],
          translations: {
            es: { title: "", content: "" },
          },
        }),
    ).toThrow();
  });

  it("should create and access User properties", () => {
    const user = new User({
      id: "550e8400-e29b-41d4-a716-446655440000" as EntityId,
      name: "Test User",
      email: "test@example.com",
      avatarUrl: "https://example.com/avatar.png",
      createdAt: DateTime.now(),
    });

    expect(user.id).toBe("550e8400-e29b-41d4-a716-446655440000" as EntityId);
    expect(user.name).toBe("Test User");
    expect(user.email).toBe("test@example.com");
    expect(user.avatarUrl).toBe("https://example.com/avatar.png");
  });

  it("should reject creating User with invalid email", () => {
    expect(
      () =>
        new User({
          id: "550e8400-e29b-41d4-a716-446655440000" as EntityId,
          name: "Invalid User",
          email: "not-an-email",
          createdAt: DateTime.now(),
        }),
    ).toThrow();
  });
});
