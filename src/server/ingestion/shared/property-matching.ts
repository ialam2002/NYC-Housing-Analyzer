import type { Borough } from "@prisma/client";

export const DEFAULT_MATCH_RADIUS_METERS = 650;

export type RescoreProperty = (propertyId: string) => Promise<unknown>;

export type PropertyMatchCandidate = {
  id: string;
  borough: Borough;
  postalCode: string;
  normalizedAddress: string;
  latitude: number;
  longitude: number;
};

export type PropertyMatchInput = {
  borough: Borough;
  incidentAddress: string | null;
  incidentZip: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function normalizeAddress(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

export function buildPropertyMatchCandidates(
  properties: Array<{
    id: string;
    borough: Borough;
    postalCode: string;
    addressLine1: string;
    latitude: number | string | { toString(): string };
    longitude: number | string | { toString(): string };
  }>,
): PropertyMatchCandidate[] {
  return properties.map((property) => ({
    id: property.id,
    borough: property.borough,
    postalCode: property.postalCode,
    normalizedAddress: normalizeAddress(property.addressLine1),
    latitude: Number(property.latitude),
    longitude: Number(property.longitude),
  }));
}

export function findBestPropertyMatch(
  input: PropertyMatchInput,
  candidates: PropertyMatchCandidate[],
  matchRadiusMeters = DEFAULT_MATCH_RADIUS_METERS,
): PropertyMatchCandidate | null {
  const boroughCandidates = candidates.filter((property) => property.borough === input.borough);
  if (boroughCandidates.length === 0) {
    return null;
  }

  if (input.incidentAddress && input.incidentZip) {
    const normalizedAddress = normalizeAddress(input.incidentAddress);
    const exactAddressMatch = boroughCandidates.find(
      (property) => property.postalCode === input.incidentZip && property.normalizedAddress === normalizedAddress,
    );

    if (exactAddressMatch) {
      return exactAddressMatch;
    }
  }

  if (input.latitude === null || input.longitude === null) {
    return null;
  }

  let nearest: { property: PropertyMatchCandidate; distance: number } | null = null;

  for (const property of boroughCandidates) {
    const distance = haversineMeters(input.latitude, input.longitude, property.latitude, property.longitude);
    if (!nearest || distance < nearest.distance) {
      nearest = { property, distance };
    }
  }

  if (!nearest || nearest.distance > matchRadiusMeters) {
    return null;
  }

  return nearest.property;
}

export async function rescoreProperties(
  propertyIds: Iterable<string>,
  rescoreProperty: RescoreProperty,
): Promise<{ rescored: number; rescoreFailed: number }> {
  let rescored = 0;
  let rescoreFailed = 0;

  for (const propertyId of new Set(propertyIds)) {
    try {
      const result = await rescoreProperty(propertyId);
      if (result) {
        rescored += 1;
      } else {
        rescoreFailed += 1;
      }
    } catch {
      rescoreFailed += 1;
    }
  }

  return { rescored, rescoreFailed };
}
