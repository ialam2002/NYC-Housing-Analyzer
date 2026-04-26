import { AmenityType, Borough, ComplaintCategory, ViolationSeverity } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { computeRentWiseScore } from "@/server/scoring/rentwise-score.engine";

describe("computeRentWiseScore", () => {
  it("returns bounded values and details for empty signals", () => {
	const result = computeRentWiseScore({
	  borough: Borough.MANHATTAN,
	  subwayConnections: [],
	  complaints: [],
	  nearbyAmenities: [],
	  violations: [],
	});

	expect(result.score.overall).toBeGreaterThanOrEqual(0);
	expect(result.score.overall).toBeLessThanOrEqual(100);
	expect(result.score.transit).toBe(20);
	expect(result.score.complaints).toBe(95);
	expect(result.score.amenities).toBe(20);
	expect(result.details.algorithmVersion).toBe("mvp-v1");
	expect(result.details.inputs.subwayConnectionCount).toBe(0);
  });

  it("penalizes open severe violations and open heat complaints", () => {
	const strong = computeRentWiseScore({
	  borough: Borough.QUEENS,
	  subwayConnections: [
		{ walkingMinutes: 4, distanceMeters: 280 },
		{ walkingMinutes: 7, distanceMeters: 520 },
	  ],
	  complaints: [{ category: ComplaintCategory.NOISE, status: "Closed" }],
	  nearbyAmenities: [
		{ distanceMeters: 250, amenity: { type: AmenityType.GROCERY } },
		{ distanceMeters: 350, amenity: { type: AmenityType.PHARMACY } },
		{ distanceMeters: 450, amenity: { type: AmenityType.PARK } },
		{ distanceMeters: 600, amenity: { type: AmenityType.GYM } },
	  ],
	  violations: [{ severity: ViolationSeverity.LOW, status: "Closed" }],
	});

	const weak = computeRentWiseScore({
	  borough: Borough.QUEENS,
	  subwayConnections: [
		{ walkingMinutes: 4, distanceMeters: 280 },
		{ walkingMinutes: 7, distanceMeters: 520 },
	  ],
	  complaints: [
		{ category: ComplaintCategory.HEAT_HOT_WATER, status: "Open" },
		{ category: ComplaintCategory.NOISE, status: "Open" },
	  ],
	  nearbyAmenities: [
		{ distanceMeters: 250, amenity: { type: AmenityType.GROCERY } },
		{ distanceMeters: 350, amenity: { type: AmenityType.PHARMACY } },
	  ],
	  violations: [
		{ severity: ViolationSeverity.CRITICAL, status: "Open" },
		{ severity: ViolationSeverity.HIGH, status: "Open" },
	  ],
	});

	expect(weak.score.buildingCondition).toBeLessThan(strong.score.buildingCondition);
	expect(weak.score.safety).toBeLessThan(strong.score.safety);
	expect(weak.score.overall).toBeLessThan(strong.score.overall);
  });
});

