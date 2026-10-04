import { describe, expect, it, mock } from "bun:test";
import { safeAsync } from "../safe-async";
import type { ErrorHandlerPort } from "@myself/shared";

describe("safeAsync", () => {
  it("does not call handler when the promise resolves successfully", async () => {
    const mockHandler: ErrorHandlerPort = {
      handle: mock(() => {}),
    };

    safeAsync(Promise.resolve("success"), { source: "test" }, mockHandler);

    // Yield macro/microtasks to ensure any unhandled rejection would have fired
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockHandler.handle).not.toHaveBeenCalled();
  });

  it("calls handler with error and context when the promise rejects with an Error", async () => {
    const mockHandler: ErrorHandlerPort = {
      handle: mock(() => {}),
    };
    const expectedError = new Error("Database query failed");
    const context = { source: "useReadings.recordLog", readingId: "read-123" };

    safeAsync(Promise.reject(expectedError), context, mockHandler);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockHandler.handle).toHaveBeenCalledTimes(1);
    expect(mockHandler.handle).toHaveBeenCalledWith(expectedError, context);
  });

  it("calls handler when the promise rejects with a non-Error primitive (string/null)", async () => {
    const mockHandler: ErrorHandlerPort = {
      handle: mock(() => {}),
    };
    const context = { source: "audioPlayback" };

    safeAsync(Promise.reject("Autoplay prevented"), context, mockHandler);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockHandler.handle).toHaveBeenCalledTimes(1);
    expect(mockHandler.handle).toHaveBeenCalledWith(
      "Autoplay prevented",
      context,
    );
  });

  it("works without explicit context", async () => {
    const mockHandler: ErrorHandlerPort = {
      handle: mock(() => {}),
    };
    const error = new Error("Unexpected failure");

    safeAsync(Promise.reject(error), undefined, mockHandler);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockHandler.handle).toHaveBeenCalledTimes(1);
    expect(mockHandler.handle).toHaveBeenCalledWith(error, undefined);
  });
});
