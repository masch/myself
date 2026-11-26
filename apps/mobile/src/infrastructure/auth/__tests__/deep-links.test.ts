import { describe, expect, it } from "bun:test";
import { APP_DEEP_LINK_ORIGINS } from "@myself/api/src/config";

import { resetPasswordUrl, verifyEmailUrl } from "../deep-links";

/**
 * The two links the app asks the server to send it (S13).
 *
 * Three things have to agree, and none of them is a compile-time guarantee: the URL the
 * client asks for, the origin the server trusts (`APP_DEEP_LINK_ORIGINS`), and the route
 * expo-router answers at. The web implementation is asserted separately in
 * `deep-links.web.test.ts` because the bundler, not this test, chooses it.
 */
const APP_DIR = new URL("../../../app/", import.meta.url);

describe("deep links (S13)", () => {
  it("uses exactly the origins the API trusts, and no third one", () => {
    expect([resetPasswordUrl(), verifyEmailUrl()].sort()).toEqual(
      [...APP_DEEP_LINK_ORIGINS].sort(),
    );
  });

  it("lands on routes the app actually registers", async () => {
    // A deep link whose route does not exist opens expo-router's not-found screen, which is
    // a dead end dressed as a landing page.
    expect(
      await Bun.file(new URL("reset-password.tsx", APP_DIR)).exists(),
    ).toBe(true);
    expect(await Bun.file(new URL("verify-email.tsx", APP_DIR)).exists()).toBe(
      true,
    );
    expect(resetPasswordUrl()).toEndWith("/reset-password");
    expect(verifyEmailUrl()).toEndWith("/verify-email");
  });
});
