import { describe, expect, it } from "bun:test";
import { DateTime, type EntityId } from "@myself/shared";
import { mapUserRow } from "../mappers/user.mapper";

const DEMO_ID = "e0000000-0000-4000-8000-000000000001";

describe("mapUserRow — raw Better Auth row to domain User (D3)", () => {
  it("maps a numeric created_at and a null image into the domain shape", () => {
    const raw = {
      id: DEMO_ID,
      name: "My self",
      email: "myself@example.com",
      image: null,
      created_at: 1795565599579,
    };

    const user = mapUserRow(raw);

    expect(user.id).toBe(DEMO_ID as EntityId);
    expect(user.name).toBe("My self");
    expect(user.email).toBe("myself@example.com");
    expect(user.imageUrl).toBeNull();
    expect(user.createdAt).toBeInstanceOf(DateTime);
    expect(user.createdAt.toMillis()).toBe(raw.created_at);
  });

  it("keeps the auth image when the row carries one", () => {
    const user = mapUserRow({
      id: DEMO_ID,
      name: "My self",
      email: "myself@example.com",
      image: "https://example.com/me.png",
      created_at: 1795565599579,
    });

    expect(user.imageUrl).toBe("https://example.com/me.png");
  });
});
