import type { Borough } from "@prisma/client";

import type { ScoreBreakdown } from "@/types/domain";

export type ScoreComputationInputs = {
  borough: Borough;
  subwayConnectionCount: number;
  complaintsLast180Days: number;
  openComplaintsLast180Days: number;
  nearbyAmenityCount: number;
  openViolations: number;
};

export type ScoreComputationDetails = {
  algorithmVersion: string;
  weights: {
    transit: number;
    complaints: number;
    amenities: number;
    safety: number;
    buildingCondition: number;
  };
  inputs: ScoreComputationInputs;
};

export type PropertyScoreResponseData = {
  propertyId: string;
  score: ScoreBreakdown;
  previousOverall: number | null;
  details: ScoreComputationDetails;
};

