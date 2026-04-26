import { Borough, DataSource, PrismaClient, ViolationSeverity } from "@prisma/client";
import { z } from "zod";

import {
  buildPropertyMatchCandidates,
  findBestPropertyMatch,
  rescoreProperties,
  toNumber,
} from "@/server/ingestion/shared/property-matching";
import { getPropertyScore } from "@/server/services/score.service";

const DEFAULT_ENDPOINT = "https://data.cityofnewyork.us/resource/eabe-havv.json";
const DEFAULT_LIMIT = 500;
const DEFAULT_DAYS_BACK = 30;
const DEFAULT_DATE_FIELD = "date_entered";

const boroughMap: Record<string, Borough | undefined> = {
  MANHATTAN: Borough.MANHATTAN,
  MN: Borough.MANHATTAN,
  "NEW YORK": Borough.MANHATTAN,
  BROOKLYN: Borough.BROOKLYN,
  BK: Borough.BROOKLYN,
  KINGS: Borough.BROOKLYN,
  QUEENS: Borough.QUEENS,
  QN: Borough.QUEENS,
  BRONX: Borough.BRONX,
  BX: Borough.BRONX,
  "STATEN ISLAND": Borough.STATEN_ISLAND,
  SI: Borough.STATEN_ISLAND,
  RICHMOND: Borough.STATEN_ISLAND,
};

const dobViolationRowSchema = z.object({
  complaint_number: z.union([z.string(), z.number()]).optional(),
  complaintnumber: z.union([z.string(), z.number()]).optional(),
  complaint_id: z.union([z.string(), z.number()]).optional(),
  id: z.union([z.string(), z.number()]).optional(),
  borough: z.string().optional(),
  boro: z.string().optional(),
  house_number: z.string().optional(),
  housenumber: z.string().optional(),
  lowhousenumber: z.string().optional(),
  street_name: z.string().optional(),
  streetname: z.string().optional(),
  zipcode: z.union([z.string(), z.number()]).optional(),
  zip: z.union([z.string(), z.number()]).optional(),
  category: z.string().optional(),
  complaint_category: z.string().optional(),
  disposition: z.string().optional(),
  disposition_description: z.string().optional(),
  status: z.string().optional(),
  complaint_status: z.string().optional(),
  priority: z.string().optional(),
  severity: z.string().optional(),
  date_entered: z.string().optional(),
  received_date: z.string().optional(),
  disposition_date: z.string().optional(),
  resolved_date: z.string().optional(),
  latitude: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
});

type DobViolationRow = z.infer<typeof dobViolationRowSchema>;

