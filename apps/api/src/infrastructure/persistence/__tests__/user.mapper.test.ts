import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { type EntityId, user } from "@myself/shared";
import { createTestDatabase } from "../test-db";
import { mapUserRow } from "../mappers/user.mapper";

describe("mapUserRow — raw Better Auth row to domain User (D3)", () => {
  it("maps the auth table row into the domain shape with a nullable image", async () => {
    const db = await createTestDatabase({ seed: false });
    const id = "e0000000-0000-4000-8000-0000000000aa";
    const createdAt = new Date("2026-11-24T23:33:19.579Z");

    await db.insert(user).values({
      id,
      name: "Demo Owner",
      email: "demo-owner@example.com",
      emailVerified: true,
      image: null,
      createdAt,
      updatedAt: createdAt,
    });

    const [row] = await db.select().from(user).where(eq(user.id, id));
    const domainUser = mapUserRow(row);

    expect(domainUser.id).toBe(id as EntityId);
    expect(domainUser.name).toBe("Demo Owner");
    expect(domainUser.email).toBe("demo-owner@example.com");
    expect(domainUser.imageUrl).toBeNull();
    expect(domainUser.createdAt.toISOString()).toBe(createdAt.toISOString());
  });
});
