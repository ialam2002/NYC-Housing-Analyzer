import { Borough, DataSource, PrismaClient, ViolationSeverity } from "@prisma/client";
import { z } from "zod";

import {
  buildPropertyMatchCandidates,
  findBestPropertyMatch,
  rescoreProperties,
  toNumber,
} from "@/server/ingestion/shared/property-matching";
import { getPropertyScore } from "@/server/services/score.service";

const DEFAULT_ENDPOINT = "https://data.cityofnewyork.us/resource/wvxf-dwi5.json";
const DEFAULT_LIMIT = 500;
const DEFAULT_DAYS_BACK = 30;

const boroughMap: Record<string, Borough | undefined> = {
  "MANHATTAN": Borough.MANHATTAN,
  "MN": Borough.MANHATTAN,
  "NEW YORK": Borough.MANHATTAN,
  "BROOKLYN": Borough.BROOKLYN,
  "BK": Borough.BROOKLYN,
  "KINGS": Borough.BROOKLYN,
  "QUEENS": Borough.QUEENS,
  "QN": Borough.QUEENS,
  "BRONX": Borough.BRONX,
  "BX": Borough.BRONX,
  "STATEN_ISLAND": Borough.STATEN_ISLAND,
  "STATEN ISLAND": Borough.STATEN_ISLAND,
  "SI": Borough.STATEN_ISLAND,
  "RICHMOND": Borough.STATEN_ISLAND,
};

const hpdViolationRowSchema = z.object({
  violationid: z.union([z.string(), z.number()]).optional(),
  violation_id: z.union([z.string(), z.number()]).optional(),
  id: z.union([z.string(), z.number()]).optional(),
  borough: z.string().optional(),
  boro: z.string().optional(),
  boroid: z.string().optional(),
  housenumber: z.string().optional(),
  lowhousenumber: z.string().optional(),
  streetname: z.string().optional(),
  zipcode: z.union([z.string(), z.number()]).optional(),
  zip: z.union([z.string(), z.number()]).optional(),
  novissueddate: z.string().optional(),
  currentstatusdate: z.string().optional(),
  currentstatus: z.string().optional(),
  novtype: z.string().optional(),
  class: z.string().optional(),
  violationstatus: z.string().optional(),
  latitude: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
});

type HpdViolationRow = z.infer<typeof hpdViolationRowSchema>;

type HpdViolation = {
  externalId: string;
  borough: Borough;
  incidentAddress: string | null;
  incidentZip: string | null;
  latitude: number | null;
  longitude: number | null;
  agency: string;
  code: string | null;
  description: string;
  severity: ViolationSeverity;
  status: string;
  issuedAt: Date;
  resolvedAt: Date | null;
};

type IngestHpdViolationsOptions = {
  endpoint?: string;
  appToken?: string;
  limit?: number;
  daysBack?: number;
};

export type IngestHpdViolationsSummary = {
  fetched: number;
  processed: number;
  upserted: number;
  skippedInvalid: number;
  skippedNoProperty: number;
  rescored: number;
  rescoreFailed: number;
};

function toBoroughEnum(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return boroughMap[value.toUpperCase().trim().replace(/\s+/g, " ")];
}

