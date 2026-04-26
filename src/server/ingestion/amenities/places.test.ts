import { AmenityType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { buildPropertyAmenityLinks, mapMapboxFeatureToAmenity, mergeAmenities } from "@/server/ingestion/amenities/places";

describe("amenity ingestion helpers", () => {
  it("maps a representative Mapbox feature into an amenity candidate", () => {
    const amenity = mapMapboxFeatureToAmenity(
      {
        id: "poi.123",
        text: "Trader Joe's",
        place_name: "Trader Joe's, Manhattan, New York, New York 10025, United States",
        center: [-73.975155, 40.79027],
      },
      AmenityType.GROCERY,
      "neighborhood-1",
    );

    expect(amenity).toMatchObject({
      externalId: "MAPBOX:poi.123",
      name: "Trader Joe's",
      type: AmenityType.GROCERY,
      neighborhoodId: "neighborhood-1",
      latitude: 40.79027,
      longitude: -73.975155,
    });
  });

  it("merges repeated amenities by external id", () => {
    const merged = mergeAmenities([
      {
        externalId: "MAPBOX:poi.123",
        name: "Trader Joe's",
        type: AmenityType.GROCERY,
        latitude: 40.79027,
        longitude: -73.975155,
        neighborhoodId: "n1",
      },
      {
        externalId: "MAPBOX:poi.123",
        name: "Trader Joe's",
        type: AmenityType.GROCERY,
        latitude: 40.79027,
        longitude: -73.975155,
        neighborhoodId: "n2",
      },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].neighborhoodId).toBe("n1");
  });

  it("builds nearest amenity links for each property", () => {
    const links = buildPropertyAmenityLinks(
      [{ id: "property-1", latitude: 40.791648, longitude: -73.972122 }],
      [
        { latitude: 40.79027, longitude: -73.975155 },
        { latitude: 40.660204, longitude: -73.968956 },
      ],
      1200,
      4,
    );

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      propertyId: "property-1",
      amenityIndex: 0,
    });
    expect(links[0].distanceMeters).toBeGreaterThan(0);
  });
});

