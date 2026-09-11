import {
  Reading,
  DateTime,
  type CreateReadingInput,
  type EntityId,
  type ReadingTranslationsMap,
} from "@myself/shared";
import { createApiClient } from "../../../infrastructure/http";
import { appConfig, type MobileConfig } from "../../../infrastructure/config";

const REQUEST_TIMEOUT_MS = 10_000;

export interface RemoteReadingDto {
  id: EntityId;
  author_id: EntityId;
  created_at?: string;
  createdAt?: string;
  read_dates?: string[];
  readDates?: string[];
  translations: Record<string, { title: string; content: string }>;
}

export class HttpReadingApiAdapter {
  private client: ReturnType<typeof createApiClient>;

  constructor(configOrBaseUrl: MobileConfig | string = appConfig) {
    const baseUrl =
      typeof configOrBaseUrl === "string"
        ? configOrBaseUrl
        : configOrBaseUrl.apiUrl;
    const timeoutMs =
      typeof configOrBaseUrl === "string"
        ? REQUEST_TIMEOUT_MS
        : configOrBaseUrl.apiTimeoutMs;

    this.client = createApiClient({ baseUrl, timeoutMs });
  }

  async fetchReadings(): Promise<Reading[]> {
    try {
      const items = await this.client.readings.getAll();

      return items.map((item) => {
        const transMap: ReadingTranslationsMap = {
          es: item.translations?.es ?? { title: "", content: "" },
          en: item.translations?.en,
        };

        const rawCreatedAt = item.createdAt ?? "";
        const rawReadDates = item.readDates ?? [];

        return new Reading({
          id: item.id,
          authorId: item.author_id,
          createdAt: DateTime.from(rawCreatedAt),
          readDates: rawReadDates.map((d: string) => DateTime.from(d)),
          translations: transMap,
        });
      });
    } catch (error) {
      console.warn(
        "[HttpReadingApiAdapter] fetchReadings network error:",
        error,
      );
      return [];
    }
  }

  async postReading(input: CreateReadingInput): Promise<boolean> {
    try {
      return await this.client.readings.create(input);
    } catch (error) {
      console.warn("[HttpReadingApiAdapter] postReading network error:", error);
      return false;
    }
  }

  async putReading(
    id: string,
    input: {
      authorId?: string;
      translations: Record<string, { title: string; content: string }>;
    },
  ): Promise<boolean> {
    try {
      return await this.client.readings.update(id as EntityId, {
        authorId: input.authorId as EntityId | undefined,
        translations: input.translations,
      });
    } catch (error) {
      console.warn("[HttpReadingApiAdapter] putReading network error:", error);
      return false;
    }
  }

  async deleteReading(id: string): Promise<boolean> {
    try {
      return await this.client.readings.delete(id as EntityId);
    } catch (error) {
      console.warn(
        "[HttpReadingApiAdapter] deleteReading network error:",
        error,
      );
      return false;
    }
  }

  async postAuthor(input: {
    id?: string;
    name: string;
    bio?: string;
  }): Promise<string | null> {
    try {
      return await this.client.authors.create({
        id: input.id as EntityId | undefined,
        name: input.name,
        bio: input.bio,
      });
    } catch (error) {
      console.warn("[HttpReadingApiAdapter] postAuthor network error:", error);
      return null;
    }
  }
}
