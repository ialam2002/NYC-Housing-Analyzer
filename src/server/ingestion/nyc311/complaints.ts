import { Borough, ComplaintCategory, DataSource, PrismaClient } from "@prisma/client";
import { z } from "zod";

import {
  buildPropertyMatchCandidates,
  findBestPropertyMatch,
  rescoreProperties,
  toNumber,
} from "@/server/ingestion/shared/property-matching";
import { getPropertyScore } from "@/server/services/score.service";

const DEFAULT_ENDPOINT = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";
const DEFAULT_LIMIT = 500;
const DEFAULT_DAYS_BACK = 30;

const boroughMap: Record<string, Borough | undefined> = {
  MANHATTAN: Borough.MANHATTAN,
  BROOKLYN: Borough.BROOKLYN,
  QUEENS: Borough.QUEENS,
  BRONX: Borough.BRONX,
  "STATEN ISLAND": Borough.STATEN_ISLAND,
};

const nyc311RowSchema = z.object({
  unique_key: z.string().optional(),
  borough: z.string().optional(),
  complaint_type: z.string().optional(),
  descriptor: z.string().optional(),
  status: z.string().optional(),
  created_date: z.string().optional(),
  incident_address: z.string().optional(),
  incident_zip: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

type NYC311Complaint = {
  externalId: string;
  borough: Borough;
  category: ComplaintCategory;
  subcategory: string | null;
  description: string | null;
  status: string;
  reportedAt: Date;
  incidentAddress: string | null;
  incidentZip: string | null;
  latitude: number | null;
  longitude: number | null;
};

type Ingest311ComplaintsOptions = {
  endpoint?: string;
  appToken?: string;
  limit?: number;
  daysBack?: number;
};

export type Ingest311ComplaintsSummary = {
  fetched: number;
  processed: number;
  upserted: number;
  skippedInvalid: number;
  skippedNoProperty: number;
  rescored: number;
  rescoreFailed: number;
};

export { normalizeAddress, rescoreProperties } from "@/server/ingestion/shared/property-matching";

export function mapComplaintCategory(complaintType: string): ComplaintCategory {
  const normalized = complaintType.toUpperCase();

  if (normalized.includes("HEAT") || normalized.includes("HOT WATER")) {
    return ComplaintCategory.HEAT_HOT_WATER;
  }
  if (normalized.includes("RODENT") || normalized.includes("MICE") || normalized.includes("RAT")) {
    return ComplaintCategory.RODENTS;
  }
  if (normalized.includes("NOISE")) {
    return ComplaintCategory.NOISE;
  }
  if (normalized.includes("SANIT") || normalized.includes("UNSANITARY")) {
    return ComplaintCategory.SANITATION;
  }

  return ComplaintCategory.OTHER;
}

function toBoroughEnum(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return boroughMap[value.toUpperCase().trim()];
}

function parseDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

async function fetchComplaints(options: Ingest311ComplaintsOptions): Promise<NYC311Complaint[]> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const daysBack = options.daysBack ?? DEFAULT_DAYS_BACK;
  const endpoint = options.endpoint ?? process.env.NYC_311_ENDPOINT ?? DEFAULT_ENDPOINT;

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - daysBack);

  const query = new URLSearchParams({
    $limit: String(limit),
    $order: "created_date DESC",
    $where: `created_date >= '${sinceDate.toISOString()}'`,
  });

  const response = await fetch(`${endpoint}?${query.toString()}`, {
    headers: {
      ...(options.appToken ? { "X-App-Token": options.appToken } : {}),
      ...(process.env.NYC_OPEN_DATA_APP_TOKEN ? { "X-App-Token": process.env.NYC_OPEN_DATA_APP_TOKEN } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`NYC 311 request failed (${response.status})`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    throw new Error("NYC 311 response payload is not an array");
  }

  const rows = payload
    .map((row) => nyc311RowSchema.safeParse(row))
    .filter((result): result is { success: true; data: z.infer<typeof nyc311RowSchema> } => result.success)
    .map((result) => result.data);

  const complaints: NYC311Complaint[] = [];

  for (const row of rows) {
    const borough = toBoroughEnum(row.borough);
    const reportedAt = parseDate(row.created_date);
    const externalId = row.unique_key?.trim();
    const complaintType = row.complaint_type?.trim();

    if (!borough || !reportedAt || !externalId || !complaintType) {
      continue;
    }

    complaints.push({
      externalId,
      borough,
      category: mapComplaintCategory(complaintType),
      subcategory: row.descriptor?.trim() || null,
      description: complaintType,
      status: row.status?.trim() || "Unknown",
      reportedAt,
      incidentAddress: row.incident_address?.trim() || null,
      incidentZip: row.incident_zip?.trim() || null,
      latitude: toNumber(row.latitude),
      longitude: toNumber(row.longitude),
    });
  }

  return complaints;
}

export async function ingest311Complaints(
  prisma: PrismaClient,
  options: Ingest311ComplaintsOptions = {},
): Promise<Ingest311ComplaintsSummary> {
  const fetchedComplaints = await fetchComplaints(options);
  const properties = await prisma.property.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      borough: true,
      postalCode: true,
      addressLine1: true,
      latitude: true,
      longitude: true,
    },
  });

  const candidates = buildPropertyMatchCandidates(properties);

  let upserted = 0;
  let skippedNoProperty = 0;
  let skippedInvalid = 0;
  let processed = 0;
  const affectedPropertyIds = new Set<string>();

  for (const complaint of fetchedComplaints) {
    processed += 1;
    const property = findBestPropertyMatch(complaint, candidates);

    if (!property) {
      skippedNoProperty += 1;
      continue;
    }

    try {
      await prisma.complaint.upsert({
        where: { externalId: complaint.externalId },
        update: {
          propertyId: property.id,
          category: complaint.category,
          subcategory: complaint.subcategory,
          description: complaint.description,
          status: complaint.status,
          reportedAt: complaint.reportedAt,
          latitude: complaint.latitude,
          longitude: complaint.longitude,
          source: DataSource.NYC_OPEN_DATA,
        },
        create: {
          externalId: complaint.externalId,
          propertyId: property.id,
          category: complaint.category,
          subcategory: complaint.subcategory,
          description: complaint.description,
          status: complaint.status,
          reportedAt: complaint.reportedAt,
          latitude: complaint.latitude,
          longitude: complaint.longitude,
          source: DataSource.NYC_OPEN_DATA,
        },
      });
      upserted += 1;
      affectedPropertyIds.add(property.id);
    } catch {
      skippedInvalid += 1;
    }
  }

  const { rescored, rescoreFailed } = await rescoreProperties(affectedPropertyIds, (propertyId) =>
    getPropertyScore(propertyId, true),
  );

  return {
    fetched: fetchedComplaints.length,
    processed,
    upserted,
    skippedInvalid,
    skippedNoProperty,
    rescored,
    rescoreFailed,
  };
}

