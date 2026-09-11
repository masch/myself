import type { HttpClient } from "../http-client";
import type { AuthorDto, CreateAuthorInput, EntityId } from "@myself/shared";

export class AuthorsClient {
  constructor(private readonly http: HttpClient) {}

  async getAll(): Promise<AuthorDto[]> {
    const res = await this.http.get<
      { items?: AuthorDto[]; data?: { items?: AuthorDto[] } } | AuthorDto[]
    >("/v1/authors");
    if (Array.isArray(res)) {
      return res;
    }
    return res.items ?? res.data?.items ?? [];
  }

  async getById(id: EntityId): Promise<AuthorDto> {
    const res = await this.http.get<{ data?: AuthorDto } | AuthorDto>(
      `/v1/authors/${id}`,
    );
    return (res as { data?: AuthorDto }).data ?? (res as AuthorDto);
  }

  async create(input: CreateAuthorInput): Promise<string | null> {
    const json = await this.http.post<{ id?: string; data?: { id?: string } }>(
      "/v1/authors",
      input,
    );
    return json.data?.id ?? json.id ?? null;
  }
}
