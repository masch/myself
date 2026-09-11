import { describe, expect, it } from "bun:test";
import { MobileConfig } from "../app-config";

describe("MobileConfig", () => {
  it("uses sensible defaults when no environment variables or props are passed", () => {
    const config = new MobileConfig();

    expect(config.apiUrl).toBe("http://localhost:8787");
    expect(config.environment).toBe("development");
    expect(config.version).toBe("1.0.0");
    expect(config.apiTimeoutMs).toBe(10_000);
    expect(config.meditationGongVolume).toBe(0.9);
  });

  it("normalizes apiUrl by removing trailing slashes and whitespace", () => {
    const config = new MobileConfig({
      apiUrl: "  https://api.example.com/v1/   ",
    });

    expect(config.apiUrl).toBe("https://api.example.com/v1");
  });

  it("falls back to default apiUrl if empty string or whitespace is provided", () => {
    const config = new MobileConfig({
      apiUrl: "   ",
    });

    expect(config.apiUrl).toBe("http://localhost:8787");
  });

  it("configures and clamps meditationGongVolume correctly", () => {
    const customConfig = new MobileConfig({
      meditationGongVolume: 0.5,
    });
    expect(customConfig.meditationGongVolume).toBe(0.5);

    const clampedHigh = new MobileConfig({
      meditationGongVolume: 1.5,
    });
    expect(clampedHigh.meditationGongVolume).toBe(1.0);

    const clampedLow = new MobileConfig({
      meditationGongVolume: -0.2,
    });
    expect(clampedLow.meditationGongVolume).toBe(0.0);
  });

  it("parses staging environment from env correctly", () => {
    const config = MobileConfig.fromEnv({
      APP_ENV: "staging",
      EXPO_PUBLIC_API_URL:
        "https://myself-api-staging.impenetrable-connect.workers.dev",
      APP_VERSION_NAME: "2.1.0",
      EXPO_PUBLIC_MEDITATION_GONG_VOLUME: "0.85",
    });

    expect(config.apiUrl).toBe(
      "https://myself-api-staging.impenetrable-connect.workers.dev",
    );
    expect(config.environment).toBe("staging");
    expect(config.version).toBe("2.1.0");
    expect(config.meditationGongVolume).toBe(0.85);
  });

  it("parses production environment from env correctly", () => {
    const config = MobileConfig.fromEnv({
      APP_ENV: "production",
      EXPO_PUBLIC_API_URL:
        "https://myself-api.impenetrable-connect.workers.dev",
    });

    expect(config.environment).toBe("production");
  });

  it("falls back to development when given invalid environment string", () => {
    const config = MobileConfig.fromEnv({
      APP_ENV: "unknown_environment",
    });

    expect(config.environment).toBe("development");
  });
});
