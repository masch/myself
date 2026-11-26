import { z } from "zod";
import { userNameAndEmailSchema } from "@myself/shared";

/**
 * Form validation for the auth surfaces (S13).
 *
 * The name and the email rules are not restated here: they belong to the shared user
 * schema that the API hooks and the device insert already enforce, so a form cannot
 * accept an identity the server (or the local `user` table) would reject. The password
 * rules mirror the server's Better Auth defaults — 8 to 128 characters — and exist on
 * the client only to fail fast, never as the authority.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export type AuthFormField = "name" | "email" | "password";

export type AuthFormErrors = Partial<Record<AuthFormField, string>>;

export type ValidationResult<T> =
  { ok: true; values: T } | { ok: false; errors: AuthFormErrors };

export interface SignInFormValues {
  email: string;
  password: string;
}

export interface SignUpFormValues extends SignInFormValues {
  name: string;
}

export interface ForgotPasswordFormValues {
  email: string;
}

export interface NewPasswordFormValues {
  password: string;
}

/** Passwords are never trimmed: the leading/trailing spaces are part of the secret. */
const signUpPasswordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  )
  .max(
    PASSWORD_MAX_LENGTH,
    `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
  );

const signInPasswordSchema = z
  .string()
  .refine((value) => value.trim().length > 0, "Password is required");

const signUpSchema = userNameAndEmailSchema.extend({
  password: signUpPasswordSchema,
});

const signInSchema = userNameAndEmailSchema
  .pick({ email: true })
  .extend({ password: signInPasswordSchema });

/** The forgot-password form asks for the address only; the rule is the shared one. */
const forgotPasswordSchema = userNameAndEmailSchema.pick({ email: true });

/**
 * The new password of a reset (S13).
 *
 * The same rule as sign-up, and not a looser one: a reset is the only way back into an
 * account, so it must not be able to set something sign-up would have refused. The server
 * re-applies its own 8..128 limit, so this is a fail-fast copy, never the authority.
 */
const newPasswordSchema = z.object({ password: signUpPasswordSchema });

function toErrors(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): AuthFormErrors {
  const errors: AuthFormErrors = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (field === "name" || field === "email" || field === "password") {
      errors[field] ??= issue.message;
    }
  }
  return errors;
}

export function validateSignUpForm(
  values: SignUpFormValues,
): ValidationResult<SignUpFormValues> {
  const parsed = signUpSchema.safeParse(values);
  if (!parsed.success)
    return { ok: false, errors: toErrors(parsed.error.issues) };

  return {
    ok: true,
    values: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
    },
  };
}

export function validateSignInForm(
  values: SignInFormValues,
): ValidationResult<SignInFormValues> {
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success)
    return { ok: false, errors: toErrors(parsed.error.issues) };

  return {
    ok: true,
    values: { email: parsed.data.email, password: parsed.data.password },
  };
}

export function validateForgotPasswordForm(
  values: ForgotPasswordFormValues,
): ValidationResult<ForgotPasswordFormValues> {
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success)
    return { ok: false, errors: toErrors(parsed.error.issues) };

  return { ok: true, values: { email: parsed.data.email } };
}

export function validateNewPasswordForm(
  values: NewPasswordFormValues,
): ValidationResult<NewPasswordFormValues> {
  const parsed = newPasswordSchema.safeParse(values);
  if (!parsed.success)
    return { ok: false, errors: toErrors(parsed.error.issues) };

  return { ok: true, values: { password: parsed.data.password } };
}
