import {
  Reading,
  DateTime,
  type CreateReadingInput,
  type EntityId,
  type ReadingTranslationsMap,
} from "@myself/shared";
import { createApiClient } from "../../../infrastructure/http";
import { appConfig, type MobileConfig } from "../../../infrastructure/config";
import type { SessionTokenStorage } from "../../../infrastructure/auth/session-token-storage.contract";

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Resolves the bearer token for a curated-content write (S8).
 *
 * The platform storage module is the only source: on native it reads the keychain,
 * on web the bundler swaps in the in-memory store. Resolved per request, so a session
 * established after this adapter was constructed still applies.
 */
export type AuthTokenProvider = () => Promise<string | null>;

const readStoredSessionToken: AuthTokenProvider = async () => {
  // Resolved on first use instead of at import time. The platform store is the keychain
  // on native, which no host without a device can load, and callers that supply their
  // own provider (the test suites) must not have to stub it. The specifier is a literal,
  // so Metro still bundles the module and the platform split still selects the web
  // implementation on web.
  const { sessionTokenStorage }: { sessionTokenStorage: SessionTokenStorage } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../../../infrastructure/auth/session-token-storage");
  return sessionTokenStorage.get();
};

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

  constructor(
    configOrBaseUrl: MobileConfig | string = appConfig,
    getAuthToken: AuthTokenProvider = readStoredSessionToken,
  ) {
    const baseUrl =
      typeof configOrBaseUrl === "string"
        ? configOrBaseUrl
        : configOrBaseUrl.apiUrl;
    const timeoutMs =
      typeof configOrBaseUrl === "string"
        ? REQUEST_TIMEOUT_MS
        : configOrBaseUrl.apiTimeoutMs;

    // The token hook is what makes the curated-content writes authorized: without it
    // the admin gate (T3) answers every POST/PUT/DELETE with 401.
    this.client = createApiClient({ baseUrl, timeoutMs, getAuthToken });
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
      throw error;
    }
  }

  async putReading(
    id: string,
    input: {
      authorId?: string;
      translations: Record<string, { title: string; content: string }>;
      version?: number;
    },
  ): Promise<boolean> {
    try {
      return await this.client.readings.update(id as EntityId, {
        authorId: input.authorId as EntityId | undefined,
        translations: input.translations,
        version: input.version,
      });
    } catch (error) {
      console.warn("[HttpReadingApiAdapter] putReading network error:", error);
      throw error;
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
      throw error;
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
      throw error;
    }
  }
}
