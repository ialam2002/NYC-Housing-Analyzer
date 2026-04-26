import { PrismaClient } from "@prisma/client";
import { ingestDobViolations } from "../src/server/ingestion/dob/violations";
import { runLoggedIngestion } from "../src/server/ingestion/shared/run-logger";
async function main() {
  const prisma = new PrismaClient({ log: ["error", "warn"] });
  const limit = process.env.DOB_VIOLATIONS_LIMIT ? Number(process.env.DOB_VIOLATIONS_LIMIT) : undefined;
  const daysBack = process.env.DOB_VIOLATIONS_DAYS_BACK ? Number(process.env.DOB_VIOLATIONS_DAYS_BACK) : undefined;
  if (limit !== undefined && !Number.isFinite(limit)) {
    throw new Error("DOB_VIOLATIONS_LIMIT must be a number when provided");
  }
  if (daysBack !== undefined && !Number.isFinite(daysBack)) {
    throw new Error("DOB_VIOLATIONS_DAYS_BACK must be a number when provided");
  }
  try {
    const summary = await runLoggedIngestion(prisma, "ingest-dob", () =>
      ingestDobViolations(prisma, {
        limit,
        daysBack,
        endpoint: process.env.DOB_VIOLATIONS_ENDPOINT,
        appToken: process.env.NYC_OPEN_DATA_APP_TOKEN,
        dateField: process.env.DOB_VIOLATIONS_DATE_FIELD,
      }),
    );
    console.table(summary);
    console.log("DOB violations ingestion finished.");
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error("DOB violations ingestion failed", error);
  process.exitCode = 1;
});
