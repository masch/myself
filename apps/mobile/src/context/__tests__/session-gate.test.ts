import { describe, expect, it } from "bun:test";
import { deriveSessionGate } from "../session-gate";
import type { SessionUser } from "@/infrastructure/auth/session-service";

const USER: SessionUser = {
  id: "e0000000-0000-4000-8000-000000000001",
  name: "My self",
  email: "myself@example.com",
  role: "user",
};

describe("deriveSessionGate (S13 root gate)", () => {
  it("waits while the stored session is being restored", () => {
    expect(deriveSessionGate({ isLoading: true, user: null })).toBe("loading");
    expect(deriveSessionGate({ isLoading: true, user: USER })).toBe("loading");
  });

  it("opens the authenticated tree only for a resolved session", () => {
    expect(deriveSessionGate({ isLoading: false, user: USER })).toBe(
      "authenticated",
    );
  });

  it("sends a browser with no session to the auth tree", () => {
    expect(deriveSessionGate({ isLoading: false, user: null })).toBe(
      "unauthenticated",
    );
  });
});
