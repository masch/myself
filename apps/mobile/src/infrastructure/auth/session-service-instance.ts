import { appConfig } from "@/infrastructure/config";
import { createAuthApi } from "./auth-client";
import { createSessionService } from "./session-service";
import { sessionTokenStorage } from "./session-token-storage";

/**
 * The app-wide session service (S13).
 *
 * This is the only module that binds the three pieces together: the auth client (which
 * captures `set-auth-token`), the platform token store and the session service. Keeping
 * the binding out of `auth-client.ts` means importing the client in a test does not
 * drag the platform store — and therefore `expo-secure-store` — into the module graph.
 *
 * One instance, so the token the client captures and the token the provider clears are
 * the same value, and so a test can swap the whole service instead of reaching inside.
 */
export const sessionService = createSessionService({
  api: createAuthApi({
    baseUrl: appConfig.apiUrl,
    storage: sessionTokenStorage,
  }),
  storage: sessionTokenStorage,
});
