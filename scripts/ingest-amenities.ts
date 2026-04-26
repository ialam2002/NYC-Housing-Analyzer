import { PrismaClient } from "@prisma/client";

import { ingestAmenities } from "../src/server/ingestion/amenities/places";
import { runLoggedIngestion } from "../src/server/ingestion/shared/run-logger";

async function main() {
  const prisma = new PrismaClient({ log: ["error", "warn"] });
  const searchLimit = process.env.AMENITY_SEARCH_LIMIT ? Number(process.env.AMENITY_SEARCH_LIMIT) : undefined;
  const maxDistanceMeters = process.env.AMENITY_MAX_DISTANCE_METERS
    ? Number(process.env.AMENITY_MAX_DISTANCE_METERS)
    : undefined;
  const maxLinksPerProperty = process.env.AMENITY_MAX_LINKS_PER_PROPERTY
    ? Number(process.env.AMENITY_MAX_LINKS_PER_PROPERTY)
    : undefined;

  if (searchLimit !== undefined && !Number.isFinite(searchLimit)) {
    throw new Error("AMENITY_SEARCH_LIMIT must be a number when provided");
  }
  if (maxDistanceMeters !== undefined && !Number.isFinite(maxDistanceMeters)) {
    throw new Error("AMENITY_MAX_DISTANCE_METERS must be a number when provided");
  }
  if (maxLinksPerProperty !== undefined && !Number.isFinite(maxLinksPerProperty)) {
    throw new Error("AMENITY_MAX_LINKS_PER_PROPERTY must be a number when provided");
  }

  try {
    const summary = await runLoggedIngestion(prisma, "ingest-amenities", () =>
      ingestAmenities(prisma, {
        endpoint: process.env.MAPBOX_GEOCODING_ENDPOINT,
        accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
        searchLimit,
        maxDistanceMeters,
        maxLinksPerProperty,
      }),
    );

    console.table(summary);
    console.log("Amenity ingestion finished.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Amenity ingestion failed", error);
  process.exitCode = 1;
});

