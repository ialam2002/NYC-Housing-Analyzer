import { Borough } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { searchQuerySchema } from "@/server/validators/search";

describe("searchQuerySchema", () => {
  it("applies defaults when optional params are missing", () => {
    const parsed = searchQuerySchema.parse({ q: "Astoria" });

    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(12);
    expect(parsed.sort).toBe("score_desc");
  });

  it("rejects minRent greater than maxRent", () => {
    const parsed = searchQuerySchema.safeParse({ q: "Harlem", minRent: "5000", maxRent: "2000" });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.minRent).toBeDefined();
    }
  });

  it("parses numeric query params and enum values", () => {
    const parsed = searchQuerySchema.parse({
      q: "Queens",
      borough: Borough.QUEENS,
      minRent: "2000",
      maxRent: "3800",
      beds: "2",
      page: "2",
      pageSize: "8",
      sort: "rent_asc",
    });

    expect(parsed.borough).toBe(Borough.QUEENS);
    expect(parsed.minRent).toBe(2000);
    expect(parsed.maxRent).toBe(3800);
    expect(parsed.beds).toBe(2);
    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(8);
    expect(parsed.sort).toBe("rent_asc");
  });
});

