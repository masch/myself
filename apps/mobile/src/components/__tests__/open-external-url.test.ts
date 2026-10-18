import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Linking } from "react-native";
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
});
