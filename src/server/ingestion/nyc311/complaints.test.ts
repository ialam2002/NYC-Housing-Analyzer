import { ComplaintCategory } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { mapComplaintCategory, normalizeAddress, rescoreProperties } from "@/server/ingestion/nyc311/complaints";

describe("nyc311 complaint helpers", () => {
  it("normalizes addresses for deterministic matching", () => {
    const normalized = normalizeAddress(" 123 W. 45th St., Apt #4B ");
    expect(normalized).toBe("123 W 45TH ST APT 4B");
  });

  it("maps complaint types into RentWise complaint categories", () => {
    expect(mapComplaintCategory("HEAT/HOT WATER")).toBe(ComplaintCategory.HEAT_HOT_WATER);
    expect(mapComplaintCategory("Noise - Residential")).toBe(ComplaintCategory.NOISE);
    expect(mapComplaintCategory("Rodent")).toBe(ComplaintCategory.RODENTS);
    expect(mapComplaintCategory("Unsanitary Condition")).toBe(ComplaintCategory.SANITATION);
    expect(mapComplaintCategory("Street Light Condition")).toBe(ComplaintCategory.OTHER);
  });

  it("rescoring deduplicates property ids and counts failures without throwing", async () => {
    const calls: string[] = [];
    const summary = await rescoreProperties(["p1", "p2", "p2", "p3"], async (propertyId) => {
      calls.push(propertyId);
      if (propertyId === "p2") {
        throw new Error("score failed");
      }
      return { ok: true };
    });

    expect(calls).toEqual(["p1", "p2", "p3"]);
    expect(summary.rescored).toBe(2);
    expect(summary.rescoreFailed).toBe(1);
  });
});

