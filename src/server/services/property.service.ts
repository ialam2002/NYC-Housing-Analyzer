import { AmenityType, ComplaintCategory, ViolationSeverity } from "@prisma/client";

import { findPropertyDashboardById } from "@/server/repositories/property.repository";
import type {
  AmenitiesSummary,
  ComplaintTrendPoint,
  ComplaintsSummary,
  PropertyDashboardResponseData,
  TransitSummary,
  ViolationsSummary,
} from "@/types/property";

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function buildComplaintSummary(
  complaints: Awaited<ReturnType<typeof findPropertyDashboardById>> extends infer R
    ? R extends { complaints: infer C }
      ? C
      : never
    : never,
): ComplaintsSummary {
  const byCategory: Record<ComplaintCategory, number> = {
    NOISE: 0,
    HEAT_HOT_WATER: 0,
    RODENTS: 0,
    SANITATION: 0,
    OTHER: 0,
  };

  const trendMap = new Map<string, ComplaintTrendPoint>();
  let open = 0;

  for (const complaint of complaints) {
    byCategory[complaint.category] += 1;

    if ((complaint.status ?? "").toLowerCase() !== "closed") {
      open += 1;
    }

    const key = monthKey(complaint.reportedAt);
    const existing = trendMap.get(key) ?? {
      month: key,
      noise: 0,
      heatHotWater: 0,
      rodents: 0,
      sanitation: 0,
    };

    if (complaint.category === ComplaintCategory.NOISE) {
      existing.noise += 1;
    } else if (complaint.category === ComplaintCategory.HEAT_HOT_WATER) {
      existing.heatHotWater += 1;
    } else if (complaint.category === ComplaintCategory.RODENTS) {
      existing.rodents += 1;
    } else if (complaint.category === ComplaintCategory.SANITATION) {
      existing.sanitation += 1;
    }

    trendMap.set(key, existing);
  }

  const trends = [...trendMap.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-12);

  return {
    total: complaints.length,
    open,
    byCategory,
    trends,
  };
}

function buildTransitSummary(
  connections: Awaited<ReturnType<typeof findPropertyDashboardById>> extends infer R
    ? R extends { subwayConnections: infer C }
      ? C
      : never
    : never,
): TransitSummary {
  if (connections.length === 0) {
    return {
      nearestStations: [],
      avgWalkingMinutes: null,
      bestWalkingMinutes: null,
    };
  }

  const totalMinutes = connections.reduce((sum, item) => sum + item.walkingMinutes, 0);

  return {
    nearestStations: connections.map((item) => ({
      stationId: item.station.id,
      name: item.station.name,
      lines: item.station.lines,
      latitude: Number(item.station.latitude),
      longitude: Number(item.station.longitude),
      distanceMeters: item.distanceMeters,
      walkingMinutes: item.walkingMinutes,
    })),
    avgWalkingMinutes: Math.round((totalMinutes / connections.length) * 10) / 10,
    bestWalkingMinutes: connections[0]?.walkingMinutes ?? null,
  };
}

function buildViolationsSummary(
  violations: Awaited<ReturnType<typeof findPropertyDashboardById>> extends infer R
    ? R extends { violations: infer V }
      ? V
      : never
    : never,
): ViolationsSummary {
  const bySeverity: Record<ViolationSeverity, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  let open = 0;

  for (const violation of violations) {
    bySeverity[violation.severity] += 1;
    if (violation.status.toLowerCase() !== "closed") {
      open += 1;
    }
  }

  return {
    total: violations.length,
    open,
    bySeverity,
    recent: violations.slice(0, 10).map((violation) => ({
      id: violation.id,
      agency: violation.agency,
      code: violation.code,
      description: violation.description,
      severity: violation.severity,
      status: violation.status,
      issuedAt: violation.issuedAt.toISOString(),
      resolvedAt: violation.resolvedAt ? violation.resolvedAt.toISOString() : null,
    })),
  };
}

function buildAmenitiesSummary(
  nearbyAmenities: Awaited<ReturnType<typeof findPropertyDashboardById>> extends infer R
    ? R extends { nearbyAmenities: infer A }
      ? A
      : never
    : never,
): AmenitiesSummary {
  const byType: Record<AmenityType, number> = {
    GROCERY: 0,
    PHARMACY: 0,
    PARK: 0,
    GYM: 0,
  };

  for (const item of nearbyAmenities) {
    byType[item.amenity.type] += 1;
  }

  return {
    byType,
    nearest: nearbyAmenities.slice(0, 12).map((item) => ({
      id: item.amenity.id,
      name: item.amenity.name,
      type: item.amenity.type,
      distanceMeters: item.distanceMeters,
    })),
  };
}

export async function getPropertyDashboard(propertyId: string): Promise<PropertyDashboardResponseData | null> {
  const property = await findPropertyDashboardById(propertyId);

  if (!property) {
    return null;
  }

  const latestScore = property.scores[0];

  return {
    property: {
      id: property.id,
      title: property.title,
      addressLine1: property.addressLine1,
      addressLine2: property.addressLine2,
      city: property.city,
      state: property.state,
      postalCode: property.postalCode,
      borough: property.borough,
      neighborhood: property.neighborhood.name,
      latitude: Number(property.latitude),
      longitude: Number(property.longitude),
      rent: property.rent,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms ? Number(property.bathrooms) : null,
      squareFeet: property.squareFeet,
      buildingName: property.buildingName,
      yearBuilt: property.yearBuilt,
    },
    scoreBreakdown: latestScore
      ? {
          overall: latestScore.overall,
          transit: latestScore.transit,
          complaints: latestScore.complaints,
          amenities: latestScore.amenities,
          safety: latestScore.safety,
          buildingCondition: latestScore.buildingCondition,
        }
      : null,
    transit: buildTransitSummary(property.subwayConnections),
    complaints: buildComplaintSummary(property.complaints),
    violations: buildViolationsSummary(property.violations),
    amenities: buildAmenitiesSummary(property.nearbyAmenities),
  };
}

