import { describe, expect, it } from "bun:test";
import { APP_NAME } from "./index";

describe("shared package", () => {
  it("should have correct APP_NAME", () => {
    expect(APP_NAME).toBe("myself");
  });
});
