import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { Alert, Linking } from "react-native";
import { openExternalUrl } from "../open-external-url";

describe("openExternalUrl", () => {
  let originalOpenURL: typeof Linking.openURL;

  beforeEach(() => {
    originalOpenURL = Linking.openURL;
  });

  afterEach(() => {
    (Linking as { openURL: typeof Linking.openURL }).openURL = originalOpenURL;
  });

  it("resolves true and forwards the url when opening succeeds", async () => {
    const opened: string[] = [];
    (Linking as { openURL: typeof Linking.openURL }).openURL = async (
      url: string,
    ) => {
      opened.push(url);
    };

    const result = await openExternalUrl("https://example.com");
    expect(result).toBe(true);
    expect(opened).toEqual(["https://example.com"]);
  });

  it("resolves false instead of rejecting when opening fails", async () => {
    (Linking as { openURL: typeof Linking.openURL }).openURL = async () => {
      throw new Error("cannot open url");
    };

    const result = await openExternalUrl("https://example.com");
    expect(result).toBe(false);
  });

  it("does not notify the user when opening succeeds", async () => {
    (Linking as { openURL: typeof Linking.openURL }).openURL = async () => {};
    const notified: string[] = [];

    const result = await openExternalUrl("https://example.com", (url) =>
      notified.push(url),
    );

    expect(result).toBe(true);
    expect(notified).toEqual([]);
  });

  it("notifies once with the url and still resolves false when opening fails", async () => {
    (Linking as { openURL: typeof Linking.openURL }).openURL = async () => {
      throw new Error("cannot open url");
    };
    const notified: string[] = [];

    const result = await openExternalUrl("https://example.com/bad", (url) =>
      notified.push(url),
    );

    expect(result).toBe(false);
    expect(notified).toEqual(["https://example.com/bad"]);
  });

  it("resolves false and never rejects when the injected notifier throws", async () => {
    (Linking as { openURL: typeof Linking.openURL }).openURL = async () => {
      throw new Error("cannot open url");
    };

    let result: boolean | undefined;
    let rejected = false;

    try {
      result = await openExternalUrl("https://example.com/bad", () => {
        throw new Error("notifier boom");
      });
    } catch {
      rejected = true;
    }

    expect(rejected).toBe(false);
    expect(result).toBe(false);
  });

  it("surfaces the default user-visible notice when opening fails", async () => {
    (Linking as { openURL: typeof Linking.openURL }).openURL = async () => {
      throw new Error("cannot open url");
    };
    const alertSpy = spyOn(Alert, "alert").mockImplementation(() => {});

    const result = await openExternalUrl("https://example.com/bad");

    expect(result).toBe(false);
    expect(alertSpy).toHaveBeenCalledTimes(1);

    alertSpy.mockRestore();
  });
});
