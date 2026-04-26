import { AmenityType, DataSource, PrismaClient } from "@prisma/client";
import { z } from "zod";

import { haversineMeters, rescoreProperties, toNumber } from "@/server/ingestion/shared/property-matching";
import { getPropertyScore } from "@/server/services/score.service";

const DEFAULT_ENDPOINT = "https://api.mapbox.com/geocoding/v5/mapbox.places";
const DEFAULT_SEARCH_LIMIT = 8;
const DEFAULT_MAX_DISTANCE_METERS = 2500;
const DEFAULT_MAX_LINKS_PER_PROPERTY = 12;

const amenityQueryConfig: Record<AmenityType, { query: string; keywords: string[] }> = {
  [AmenityType.GROCERY]: { query: "grocery store", keywords: ["grocery", "market", "food", "supermarket"] },
  [AmenityType.PHARMACY]: { query: "pharmacy", keywords: ["pharmacy", "drug", "chemist"] },
  [AmenityType.PARK]: { query: "park", keywords: ["park", "playground", "green"] },
  [AmenityType.GYM]: { query: "gym", keywords: ["gym", "fitness", "health club"] },
};

const mapboxFeatureSchema = z.object({
  id: z.string(),
  text: z.string().optional(),
  place_name: z.string().optional(),
  center: z.tuple([z.number(), z.number()]).optional(),
  geometry: z
    .object({
      coordinates: z.tuple([z.number(), z.number()]).optional(),
    })
    .optional(),
  properties: z
    .object({
      category: z.string().optional(),
    })
    .optional(),
});

const mapboxResponseSchema = z.object({
  features: z.array(mapboxFeatureSchema),
});

type MapboxFeature = z.infer<typeof mapboxFeatureSchema>;

type NeighborhoodTarget = {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
};

type AmenityCandidate = {
  externalId: string;
  name: string;
  type: AmenityType;
  latitude: number;
  longitude: number;
  neighborhoodId: string | null;
};

type PropertyCoordinate = {
  id: string;
  latitude: number;
  longitude: number;
};

type PropertyAmenityLink = {
  propertyId: string;
  amenityIndex: number;
  distanceMeters: number;
};

type IngestAmenitiesOptions = {
  endpoint?: string;
  accessToken?: string;
  searchLimit?: number;
  maxDistanceMeters?: number;
  maxLinksPerProperty?: number;
};

export type IngestAmenitiesSummary = {
  queriesRun: number;
  fetched: number;
  normalized: number;
  amenitiesCreated: number;
  propertiesProcessed: number;
  connectionsCreated: number;
  rescored: number;
  rescoreFailed: number;
};

function normalizeAmenityName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function extractCoordinates(feature: MapboxFeature) {
  const center = feature.center ?? feature.geometry?.coordinates;
  if (!center) {
    return null;
  }

  const longitude = toNumber(center[0]);
  const latitude = toNumber(center[1]);

  if (latitude === null || longitude === null) {
    return null;
  }

  return { latitude, longitude };
}

export function mapMapboxFeatureToAmenity(
  feature: MapboxFeature,
  type: AmenityType,
  neighborhoodId: string,
): AmenityCandidate | null {
  const coordinates = extractCoordinates(feature);
  const rawName = feature.text?.trim() || feature.place_name?.split(",")[0]?.trim();

  if (!coordinates || !rawName) {
    return null;
  }

  return {
    externalId: `MAPBOX:${feature.id}`,
    name: normalizeAmenityName(rawName),
    type,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    neighborhoodId,
  };
}

