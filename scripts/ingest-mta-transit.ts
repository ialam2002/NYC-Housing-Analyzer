import { PrismaClient } from "@prisma/client";

import { ingestMtaTransit } from "../src/server/ingestion/mta/stations";
import { runLoggedIngestion } from "../src/server/ingestion/shared/run-logger";

async function main() {
  const prisma = new PrismaClient({ log: ["error", "warn"] });
  const limit = process.env.MTA_STATIONS_LIMIT ? Number(process.env.MTA_STATIONS_LIMIT) : undefined;
  const maxStationsPerProperty = process.env.MTA_MAX_STATIONS_PER_PROPERTY
    ? Number(process.env.MTA_MAX_STATIONS_PER_PROPERTY)
    : undefined;
  const maxDistanceMeters = process.env.MTA_MAX_DISTANCE_METERS
    ? Number(process.env.MTA_MAX_DISTANCE_METERS)
    : undefined;

  if (limit !== undefined && !Number.isFinite(limit)) {
    throw new Error("MTA_STATIONS_LIMIT must be a number when provided");
  }
  if (maxStationsPerProperty !== undefined && !Number.isFinite(maxStationsPerProperty)) {
    throw new Error("MTA_MAX_STATIONS_PER_PROPERTY must be a number when provided");
  }
  if (maxDistanceMeters !== undefined && !Number.isFinite(maxDistanceMeters)) {
    throw new Error("MTA_MAX_DISTANCE_METERS must be a number when provided");
  }

  try {
    const summary = await runLoggedIngestion(prisma, "ingest-mta", () =>
      ingestMtaTransit(prisma, {
        endpoint: process.env.MTA_STATIONS_ENDPOINT,
        appToken: process.env.NYC_OPEN_DATA_APP_TOKEN,
        limit,
        maxStationsPerProperty,
        maxDistanceMeters,
      }),
    );

    console.table(summary);
    console.log("MTA transit ingestion finished.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("MTA transit ingestion failed", error);
  process.exitCode = 1;
});

