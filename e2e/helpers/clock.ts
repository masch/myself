import { type Page } from "@playwright/test";

export const DEFAULT_E2E_TIME = "2026-09-13T12:00:00Z";

export interface HasIsoString {
  toISOString(): string;
}

export type ClockTimeInput = string | HasIsoString;

function toPlaywrightTime(time: ClockTimeInput): string {
  return typeof time === "string" ? time : time.toISOString();
}

export class TestClock {
  constructor(private page: Page) {}

  static async install(
    page: Page,
    initialTime: ClockTimeInput = DEFAULT_E2E_TIME,
  ): Promise<TestClock> {
    await page.clock.install({
      time: toPlaywrightTime(initialTime),
    });
    return new TestClock(page);
  }

  async setTime(time: ClockTimeInput): Promise<void> {
    await this.page.clock.setFixedTime(toPlaywrightTime(time));
  }

  async travelAndReload(time: ClockTimeInput): Promise<void> {
    await this.setTime(time);
    await this.page.reload();
  }
}
