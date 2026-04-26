import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/search/route";
import { searchProperties } from "@/server/services/search.service";

vi.mock("@/server/services/search.service", () => ({
  searchProperties: vi.fn(),
}));

const mockedSearchProperties = vi.mocked(searchProperties);

describe("GET /api/search", () => {
  beforeEach(() => {
    mockedSearchProperties.mockReset();
  });

  it("returns 400 for invalid query params", async () => {
    const request = new NextRequest("http://localhost:3000/api/search?q=x");

    const response = await GET(request);
    const payload = (await response.json()) as {
      data: null;
      error: { code: string; message: string; details?: Record<string, string[] | undefined> };
    };

    expect(response.status).toBe(400);
    expect(payload.data).toBeNull();
    expect(payload.error.code).toBe("BAD_REQUEST");
    expect(payload.error.details?.q).toBeDefined();
  });

  it("returns 200 and service payload for valid query", async () => {
    mockedSearchProperties.mockResolvedValueOnce({
      query: { q: "Astoria", page: 1, pageSize: 12, sort: "score_desc" },
      items: [],
      page: 1,
      pageSize: 12,
      total: 0,
      totalPages: 0,
    });

    const request = new NextRequest("http://localhost:3000/api/search?q=Astoria");
    const response = await GET(request);
    const payload = (await response.json()) as { data: { query: { q?: string } }; error: null };

    expect(response.status).toBe(200);
    expect(payload.error).toBeNull();
    expect(payload.data.query.q).toBe("Astoria");
    expect(mockedSearchProperties).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when service throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockedSearchProperties.mockRejectedValueOnce(new Error("search down"));

    const request = new NextRequest("http://localhost:3000/api/search?q=Harlem");
    const response = await GET(request);
    const payload = (await response.json()) as { data: null; error: { code: string; message: string } };

    expect(response.status).toBe(500);
    expect(payload.data).toBeNull();
    expect(payload.error.code).toBe("INTERNAL_SERVER_ERROR");
    consoleSpy.mockRestore();
  });
});

