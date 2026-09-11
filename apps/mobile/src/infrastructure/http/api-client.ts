import { HttpClient, type HttpClientConfig } from "./http-client";
import { ReadingsClient } from "./resources/readings.client";
import { AuthorsClient } from "./resources/authors.client";

export type ApiClientConfig = HttpClientConfig;

export class ApiClient {
  readonly http: HttpClient;
  readonly readings: ReadingsClient;
  readonly authors: AuthorsClient;

  constructor(config: ApiClientConfig) {
    this.http = new HttpClient(config);
    this.readings = new ReadingsClient(this.http);
    this.authors = new AuthorsClient(this.http);
  }
}

export function createApiClient(
  configOrBaseUrl: string | ApiClientConfig,
): ApiClient {
  const config =
    typeof configOrBaseUrl === "string"
      ? { baseUrl: configOrBaseUrl }
      : configOrBaseUrl;
  return new ApiClient(config);
}
