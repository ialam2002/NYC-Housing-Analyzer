import { AmenityType, Borough, ComplaintCategory, ViolationSeverity } from "@prisma/client";

import type { ScoreBreakdown } from "@/types/domain";
import type { ScoreComputationDetails } from "@/types/score";

const ALGORITHM_VERSION = "mvp-v1";

const WEIGHTS = {
  transit: 0.25,
  complaints: 0.2,
  amenities: 0.2,
  safety: 0.15,
  buildingCondition: 0.2,
} as const;

type ScoreSignals = {
  borough: Borough;
  subwayConnections: Array<{ walkingMinutes: number; distanceMeters: number }>;
  complaints: Array<{ category: ComplaintCategory; status: string | null }>;
  nearbyAmenities: Array<{ distanceMeters: number; amenity: { type: AmenityType } }>;
  violations: Array<{ severity: ViolationSeverity; status: string }>;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function computeTransitScore(connections: ScoreSignals["subwayConnections"]) {
  if (connections.length === 0) {
    return 20;
  }

  const top = connections.slice(0, 3);
  const best = top[0].walkingMinutes;
  const avg = top.reduce((sum, item) => sum + item.walkingMinutes, 0) / top.length;
  const within10 = connections.filter((item) => item.walkingMinutes <= 10).length;

  return Math.round(clamp(100 - best * 6 - avg * 2 + within10 * 4));
}

function computeComplaintsScore(complaints: ScoreSignals["complaints"]) {
  if (complaints.length === 0) {
    return 95;
  }

  const categoryWeight: Record<ComplaintCategory, number> = {
    NOISE: 1,
    HEAT_HOT_WATER: 1.25,
    RODENTS: 1.45,
    SANITATION: 1.15,
    OTHER: 1,
  };

  const weighted = complaints.reduce((sum, complaint) => {
    const isOpen = (complaint.status ?? "").toLowerCase() !== "closed";
    const openMultiplier = isOpen ? 1.3 : 1;
    return sum + categoryWeight[complaint.category] * openMultiplier;
  }, 0);

  return Math.round(clamp(100 - weighted * 8));
}

function computeAmenitiesScore(nearbyAmenities: ScoreSignals["nearbyAmenities"]) {
  if (nearbyAmenities.length === 0) {
    return 20;
  }

  const typeSet = new Set(nearbyAmenities.map((item) => item.amenity.type));
  const diversityPoints = (typeSet.size / 4) * 50;

  const nearestByType: Record<AmenityType, number | null> = {
    GROCERY: null,
    PHARMACY: null,
    PARK: null,
    GYM: null,
  };

  for (const item of nearbyAmenities) {
    const current = nearestByType[item.amenity.type];
    if (current === null || item.distanceMeters < current) {
      nearestByType[item.amenity.type] = item.distanceMeters;
    }
  }

  const proximityPoints = Object.values(nearestByType).reduce<number>((sum, distance) => {
    if (distance === null) {
      return sum;
    }

    if (distance <= 300) {
      return sum + 12.5;
    }
    if (distance <= 700) {
      return sum + 8;
    }
    if (distance <= 1200) {
      return sum + 4;
    }

    return sum;
  }, 0);

  return Math.round(clamp(diversityPoints + proximityPoints));
}

function computeSafetyScore(
  borough: Borough,
  complaints: ScoreSignals["complaints"],
  violations: ScoreSignals["violations"],
) {
  const boroughBaseline: Record<Borough, number> = {
    MANHATTAN: 78,
    BROOKLYN: 74,
    QUEENS: 80,
    BRONX: 68,
    STATEN_ISLAND: 82,
  };

  const openNoiseOrRodentComplaints = complaints.filter((complaint) => {
    const isOpen = (complaint.status ?? "").toLowerCase() !== "closed";
    return isOpen && (complaint.category === ComplaintCategory.NOISE || complaint.category === ComplaintCategory.RODENTS);
  }).length;

  const severeOpenViolations = violations.filter((violation) => {
    const open = violation.status.toLowerCase() !== "closed";
    return open && (violation.severity === ViolationSeverity.HIGH || violation.severity === ViolationSeverity.CRITICAL);
  }).length;

  const penalty = openNoiseOrRodentComplaints * 3 + severeOpenViolations * 4;
  return Math.round(clamp(boroughBaseline[borough] - penalty));
}

function computeBuildingConditionScore(
  complaints: ScoreSignals["complaints"],
  violations: ScoreSignals["violations"],
) {
  const severityPenalty: Record<ViolationSeverity, number> = {
    LOW: 5,
    MEDIUM: 10,
    HIGH: 18,
    CRITICAL: 28,
  };

  const violationPenalty = violations.reduce((sum, violation) => {
    if (violation.status.toLowerCase() === "closed") {
      return sum;
    }

    return sum + severityPenalty[violation.severity];
  }, 0);

  const openHeatComplaints = complaints.filter(
    (complaint) =>
      complaint.category === ComplaintCategory.HEAT_HOT_WATER && (complaint.status ?? "").toLowerCase() !== "closed",
  ).length;

  return Math.round(clamp(100 - violationPenalty - openHeatComplaints * 8));
}

export function computeRentWiseScore(signals: ScoreSignals): {
  score: ScoreBreakdown;
  details: ScoreComputationDetails;
} {
  const transit = computeTransitScore(signals.subwayConnections);
  const complaints = computeComplaintsScore(signals.complaints);
  const amenities = computeAmenitiesScore(signals.nearbyAmenities);
  const safety = computeSafetyScore(signals.borough, signals.complaints, signals.violations);
  const buildingCondition = computeBuildingConditionScore(signals.complaints, signals.violations);

  const overall = Math.round(
    clamp(
      transit * WEIGHTS.transit +
        complaints * WEIGHTS.complaints +
        amenities * WEIGHTS.amenities +
        safety * WEIGHTS.safety +
        buildingCondition * WEIGHTS.buildingCondition,
    ),
  );

  return {
    score: {
      overall,
      transit,
      complaints,
      amenities,
      safety,
      buildingCondition,
    },
    details: {
      algorithmVersion: ALGORITHM_VERSION,
      weights: WEIGHTS,
      inputs: {
        borough: signals.borough,
        subwayConnectionCount: signals.subwayConnections.length,
        complaintsLast180Days: signals.complaints.length,
        openComplaintsLast180Days: signals.complaints.filter((c) => (c.status ?? "").toLowerCase() !== "closed").length,
        nearbyAmenityCount: signals.nearbyAmenities.length,
        openViolations: signals.violations.filter((v) => v.status.toLowerCase() !== "closed").length,
      },
    },
  };
}

