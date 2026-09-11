import type { HttpClient } from "../http-client";
import type { CreateReadingInput, EntityId, ReadingDto } from "@myself/shared";

export interface ReadingsListResponse {
  items?: ReadingDto[];
  data?: { items?: ReadingDto[] };
}

export class ReadingsClient {
  constructor(private readonly http: HttpClient) {}

  async getAll(): Promise<ReadingDto[]> {
    const res = await this.http.get<ReadingsListResponse | ReadingDto[]>(
      "/v1/readings",
    );
    if (Array.isArray(res)) {
      return res;
    }
    return res.items ?? res.data?.items ?? [];
  }

  async getById(id: EntityId): Promise<ReadingDto> {
    const res = await this.http.get<{ data?: ReadingDto } | ReadingDto>(
      `/v1/readings/${id}`,
    );
    return (res as { data?: ReadingDto }).data ?? (res as ReadingDto);
  }

  async create(input: CreateReadingInput): Promise<boolean> {
    await this.http.post("/v1/readings", input);
    return true;
  }

  async update(
    id: EntityId,
    input: {
      authorId?: EntityId;
      translations: Record<string, { title: string; content: string }>;
    },
  ): Promise<boolean> {
    await this.http.put(`/v1/readings/${id}`, input);
    return true;
  }

  async delete(id: EntityId): Promise<boolean> {
    await this.http.delete(`/v1/readings/${id}`);
    return true;
  }
}