export function mergeAmenities(candidates: AmenityCandidate[]) {
  const merged = new Map<string, AmenityCandidate>();

  for (const candidate of candidates) {
    const existing = merged.get(candidate.externalId);
    if (!existing) {
      merged.set(candidate.externalId, candidate);
      continue;
    }

    if (!existing.neighborhoodId && candidate.neighborhoodId) {
      existing.neighborhoodId = candidate.neighborhoodId;
    }
  }

  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function buildPropertyAmenityLinks(
  properties: PropertyCoordinate[],
  amenities: Array<Pick<AmenityCandidate, "latitude" | "longitude">>,
  maxDistanceMeters = DEFAULT_MAX_DISTANCE_METERS,
  maxLinksPerProperty = DEFAULT_MAX_LINKS_PER_PROPERTY,
): PropertyAmenityLink[] {
  const links: PropertyAmenityLink[] = [];

  properties.forEach((property) => {
    const ranked = amenities
      .map((amenity, amenityIndex) => ({
        amenityIndex,
        distanceMeters: Math.round(
          haversineMeters(property.latitude, property.longitude, amenity.latitude, amenity.longitude),
        ),
      }))
      .filter((item) => item.distanceMeters <= maxDistanceMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, maxLinksPerProperty);

    ranked.forEach((item) => {
      links.push({
        propertyId: property.id,
        amenityIndex: item.amenityIndex,
        distanceMeters: item.distanceMeters,
      });
    });
  });

  return links;
}

async function fetchAmenitiesForNeighborhood(
  neighborhood: NeighborhoodTarget,
  type: AmenityType,
  options: IngestAmenitiesOptions,
): Promise<AmenityCandidate[]> {
  const endpoint = options.endpoint ?? process.env.MAPBOX_GEOCODING_ENDPOINT ?? DEFAULT_ENDPOINT;
  const accessToken = options.accessToken ?? process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const searchLimit = options.searchLimit ?? Number(process.env.AMENITY_SEARCH_LIMIT ?? DEFAULT_SEARCH_LIMIT);

  if (!accessToken) {
    throw new Error("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is required for amenity ingestion");
  }

  const queryText = amenityQueryConfig[type].query;
  const url = new URL(`${endpoint}/${encodeURIComponent(queryText)}.json`);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("autocomplete", "false");
  url.searchParams.set("limit", String(searchLimit));
  url.searchParams.set("proximity", `${neighborhood.centerLng},${neighborhood.centerLat}`);
  url.searchParams.set("types", "poi");

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Amenity search failed (${response.status}) for ${type} in ${neighborhood.name}`);
  }

  const parsed = mapboxResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error(`Amenity response shape invalid for ${type} in ${neighborhood.name}`);
  }

  return parsed.data.features
    .map((feature) => mapMapboxFeatureToAmenity(feature, type, neighborhood.id))
    .filter((amenity): amenity is AmenityCandidate => amenity !== null);
}

export async function ingestAmenities(
  prisma: PrismaClient,
  options: IngestAmenitiesOptions = {},
): Promise<IngestAmenitiesSummary> {
  const neighborhoods = await prisma.neighborhood.findMany({
    select: {
      id: true,
      name: true,
      centerLat: true,
      centerLng: true,
    },
  });

  const neighborhoodTargets: NeighborhoodTarget[] = neighborhoods.map((neighborhood) => ({
    id: neighborhood.id,
    name: neighborhood.name,
    centerLat: Number(neighborhood.centerLat),
    centerLng: Number(neighborhood.centerLng),
  }));

  const fetchedCandidates: AmenityCandidate[] = [];
  let queriesRun = 0;

  for (const neighborhood of neighborhoodTargets) {
    for (const type of Object.values(AmenityType)) {
      queriesRun += 1;
      fetchedCandidates.push(...(await fetchAmenitiesForNeighborhood(neighborhood, type, options)));
    }
  }

  const mergedAmenities = mergeAmenities(fetchedCandidates);
  if (mergedAmenities.length === 0) {
    throw new Error("Amenity ingestion yielded zero valid places; existing amenity data was left untouched.");
  }

  const properties = await prisma.property.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      latitude: true,
      longitude: true,
    },
  });

  const propertyCoordinates: PropertyCoordinate[] = properties.map((property) => ({
    id: property.id,
    latitude: Number(property.latitude),
    longitude: Number(property.longitude),
  }));

  const createdAmenities = await prisma.$transaction(async (tx) => {
    await tx.propertyAmenity.deleteMany();
    await tx.amenity.deleteMany({
      where: {
        source: {
          in: [DataSource.MAPBOX, DataSource.MOCK],
        },
      },
    });

    return Promise.all(
      mergedAmenities.map((amenity) =>
        tx.amenity.create({
          data: {
            externalId: amenity.externalId,
            name: amenity.name,
            type: amenity.type,
            latitude: amenity.latitude,
            longitude: amenity.longitude,
            neighborhoodId: amenity.neighborhoodId,
            source: DataSource.MAPBOX,
          },
          select: { id: true, latitude: true, longitude: true },
        }),
      ),
    );
  });

  const amenityLinks = buildPropertyAmenityLinks(
    propertyCoordinates,
    createdAmenities.map((amenity) => ({
      latitude: Number(amenity.latitude),
      longitude: Number(amenity.longitude),
    })),
    options.maxDistanceMeters ?? Number(process.env.AMENITY_MAX_DISTANCE_METERS ?? DEFAULT_MAX_DISTANCE_METERS),
    options.maxLinksPerProperty ?? Number(process.env.AMENITY_MAX_LINKS_PER_PROPERTY ?? DEFAULT_MAX_LINKS_PER_PROPERTY),
  );

  if (amenityLinks.length > 0) {
    await prisma.propertyAmenity.createMany({
      data: amenityLinks.map((link) => ({
        propertyId: link.propertyId,
        amenityId: createdAmenities[link.amenityIndex].id,
        distanceMeters: link.distanceMeters,
      })),
    });
  }

  const { rescored, rescoreFailed } = await rescoreProperties(
    propertyCoordinates.map((property) => property.id),
    (propertyId) => getPropertyScore(propertyId, true),
  );

  return {
    queriesRun,
    fetched: fetchedCandidates.length,
    normalized: mergedAmenities.length,
    amenitiesCreated: createdAmenities.length,
    propertiesProcessed: propertyCoordinates.length,
    connectionsCreated: amenityLinks.length,
    rescored,
    rescoreFailed,
  };
}

