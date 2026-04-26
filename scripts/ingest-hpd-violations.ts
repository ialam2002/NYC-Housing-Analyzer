import { PrismaClient } from "@prisma/client";

import { ingestHpdViolations } from "../src/server/ingestion/hpd/violations";
import { runLoggedIngestion } from "../src/server/ingestion/shared/run-logger";

async function main() {
  const prisma = new PrismaClient({ log: ["error", "warn"] });
  const limit = process.env.HPD_VIOLATIONS_LIMIT ? Number(process.env.HPD_VIOLATIONS_LIMIT) : undefined;
  const daysBack = process.env.HPD_VIOLATIONS_DAYS_BACK ? Number(process.env.HPD_VIOLATIONS_DAYS_BACK) : undefined;

  if (limit !== undefined && !Number.isFinite(limit)) {
    throw new Error("HPD_VIOLATIONS_LIMIT must be a number when provided");
  }

  if (daysBack !== undefined && !Number.isFinite(daysBack)) {
    throw new Error("HPD_VIOLATIONS_DAYS_BACK must be a number when provided");
  }

  try {
    const summary = await runLoggedIngestion(prisma, "ingest-hpd", () =>
      ingestHpdViolations(prisma, {
        limit,
        daysBack,
        endpoint: process.env.HPD_VIOLATIONS_ENDPOINT,
        appToken: process.env.NYC_OPEN_DATA_APP_TOKEN,
      }),
    );

    console.table(summary);
    console.log("HPD violations ingestion finished.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("HPD violations ingestion failed", error);
  process.exitCode = 1;
});

