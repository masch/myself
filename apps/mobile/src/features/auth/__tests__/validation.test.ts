import { describe, expect, it } from "bun:test";
import {
  validateSignInForm,
  validateSignUpForm,
  type AuthFormErrors,
  type ValidationResult,
} from "../validation";

function errorsOf(result: ValidationResult<unknown>): AuthFormErrors {
  if (result.ok) throw new Error("expected the form to be rejected");
  return result.errors;
}

describe("auth form validation (S13)", () => {
  describe("sign up", () => {
    it("reuses the shared user schema for the name and the email", () => {
      const errors = errorsOf(
        validateSignUpForm({
          name: "   ",
          email: "not-an-email",
          password: "a-long-password",
        }),
      );

      // Messages come from `userNameAndEmailSchema`, not from a second copy here.
      expect(errors.name).toBe("User name is required");
      expect(errors.email).toBe("Invalid email address");
    });

    it("requires a password of at least 8 characters", () => {
      expect(
        errorsOf(
          validateSignUpForm({
            name: "My self",
            email: "myself@example.com",
            password: "short",
          }),
        ).password,
      ).toBe("Password must be at least 8 characters.");
    });

    it("reports no error for valid input and returns trimmed values", () => {
      const result = validateSignUpForm({
        name: "  My self  ",
        email: "  myself@example.com ",
        password: "a-long-password",
      });

      expect(result).toEqual({
        ok: true,
        values: {
          name: "My self",
          email: "myself@example.com",
          password: "a-long-password",
        },
      });
    });
  });

  describe("sign in", () => {
    it("rejects a malformed email without asking for a name", () => {
      const result = validateSignInForm({
        email: "not-an-email",
        password: "a-long-password",
      });

      expect(result.ok).toBe(false);
      expect(errorsOf(result)).toEqual({
        email: "Invalid email address",
      });
    });

    it("requires a password, and does not re-apply the sign-up length rule", () => {
      expect(
        errorsOf(
          validateSignInForm({ email: "myself@example.com", password: "  " }),
        ),
      ).toEqual({ password: "Password is required" });

      expect(
        validateSignInForm({ email: "myself@example.com", password: "old" }),
      ).toEqual({
        ok: true,
        values: { email: "myself@example.com", password: "old" },
      });
    });
  });
});
