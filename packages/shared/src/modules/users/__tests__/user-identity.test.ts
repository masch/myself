import { describe, expect, it } from "bun:test";
import { userNameAndEmailSchema } from "../contracts";

describe("userNameAndEmailSchema (S3)", () => {
  it("accepts a nonblank name and a well-formed email, trimming both", () => {
    const parsed = userNameAndEmailSchema.parse({
      name: "  Ada Lovelace  ",
      email: "  ada@example.com  ",
    });

    expect(parsed.name).toBe("Ada Lovelace");
    expect(parsed.email).toBe("ada@example.com");
  });

  it("rejects a blank name", () => {
    expect(() =>
      userNameAndEmailSchema.parse({ name: "   ", email: "ada@example.com" }),
    ).toThrow("User name is required");
  });

  it("rejects a malformed email", () => {
    expect(() =>
      userNameAndEmailSchema.parse({ name: "Ada", email: "not-an-email" }),
    ).toThrow("Invalid email address");
  });
});
