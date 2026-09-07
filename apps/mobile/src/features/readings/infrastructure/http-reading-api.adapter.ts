import {
  Reading,
  DateTime,
  createApiClient,
  type CreateReadingInput,
  type EntityId,
  type ReadingTranslationsMap,
} from "@myself/shared";

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
    baseUrl: string = process.env.EXPO_PUBLIC_API_URL ??
      "http://localhost:8787",
  ) {
    this.client = createApiClient(baseUrl);
  }

  async fetchReadings(): Promise<Reading[]> {
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787"}/v1/readings`,
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch readings: ${res.statusText}`);
      }

      const json = (await res.json()) as {
        items?: RemoteReadingDto[];
        data?: { items?: RemoteReadingDto[] };
      };
      const items = json.items ?? json.data?.items ?? [];

      return items.map((item) => {
        const transMap: ReadingTranslationsMap = {
          es: item.translations?.es ?? { title: "", content: "" },
          en: item.translations?.en,
        };

        const rawCreatedAt = item.createdAt ?? item.created_at ?? "";
        const rawReadDates = item.readDates ?? item.read_dates ?? [];

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
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787"}/v1/readings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      return res.ok;
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
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787"}/v1/readings/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      return res.ok;
    } catch (error) {
      console.warn("[HttpReadingApiAdapter] putReading network error:", error);
      return false;
    }
  }

  async deleteReading(id: string): Promise<boolean> {
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787"}/v1/readings/${id}`,
        {
          method: "DELETE",
        },
      );
      return res.ok;
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
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787"}/v1/authors`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: input.id,
            name: input.name,
            bio: input.bio,
          }),
        },
      );
      if (!res.ok) return null;
      const json = await res.json();
      return json.data?.id ?? json.id ?? null;
    } catch (error) {
      console.warn("[HttpReadingApiAdapter] postAuthor network error:", error);
      return null;
    }
  }
}
