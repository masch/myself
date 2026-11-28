import { ForgotPasswordScreen } from "@/features/auth/forgot-password-screen";

/**
 * Route for the reset request (S2, S13).
 *
 * Registered in the auth branch of the root stack, so a signed-out user reaches it from the
 * sign-in form and a signed-in one does not need it.
 */
export default ForgotPasswordScreen;
