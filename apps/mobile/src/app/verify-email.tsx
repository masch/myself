import { VerifyEmailScreen } from "@/features/auth/verify-email-screen";

/**
 * Route the verification deep link opens (S2, S13): `myself://verify-email?error=…`.
 *
 * Ungated for the same reason as `reset-password.tsx`: the link is followed by a user who
 * may be signed out, and a signed-in user may verify a second address. It grants nothing —
 * the screen only reports the outcome the server already decided.
 */
export default VerifyEmailScreen;
