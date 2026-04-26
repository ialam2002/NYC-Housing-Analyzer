import { Prisma, PrismaClient } from "@prisma/client";

const MAX_ERROR_LENGTH = 1500;

function toIngestionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.stack?.slice(0, MAX_ERROR_LENGTH) ?? error.message.slice(0, MAX_ERROR_LENGTH);
  }

  if (typeof error === "string") {
    return error.slice(0, MAX_ERROR_LENGTH);
  }

  try {
    return JSON.stringify(error).slice(0, MAX_ERROR_LENGTH);
  } catch {
    return "Unknown ingestion error";
  }
}

export async function runLoggedIngestion<T extends Record<string, number | string | boolean | null>>(
  prisma: PrismaClient,
  jobName: string,
  task: () => Promise<T>,
): Promise<T> {
  const run = await prisma.ingestionRun.create({
    data: {
      jobName,
      status: "RUNNING",
    },
    select: {
      id: true,
    },
  });

  try {
    const summary = await task();

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCEEDED",
        summary: summary as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    });

    return summary;
  } catch (error) {
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: toIngestionErrorMessage(error),
        finishedAt: new Date(),
      },
    });

    throw error;
  }
}

