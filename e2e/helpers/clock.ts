import { type Page } from "@playwright/test";

export const DEFAULT_E2E_TIME = "2026-09-13T12:00:00Z";

export class TestClock {
  constructor(private page: Page) {}

  static async install(
    page: Page,
    initialTime: string | Date = DEFAULT_E2E_TIME,
  ): Promise<TestClock> {
    await page.clock.install({
      time:
        typeof initialTime === "string" ? new Date(initialTime) : initialTime,
    });
    return new TestClock(page);
  }

  async setTime(time: string | Date): Promise<void> {
    await this.page.clock.setFixedTime(
      typeof time === "string" ? new Date(time) : time,
    );
  }

  async travelAndReload(time: string | Date): Promise<void> {
    await this.setTime(time);
    await this.page.reload();
  }
}
