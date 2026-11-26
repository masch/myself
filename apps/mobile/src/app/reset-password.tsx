import { ResetPasswordScreen } from "@/features/auth/reset-password-screen";

/**
 * Route the reset deep link opens (S2, S13): `myself://reset-password?token=…`.
 *
 * Registered **outside** both guarded branches in the root stack on purpose. A reset link
 * is opened by a user who cannot sign in — that is the whole point — and a signed-in user
 * may receive one too, so neither branch can own it. It opens no app route by existing, and
 * its own screen reports what happened and offers the way back.
 */
export default ResetPasswordScreen;
