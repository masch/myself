import { beforeEach, describe, expect, it } from "bun:test";
import { UserService, UserConflictError } from "../user.service";
import { DrizzleUserRepository } from "../../repositories/drizzle/drizzle-user.repository";
import { createTestDatabase } from "../../db/test-db";

describe("UserService Domain Application Service Unit Tests", () => {
  let repo: DrizzleUserRepository;
  let service: UserService;

  beforeEach(async () => {
    const db = await createTestDatabase({ seed: false });
    repo = new DrizzleUserRepository(db);
    service = new UserService(repo);
  });

  it("creates a user with generated UUID, ISO timestamp, and normalized fields", async () => {
    const user = await service.create({
      name: "  Marcus Aurelius  ",
      email: "  MARCUS@ROME.GOV  ",
      avatarUrl: "  https://example.com/avatar.png  ",
    });

    expect(user.id).toBeDefined();
    expect(user.name).toBe("Marcus Aurelius");
    expect(user.email).toBe("marcus@rome.gov");
    expect(user.avatarUrl).toBe("https://example.com/avatar.png");
    expect(user.createdAt).toBeDefined();
    expect(user.createdAt.toISOString()).toBeDefined();

    const stored = await service.findById(user.id);
    expect(stored).toEqual(user);

    const storedByEmail = await service.findByEmail("marcus@rome.gov");
    expect(storedByEmail).toEqual(user);
  });

  it("handles optional avatarUrl when omitted or blank", async () => {
    const user = await service.create({
      name: "Epictetus",
      email: "epictetus@rome.gov",
      avatarUrl: "   ",
    });

    expect(user.avatarUrl).toBeUndefined();
  });

  it("throws UserConflictError when email is already registered", async () => {
    await service.create({
      name: "Existing Marcus",
      email: "marcus@rome.gov",
    });

    await expect(
      service.create({
        name: "Different Marcus",
        email: "MARCUS@rome.gov",
      }),
    ).rejects.toThrow(UserConflictError);
  });

  it("lists users with pagination through service", async () => {
    await service.create({ name: "User 1", email: "u1@example.com" });
    await service.create({ name: "User 2", email: "u2@example.com" });

    const result = await service.list({ limit: 1, offset: 0 });
    expect(result.items.length).toBe(1);
    expect(result.total).toBe(2);
  });
});
