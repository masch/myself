import { beforeEach, describe, expect, it } from "bun:test";
import { AuthorService } from "../author.service";
import { DrizzleAuthorRepository } from "../../repositories/drizzle/drizzle-author.repository";
import { createTestDatabase } from "../../db/test-db";

describe("AuthorService Domain Application Service Unit Tests", () => {
  let repo: DrizzleAuthorRepository;
  let service: AuthorService;

  beforeEach(async () => {
    const db = await createTestDatabase({ seed: false });
    repo = new DrizzleAuthorRepository(db);
    service = new AuthorService(repo);
  });

  it("creates an author with generated UUID, ISO timestamp, and trimmed fields", async () => {
    const author = await service.create({
      name: "  Seneca The Younger  ",
      bio: "  Stoic philosopher  ",
    });

    expect(author.id).toBeDefined();
    expect(author.name).toBe("Seneca The Younger");
    expect(author.bio).toBe("Stoic philosopher");
    expect(author.createdAt).toBeDefined();
    expect(author.createdAt.toISOString()).toBeDefined();

    const stored = await service.findById(author.id);
    expect(stored).toEqual(author);

    const storedByName = await service.findByName("Seneca The Younger");
    expect(storedByName).toEqual(author);
  });

  it("handles optional bio gracefully when omitted or blank", async () => {
    const author = await service.create({
      name: "Chrysippus",
      bio: "   ",
    });

    expect(author.name).toBe("Chrysippus");
    expect(author.bio).toBeUndefined();
  });

  it("lists authors with pagination through service", async () => {
    await service.create({ name: "Author 1" });
    await service.create({ name: "Author 2" });

    const result = await service.list({ limit: 1, offset: 0 });
    expect(result.items.length).toBe(1);
    expect(result.total).toBe(2);
  });
});
