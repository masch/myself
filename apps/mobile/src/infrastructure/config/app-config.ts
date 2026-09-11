export type Environment = "development" | "staging" | "production" | "test";

export interface MobileConfigProps {
  apiUrl: string;
  environment: Environment;
  version: string;
  apiTimeoutMs: number;
  meditationGongVolume: number;
}

const DEFAULT_API_URL = "http://localhost:8787";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_GONG_VOLUME = 0.9;
const VALID_ENVIRONMENTS: readonly Environment[] = [
  "development",
  "staging",
  "production",
  "test",
];

export class MobileConfig {
  readonly apiUrl: string;
  readonly environment: Environment;
  readonly version: string;
  readonly apiTimeoutMs: number;
  readonly meditationGongVolume: number;

  constructor(props: Partial<MobileConfigProps> = {}) {
    const rawApiUrl = props.apiUrl?.trim();
    this.apiUrl =
      rawApiUrl && rawApiUrl.length > 0
        ? rawApiUrl.replace(/\/+$/, "")
        : DEFAULT_API_URL;
    this.environment =
      props.environment && VALID_ENVIRONMENTS.includes(props.environment)
        ? props.environment
        : "development";
    this.version = props.version?.trim() || "1.0.0";
    this.apiTimeoutMs = props.apiTimeoutMs ?? DEFAULT_TIMEOUT_MS;

    const parsedVolume = props.meditationGongVolume;
    if (typeof parsedVolume === "number" && Number.isFinite(parsedVolume)) {
      this.meditationGongVolume = Math.max(0, Math.min(1, parsedVolume));
    } else {
      this.meditationGongVolume = DEFAULT_GONG_VOLUME;
    }
  }

  static fromEnv(
    env: Record<string, string | undefined> = typeof process !== "undefined" &&
    process.env
      ? process.env
      : {},
  ): MobileConfig {
    const rawEnv = (env.APP_ENV || env.NODE_ENV || "development").toLowerCase();
    const environment: Environment = VALID_ENVIRONMENTS.includes(
      rawEnv as Environment,
    )
      ? (rawEnv as Environment)
      : "development";

    const rawVolume = env.EXPO_PUBLIC_MEDITATION_GONG_VOLUME?.trim();
    const parsed = rawVolume ? Number(rawVolume) : NaN;
    const envVolume = Number.isFinite(parsed) ? parsed : undefined;

    return new MobileConfig({
      apiUrl: env.EXPO_PUBLIC_API_URL,
      environment,
      version: env.APP_VERSION_NAME,
      meditationGongVolume: envVolume ?? DEFAULT_GONG_VOLUME,
    });
  }
}

/**
 * Alias for MobileConfig to align with AppConfig convention.
 */
export const AppConfig = MobileConfig;

/**
 * Singleton configuration instance initialized from current runtime environment.
 */
export const appConfig = MobileConfig.fromEnv();
