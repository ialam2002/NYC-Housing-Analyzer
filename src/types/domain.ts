export type ScoreBreakdown = {
  overall: number;
  transit: number;
  complaints: number;
  amenities: number;
  safety: number;
  buildingCondition: number;
};

export type ComplaintTrendPoint = {
  month: string;
  noise: number;
  heatHotWater: number;
  rodents: number;
  sanitation: number;
};

export type NearbyAmenity = {
  id: string;
  name: string;
  type: "GROCERY" | "PHARMACY" | "PARK" | "GYM";
  distanceMeters: number;
};

export type PropertyListItem = {
  id: string;
  title: string;
  addressLine1: string;
  borough: string;
  postalCode: string;
  rent: number;
  bedrooms: number | null;
  bathrooms: number | null;
  score: number | null;
};

