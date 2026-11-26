import { afterAll, beforeAll, describe, expect, it } from "bun:test";

/**
 * The web deep links (S13).
 *
 * A browser cannot open the app's custom scheme, so on the web target the emailed link has
 * to come back to the page it was requested from — an origin the API already trusts through
 * `CORS_ALLOWED_ORIGINS`. This file imports the `.web` module directly because the bundler,
 * not the test runner, chooses which of the two files a build gets.
 */
const global = globalThis as unknown as { location?: { origin?: string } };
const previousLocation = global.location;

beforeAll(() => {
  // The page's own origin is what the browser exposes as `location`. Other suites replace
  // `window`, so this sets the global the module actually reads and restores it below.
  global.location = { origin: "http://localhost:8082" };
});

afterAll(() => {
  global.location = previousLocation;
});

const links = await import("../deep-links.web");

describe("deep links (web)", () => {
  it("comes back to this page's own origin instead of the app scheme", () => {
    expect(links.resetPasswordUrl()).toBe(
      "http://localhost:8082/reset-password",
    );
    expect(links.verifyEmailUrl()).toBe("http://localhost:8082/verify-email");
  });

  it("imports no native module and hard-codes no app scheme", async () => {
    const source = await Bun.file(
      new URL("../deep-links.web.ts", import.meta.url),
    ).text();

    expect(source).not.toContain("myself://");
    expect(source).not.toContain("expo-");
  });
});
