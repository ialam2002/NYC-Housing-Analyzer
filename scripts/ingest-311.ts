import { PrismaClient } from "@prisma/client";

import { ingest311Complaints } from "../src/server/ingestion/nyc311/complaints";
import { runLoggedIngestion } from "../src/server/ingestion/shared/run-logger";

async function main() {
  const prisma = new PrismaClient({ log: ["error", "warn"] });
  const limit = process.env.NYC_311_LIMIT ? Number(process.env.NYC_311_LIMIT) : undefined;
  const daysBack = process.env.NYC_311_DAYS_BACK ? Number(process.env.NYC_311_DAYS_BACK) : undefined;

  if (limit !== undefined && !Number.isFinite(limit)) {
    throw new Error("NYC_311_LIMIT must be a number when provided");
  }
  if (daysBack !== undefined && !Number.isFinite(daysBack)) {
    throw new Error("NYC_311_DAYS_BACK must be a number when provided");
  }

  try {
    const summary = await runLoggedIngestion(prisma, "ingest-311", () =>
      ingest311Complaints(prisma, {
        limit,
        daysBack,
        endpoint: process.env.NYC_311_ENDPOINT,
        appToken: process.env.NYC_OPEN_DATA_APP_TOKEN,
      }),
    );

    console.table(summary);
    console.log("NYC 311 ingestion finished.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("NYC 311 ingestion failed", error);
  process.exitCode = 1;
});

