import { SignInScreen } from "@/features/auth/sign-in-screen";

/**
 * Route for the sign-in form (S13).
 *
 * Registered in the root stack only while the session gate reports
 * `unauthenticated`, so a signed-in client cannot reach it and a signed-out one cannot
 * reach the app tree.
 */
export default SignInScreen;
