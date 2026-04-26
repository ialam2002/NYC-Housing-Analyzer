import { PrismaClient } from "@prisma/client";

import { ingestAmenities } from "../src/server/ingestion/amenities/places";
import { ingestDobViolations } from "../src/server/ingestion/dob/violations";
import { ingestHpdViolations } from "../src/server/ingestion/hpd/violations";
import { ingestMtaTransit } from "../src/server/ingestion/mta/stations";
import { ingest311Complaints } from "../src/server/ingestion/nyc311/complaints";
import { runLoggedIngestion } from "../src/server/ingestion/shared/run-logger";

async function main() {
  const prisma = new PrismaClient({ log: ["error", "warn"] });

  try {
    const summary311 = await runLoggedIngestion(prisma, "ingest-311", () =>
      ingest311Complaints(prisma, {
        endpoint: process.env.NYC_311_ENDPOINT,
        appToken: process.env.NYC_OPEN_DATA_APP_TOKEN,
        limit: process.env.NYC_311_LIMIT ? Number(process.env.NYC_311_LIMIT) : undefined,
        daysBack: process.env.NYC_311_DAYS_BACK ? Number(process.env.NYC_311_DAYS_BACK) : undefined,
      }),
    );

    const summaryHpd = await runLoggedIngestion(prisma, "ingest-hpd", () =>
      ingestHpdViolations(prisma, {
        endpoint: process.env.HPD_VIOLATIONS_ENDPOINT,
        appToken: process.env.NYC_OPEN_DATA_APP_TOKEN,
        limit: process.env.HPD_VIOLATIONS_LIMIT ? Number(process.env.HPD_VIOLATIONS_LIMIT) : undefined,
        daysBack: process.env.HPD_VIOLATIONS_DAYS_BACK ? Number(process.env.HPD_VIOLATIONS_DAYS_BACK) : undefined,
      }),
    );

    const summaryDob = await runLoggedIngestion(prisma, "ingest-dob", () =>
      ingestDobViolations(prisma, {
        endpoint: process.env.DOB_VIOLATIONS_ENDPOINT,
        appToken: process.env.NYC_OPEN_DATA_APP_TOKEN,
        limit: process.env.DOB_VIOLATIONS_LIMIT ? Number(process.env.DOB_VIOLATIONS_LIMIT) : undefined,
        daysBack: process.env.DOB_VIOLATIONS_DAYS_BACK ? Number(process.env.DOB_VIOLATIONS_DAYS_BACK) : undefined,
        dateField: process.env.DOB_VIOLATIONS_DATE_FIELD,
      }),
    );

    const summaryMta = await runLoggedIngestion(prisma, "ingest-mta", () =>
      ingestMtaTransit(prisma, {
        endpoint: process.env.MTA_STATIONS_ENDPOINT,
        appToken: process.env.NYC_OPEN_DATA_APP_TOKEN,
        limit: process.env.MTA_STATIONS_LIMIT ? Number(process.env.MTA_STATIONS_LIMIT) : undefined,
        maxStationsPerProperty: process.env.MTA_MAX_STATIONS_PER_PROPERTY
          ? Number(process.env.MTA_MAX_STATIONS_PER_PROPERTY)
          : undefined,
        maxDistanceMeters: process.env.MTA_MAX_DISTANCE_METERS
          ? Number(process.env.MTA_MAX_DISTANCE_METERS)
          : undefined,
      }),
    );

    const summaryAmenities = await runLoggedIngestion(prisma, "ingest-amenities", () =>
      ingestAmenities(prisma, {
        endpoint: process.env.MAPBOX_GEOCODING_ENDPOINT,
        accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
        searchLimit: process.env.AMENITY_SEARCH_LIMIT ? Number(process.env.AMENITY_SEARCH_LIMIT) : undefined,
        maxDistanceMeters: process.env.AMENITY_MAX_DISTANCE_METERS
          ? Number(process.env.AMENITY_MAX_DISTANCE_METERS)
          : undefined,
        maxLinksPerProperty: process.env.AMENITY_MAX_LINKS_PER_PROPERTY
          ? Number(process.env.AMENITY_MAX_LINKS_PER_PROPERTY)
          : undefined,
      }),
    );

    console.log("Ingestion suite finished.");
    console.log("NYC 311");
    console.table(summary311);
    console.log("HPD violations");
    console.table(summaryHpd);
    console.log("DOB violations");
    console.table(summaryDob);
    console.log("MTA transit");
    console.table(summaryMta);
    console.log("Amenities");
    console.table(summaryAmenities);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Combined ingestion failed", error);
  process.exitCode = 1;
});

