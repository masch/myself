import { appConfig } from "@/infrastructure/config";
import { createAuthApi } from "./auth-client";
import { createPasswordResetService } from "./password-reset-service";
import { sessionTokenStorage } from "./session-token-storage";

/**
 * The app-wide password-reset service (S13).
 *
 * Its own auth client rather than the session service's: the reset flow runs while nobody
 * is signed in, and sharing one client would make the reset screens depend on the session
 * layer for no reason. The token store is the same object, so a reset that happens to
 * answer with a credential is captured like any other.
 */
export const passwordResetService = createPasswordResetService({
  api: createAuthApi({
    baseUrl: appConfig.apiUrl,
    storage: sessionTokenStorage,
  }),
});
