import { describe, expect, it } from "bun:test";
import { ApiResponse } from "@myself/shared";
import app from "./index";

describe("API endpoints", () => {
  it("GET / returns success message", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const body = (await res.json()) as ApiResponse<{ message: string }>;
    expect(body.success).toBe(true);
    expect(body.data?.message).toContain("Welcome to myself API");
  });

  it("GET /health returns ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("ok");
  });
});
