import { describe, expect, it } from "bun:test";
import {
  Reading,
  DateTime,
  type EntityId,
  type SupportedLocale,
} from "@myself/shared";
import type { IReadingRepository } from "../domain/reading.repository";

export class MockReadingRepository implements IReadingRepository {
  private items: Reading[] = [];
  private logs: { [readingId: string]: string[] } = {};

  async getAll(locale: SupportedLocale = "es"): Promise<Reading[]> {
    return [...this.items];
  }

  async getById(id: EntityId): Promise<Reading | null> {
    return this.items.find((r) => r.id === id) ?? null;
  }

  async save(reading: Reading): Promise<void> {
    const idx = this.items.findIndex((r) => r.id === reading.id);
    if (idx >= 0) {
      this.items[idx] = reading;
    } else {
      this.items.push(reading);
    }
  }

  async delete(id: EntityId): Promise<void> {
    this.items = this.items.filter((r) => r.id !== id);
  }

  async recordLog(readingId: EntityId): Promise<string> {
    const logId = `log-${Date.now()}`;
    if (!this.logs[readingId]) {
      this.logs[readingId] = [];
    }
    this.logs[readingId].push(new Date().toISOString());
    return logId;
  }

  async deleteLastLog(readingId: EntityId): Promise<void> {
    if (this.logs[readingId]) {
      this.logs[readingId].pop();
    }
  }

  async getLogs(
    readingId: EntityId,
  ): Promise<{ id: string; readAt: string }[]> {
    return (this.logs[readingId] ?? []).map((date, idx) => ({
      id: `log-${idx}`,
      readAt: date,
    }));
  }
}

describe("Hexagonal Domain Port: IReadingRepository Unit Tests", () => {
  it("saves, retrieves, and deletes reading through mock repository port", async () => {
    const repo = new MockReadingRepository();
    const readingId = "550e8400-e29b-41d4-a716-446655440001" as EntityId;
    const authorId = "550e8400-e29b-41d4-a716-446655440002" as EntityId;
    const reading = new Reading({
      id: readingId,
      authorId,
      createdAt: DateTime.now(),
      readDates: [],
      translations: {
        es: { title: "Paz mental", content: "Silencio interior..." },
      },
    });

    await repo.save(reading);
    const retrieved = await repo.getById(readingId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(readingId);
    expect(retrieved?.getTranslation("es")?.title).toBe("Paz mental");

    const all = await repo.getAll();
    expect(all.length).toBe(1);

    await repo.delete(readingId);
    const empty = await repo.getAll();
    expect(empty.length).toBe(0);
  });

  it("records and retrieves reading logs through repository port", async () => {
    const repo = new MockReadingRepository();
    const readingId = "550e8400-e29b-41d4-a716-446655440003" as EntityId;
    await repo.recordLog(readingId);
    await repo.recordLog(readingId);

    const logs = await repo.getLogs(readingId);
    expect(logs.length).toBe(2);

    await repo.deleteLastLog(readingId);
    const updatedLogs = await repo.getLogs(readingId);
    expect(updatedLogs.length).toBe(1);
  });
});