type DobViolation = {
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

type IngestDobViolationsOptions = {
  endpoint?: string;
  appToken?: string;
  limit?: number;
  daysBack?: number;
  dateField?: string;
};

export type IngestDobViolationsSummary = {
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

function buildIncidentAddress(row: DobViolationRow) {
  const houseNumber = row.house_number?.trim() || row.housenumber?.trim() || row.lowhousenumber?.trim() || "";
  const streetName = row.street_name?.trim() || row.streetname?.trim() || "";
  const fullAddress = `${houseNumber} ${streetName}`.trim();
  return fullAddress.length > 0 ? fullAddress : null;
}

export function normalizeDobStatus(status: string | undefined, disposition: string | undefined) {
  const normalized = `${status ?? ""} ${disposition ?? ""}`.trim().toUpperCase();

  if (
    normalized.includes("CLOSE") ||
    normalized.includes("RESOLVED") ||
    normalized.includes("DISMISSED") ||
    normalized.includes("CORRECTED") ||
    normalized.includes("COMPLIED")
  ) {
    return "Closed";
  }

  if (
    normalized.includes("OPEN") ||
    normalized.includes("ACTIVE") ||
    normalized.includes("PENDING") ||
    normalized.includes("ISSUED") ||
    normalized.includes("RECEIVED")
  ) {
    return "Open";
  }

  return status?.trim() || disposition?.trim() || "Open";
}

export function mapDobSeverity(
  severityValue: string | undefined,
  priority: string | undefined,
  description: string | undefined,
) {
  const normalized = `${severityValue ?? ""} ${priority ?? ""} ${description ?? ""}`.trim().toUpperCase();

  if (
    normalized.includes("CRITICAL") ||
    normalized.includes("IMMEDIAT") ||
    normalized.includes("UNSAFE") ||
    normalized.includes("COLLAPSE") ||
    normalized.includes("STOP WORK")
  ) {
    return ViolationSeverity.CRITICAL;
  }

  if (
    normalized.includes("HIGH") ||
    normalized.includes("HAZARD") ||
    normalized.includes("DANGEROUS") ||
    normalized.includes("CLASS 1")
  ) {
    return ViolationSeverity.HIGH;
  }

  if (
    normalized.includes("LOW") ||
    normalized.includes("MINOR") ||
    normalized.includes("CLASS 3")
  ) {
    return ViolationSeverity.LOW;
  }

  return ViolationSeverity.MEDIUM;
}

export function mapDobViolationRow(row: DobViolationRow): DobViolation | null {
  const rawExternalId =
    toStringValue(row.complaint_number) ??
    toStringValue(row.complaintnumber) ??
    toStringValue(row.complaint_id) ??
    toStringValue(row.id);
  const borough = toBoroughEnum(row.borough ?? row.boro);
  const description = row.category?.trim() || row.complaint_category?.trim() || "DOB complaint or violation";
  const status = normalizeDobStatus(row.status ?? row.complaint_status, row.disposition ?? row.disposition_description);
  const issuedAt = parseDate(row.date_entered) ?? parseDate(row.received_date) ?? parseDate(row.disposition_date);

  if (!rawExternalId || !borough || !issuedAt) {
    return null;
  }

  return {
    externalId: `DOB:${rawExternalId}`,
    borough,
    incidentAddress: buildIncidentAddress(row),
    incidentZip: toStringValue(row.zipcode) ?? toStringValue(row.zip),
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    agency: "DOB",
    code: row.priority?.trim() || row.severity?.trim() || null,
    description,
    severity: mapDobSeverity(row.severity, row.priority, description),
    status,
    issuedAt,
    resolvedAt: status === "Closed" ? parseDate(row.disposition_date) ?? parseDate(row.resolved_date) : null,
  };
}

async function fetchViolations(options: IngestDobViolationsOptions): Promise<DobViolation[]> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const daysBack = options.daysBack ?? DEFAULT_DAYS_BACK;
  const endpoint = options.endpoint ?? process.env.DOB_VIOLATIONS_ENDPOINT ?? DEFAULT_ENDPOINT;
  const dateField = options.dateField ?? process.env.DOB_VIOLATIONS_DATE_FIELD ?? DEFAULT_DATE_FIELD;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - daysBack);

  const query = new URLSearchParams({
    $limit: String(limit),
    $order: `${dateField} DESC`,
    $where: `${dateField} >= '${sinceDate.toISOString()}'`,
  });

  const response = await fetch(`${endpoint}?${query.toString()}`, {
    headers: {
      ...(options.appToken ? { "X-App-Token": options.appToken } : {}),
      ...(process.env.NYC_OPEN_DATA_APP_TOKEN ? { "X-App-Token": process.env.NYC_OPEN_DATA_APP_TOKEN } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`DOB violations request failed (${response.status})`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    throw new Error("DOB violations response payload is not an array");
  }

  return payload
    .map((row) => dobViolationRowSchema.safeParse(row))
    .filter((result): result is { success: true; data: DobViolationRow } => result.success)
    .map((result) => mapDobViolationRow(result.data))
    .filter((violation): violation is DobViolation => violation !== null);
}

export async function ingestDobViolations(
  prisma: PrismaClient,
  options: IngestDobViolationsOptions = {},
): Promise<IngestDobViolationsSummary> {
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
          source: DataSource.DOB,
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
          source: DataSource.DOB,
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

