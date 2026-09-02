import { describe, expect, it, mock, beforeEach } from "bun:test";

const mockIsDndActive = mock(() => true);
const mockIsSupported = mock(() => true);
const mockIsGranted = mock(() => true);
const mockSetDndActive = mock((_active: boolean) => true);
const mockOpenSettings = mock(() => {});

mock.module("../src/DndStatusModule", () => ({
  default: {
    isDndActive: mockIsDndActive,
    isSupported: mockIsSupported,
    isNotificationPolicyAccessGranted: mockIsGranted,
    setDndActive: mockSetDndActive,
    openDndSettings: mockOpenSettings,
  },
}));

import {
  isDndActive,
  isDndCheckSupported,
  isNotificationPolicyAccessGranted,
  setDndActive,
  openDndSettings,
} from "../index";

describe("DndStatusModule Wrapper Functions", () => {
  beforeEach(() => {
    mockIsDndActive.mockClear();
    mockIsSupported.mockClear();
    mockIsGranted.mockClear();
    mockSetDndActive.mockClear();
    mockOpenSettings.mockClear();
  });

  it("isDndActive returns status and handles errors", () => {
    expect(isDndActive()).toBe(true);
    expect(mockIsDndActive).toHaveBeenCalled();

    mockIsDndActive.mockImplementationOnce(() => {
      throw new Error("Crash");
    });
    expect(isDndActive()).toBe(false);
  });

  it("isDndCheckSupported returns support status and handles errors", () => {
    expect(isDndCheckSupported()).toBe(true);
    expect(mockIsSupported).toHaveBeenCalled();

    mockIsSupported.mockImplementationOnce(() => {
      throw new Error("Crash");
    });
    expect(isDndCheckSupported()).toBe(false);
  });

  it("isNotificationPolicyAccessGranted returns permission and handles errors", () => {
    expect(isNotificationPolicyAccessGranted()).toBe(true);
    expect(mockIsGranted).toHaveBeenCalled();

    mockIsGranted.mockImplementationOnce(() => {
      throw new Error("Crash");
    });
    expect(isNotificationPolicyAccessGranted()).toBe(false);
  });

  it("setDndActive passes boolean and handles errors", () => {
    expect(setDndActive(true)).toBe(true);
    expect(mockSetDndActive).toHaveBeenCalledWith(true);

    mockSetDndActive.mockImplementationOnce(() => {
      throw new Error("Crash");
    });
    expect(setDndActive(false)).toBe(false);
  });

  it("openDndSettings opens settings and catches errors silently", () => {
    expect(() => openDndSettings()).not.toThrow();
    expect(mockOpenSettings).toHaveBeenCalled();

    mockOpenSettings.mockImplementationOnce(() => {
      throw new Error("Crash");
    });
    expect(() => openDndSettings()).not.toThrow();
  });
});