function toStringValue(value: string | number | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function parseDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildIncidentAddress(row: HpdViolationRow) {
  const houseNumber = row.housenumber?.trim() || row.lowhousenumber?.trim() || "";
  const streetName = row.streetname?.trim() || "";
  const fullAddress = `${houseNumber} ${streetName}`.trim();
  return fullAddress.length > 0 ? fullAddress : null;
}

export function normalizeViolationStatus(status: string | undefined) {
  const normalized = status?.trim().toUpperCase() ?? "";

  if (
    normalized.includes("CLOSE") ||
    normalized.includes("CERTIFIED") ||
    normalized.includes("CORRECTED") ||
    normalized.includes("COMPLIED") ||
    normalized.includes("DISMISS") ||
    normalized.includes("RESOLVED")
  ) {
    return "Closed";
  }

  if (
    normalized.includes("OPEN") ||
    normalized.includes("ACTIVE") ||
    normalized.includes("OUTSTANDING") ||
    normalized.includes("DEFAULT")
  ) {
    return "Open";
  }

  return status?.trim() || "Open";
}

export function mapViolationSeverity(violationClass: string | undefined, description: string | undefined) {
  const normalizedClass = violationClass?.trim().toUpperCase() ?? "";
  const normalizedDescription = description?.trim().toUpperCase() ?? "";

  if (normalizedClass === "C" || normalizedDescription.includes("IMMEDIATELY HAZARDOUS")) {
    return ViolationSeverity.CRITICAL;
  }

  if (normalizedClass === "A" || normalizedDescription.includes("NON HAZARDOUS")) {
    return ViolationSeverity.MEDIUM;
  }

  if (normalizedClass === "B" || normalizedDescription.includes("HAZARDOUS")) {
    return ViolationSeverity.HIGH;
  }

  return ViolationSeverity.MEDIUM;
}

export function mapHpdViolationRow(row: HpdViolationRow): HpdViolation | null {
  const externalId =
    toStringValue(row.violationid) ?? toStringValue(row.violation_id) ?? toStringValue(row.id);
  const borough = toBoroughEnum(row.borough ?? row.boro ?? row.boroid);
  const issuedAt = parseDate(row.novissueddate) ?? parseDate(row.currentstatusdate);
  const description = row.novtype?.trim() || "HPD housing maintenance violation";

  if (!externalId || !borough || !issuedAt) {
    return null;
  }

  return {
    externalId,
    borough,
    incidentAddress: buildIncidentAddress(row),
    incidentZip: toStringValue(row.zipcode) ?? toStringValue(row.zip),
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    agency: "HPD",
    code: row.class?.trim() || null,
    description,
    severity: mapViolationSeverity(row.class, description),
    status: normalizeViolationStatus(row.currentstatus ?? row.violationstatus),
    issuedAt,
    resolvedAt: normalizeViolationStatus(row.currentstatus ?? row.violationstatus) === "Closed"
      ? parseDate(row.currentstatusdate)
      : null,
  };
}

async function fetchViolations(options: IngestHpdViolationsOptions): Promise<HpdViolation[]> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const daysBack = options.daysBack ?? DEFAULT_DAYS_BACK;
  const endpoint = options.endpoint ?? process.env.HPD_VIOLATIONS_ENDPOINT ?? DEFAULT_ENDPOINT;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - daysBack);

  const query = new URLSearchParams({
    $limit: String(limit),
    $order: "novissueddate DESC",
    $where: `novissueddate >= '${sinceDate.toISOString()}'`,
  });

  const response = await fetch(`${endpoint}?${query.toString()}`, {
    headers: {
      ...(options.appToken ? { "X-App-Token": options.appToken } : {}),
      ...(process.env.NYC_OPEN_DATA_APP_TOKEN ? { "X-App-Token": process.env.NYC_OPEN_DATA_APP_TOKEN } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HPD violations request failed (${response.status})`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    throw new Error("HPD violations response payload is not an array");
  }

  return payload
    .map((row) => hpdViolationRowSchema.safeParse(row))
    .filter((result): result is { success: true; data: HpdViolationRow } => result.success)
    .map((result) => mapHpdViolationRow(result.data))
    .filter((violation): violation is HpdViolation => violation !== null);
}

export async function ingestHpdViolations(
  prisma: PrismaClient,
  options: IngestHpdViolationsOptions = {},
): Promise<IngestHpdViolationsSummary> {
  const fetchedViolations = await fetchViolations(options);
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
  let processed = 0;
  let upserted = 0;
  let skippedInvalid = 0;
  let skippedNoProperty = 0;
  const affectedPropertyIds = new Set<string>();

  for (const violation of fetchedViolations) {
    processed += 1;

    const property = findBestPropertyMatch(violation, candidates);
    if (!property) {
      skippedNoProperty += 1;
      continue;
    }

    try {
      await prisma.buildingViolation.upsert({
        where: { externalId: violation.externalId },
        update: {
          propertyId: property.id,
          agency: violation.agency,
          code: violation.code,
          description: violation.description,
          severity: violation.severity,
          status: violation.status,
          issuedAt: violation.issuedAt,
          resolvedAt: violation.resolvedAt,
          source: DataSource.HPD,
        },
        create: {
          externalId: violation.externalId,
          propertyId: property.id,
          agency: violation.agency,
          code: violation.code,
          description: violation.description,
          severity: violation.severity,
          status: violation.status,
          issuedAt: violation.issuedAt,
          resolvedAt: violation.resolvedAt,
          source: DataSource.HPD,
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
    fetched: fetchedViolations.length,
    processed,
    upserted,
    skippedInvalid,
    skippedNoProperty,
    rescored,
    rescoreFailed,
  };
}

