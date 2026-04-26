import type { AmenityType, Borough, ComplaintCategory, ViolationSeverity } from "@prisma/client";

import type { ScoreBreakdown } from "@/types/domain";

export type PropertyDashboardCore = {
  id: string;
  title: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  borough: Borough;
  neighborhood: string;
  latitude: number;
  longitude: number;
  rent: number;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  buildingName: string | null;
  yearBuilt: number | null;
};

export type TransitStationSummary = {
  stationId: string;
  name: string;
  lines: string[];
  latitude: number;
  longitude: number;
  distanceMeters: number;
  walkingMinutes: number;
};

export type TransitSummary = {
  nearestStations: TransitStationSummary[];
  avgWalkingMinutes: number | null;
  bestWalkingMinutes: number | null;
};

export type ComplaintTrendPoint = {
  month: string;
  noise: number;
  heatHotWater: number;
  rodents: number;
  sanitation: number;
};

export type ComplaintsSummary = {
  total: number;
  open: number;
  byCategory: Record<ComplaintCategory, number>;
  trends: ComplaintTrendPoint[];
};

export type ViolationItem = {
  id: string;
  agency: string;
  code: string | null;
  description: string;
  severity: ViolationSeverity;
  status: string;
  issuedAt: string;
  resolvedAt: string | null;
};

export type ViolationsSummary = {
  total: number;
  open: number;
  bySeverity: Record<ViolationSeverity, number>;
  recent: ViolationItem[];
};

export type AmenityItem = {
  id: string;
  name: string;
  type: AmenityType;
  distanceMeters: number;
};

export type AmenitiesSummary = {
  byType: Record<AmenityType, number>;
  nearest: AmenityItem[];
};

export type PropertyDashboardResponseData = {
  property: PropertyDashboardCore;
  scoreBreakdown: ScoreBreakdown | null;
  transit: TransitSummary;
  complaints: ComplaintsSummary;
  violations: ViolationsSummary;
  amenities: AmenitiesSummary;
};

