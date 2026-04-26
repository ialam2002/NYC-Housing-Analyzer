import { Borough, DataSource, PrismaClient } from "@prisma/client";
import { z } from "zod";

import { haversineMeters, rescoreProperties, toNumber } from "@/server/ingestion/shared/property-matching";
import { getPropertyScore } from "@/server/services/score.service";

const DEFAULT_ENDPOINT = "https://data.ny.gov/resource/39hk-dx4f.json";
const DEFAULT_LIMIT = 1000;
const DEFAULT_MAX_STATIONS_PER_PROPERTY = 6;
const DEFAULT_MAX_DISTANCE_METERS = 2000;
const WALKING_METERS_PER_MINUTE = 80;

const boroughMap: Record<string, Borough | undefined> = {
  MANHATTAN: Borough.MANHATTAN,
  MN: Borough.MANHATTAN,
  M: Borough.MANHATTAN,
  "NEW YORK": Borough.MANHATTAN,
  BROOKLYN: Borough.BROOKLYN,
  BK: Borough.BROOKLYN,
  KINGS: Borough.BROOKLYN,
  B: Borough.BROOKLYN,
  QUEENS: Borough.QUEENS,
  QN: Borough.QUEENS,
  Q: Borough.QUEENS,
  BRONX: Borough.BRONX,
  BX: Borough.BRONX,
  X: Borough.BRONX,
  "STATEN ISLAND": Borough.STATEN_ISLAND,
  SI: Borough.STATEN_ISLAND,
  S: Borough.STATEN_ISLAND,
  RICHMOND: Borough.STATEN_ISLAND,
};

const boroughCenters: Record<Borough, { latitude: number; longitude: number }> = {
  [Borough.MANHATTAN]: { latitude: 40.7831, longitude: -73.9712 },
  [Borough.BROOKLYN]: { latitude: 40.6782, longitude: -73.9442 },
  [Borough.QUEENS]: { latitude: 40.7282, longitude: -73.7949 },
  [Borough.BRONX]: { latitude: 40.8448, longitude: -73.8648 },
  [Borough.STATEN_ISLAND]: { latitude: 40.5795, longitude: -74.1502 },
};

const mtaStationRowSchema = z.object({
  station_id: z.union([z.string(), z.number()]).optional(),
  stop_id: z.union([z.string(), z.number()]).optional(),
  gtfs_stop_id: z.union([z.string(), z.number()]).optional(),
  complex_id: z.union([z.string(), z.number()]).optional(),
  stop_name: z.string().optional(),
  station_name: z.string().optional(),
  name: z.string().optional(),
  daytimet_routes: z.string().optional(),
  daytime_routes: z.string().optional(),
  routes: z.string().optional(),
  route_1: z.string().optional(),
  route_2: z.string().optional(),
  route_3: z.string().optional(),
  route_4: z.string().optional(),
  route_5: z.string().optional(),
  route_6: z.string().optional(),
  route_7: z.string().optional(),
  route_8: z.string().optional(),
  route_9: z.string().optional(),
  route_10: z.string().optional(),
  route_11: z.string().optional(),
  gtfs_latitude: z.union([z.string(), z.number()]).optional(),
  stop_lat: z.union([z.string(), z.number()]).optional(),
  latitude: z.union([z.string(), z.number()]).optional(),
  gtfs_longitude: z.union([z.string(), z.number()]).optional(),
  stop_lon: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
  borough: z.string().optional(),
  boro: z.string().optional(),
  division: z.string().optional(),
});

type MtaStationRow = z.infer<typeof mtaStationRowSchema>;

type MtaStation = {
  stationKey: string;
  name: string;
  lines: string[];
  latitude: number;
  longitude: number;
  borough: Borough;
};

type PropertyCoordinate = {
  id: string;
  latitude: number;
  longitude: number;
};

type PropertyStationConnection = {
  propertyId: string;
  stationIndex: number;
  distanceMeters: number;
  walkingMinutes: number;
};

type IngestMtaTransitOptions = {
  endpoint?: string;
  appToken?: string;
  limit?: number;
  maxStationsPerProperty?: number;
  maxDistanceMeters?: number;
};

export type IngestMtaTransitSummary = {
  fetched: number;
  normalized: number;
  stationsCreated: number;
  propertiesProcessed: number;
  connectionsCreated: number;
  rescored: number;
  rescoreFailed: number;
};

function toStringValue(value: string | number | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeStationName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function parseRoutes(row: MtaStationRow) {
  const candidates = [
    row.daytimet_routes,
    row.daytime_routes,
    row.routes,
    row.route_1,
    row.route_2,
    row.route_3,
    row.route_4,
    row.route_5,
    row.route_6,
    row.route_7,
    row.route_8,
    row.route_9,
    row.route_10,
    row.route_11,
  ].filter((value): value is string => Boolean(value && value.trim()));

  const routes = new Set<string>();

  for (const candidate of candidates) {
    const normalized = candidate.trim();

    if (normalized.includes(",") || normalized.includes(" ")) {
      for (const part of normalized.split(/[\s,\/]+/)) {
        const route = part.trim().toUpperCase();
        if (route) {
          routes.add(route);
        }
      }
      continue;
    }

    if (/^[A-Za-z0-9]+$/.test(normalized) && normalized.length > 2) {
      for (const char of normalized.toUpperCase().split("")) {
        routes.add(char);
      }
      continue;
    }

    routes.add(normalized.toUpperCase());
  }

  return [...routes].sort((a, b) => a.localeCompare(b));
}

export function inferBorough(value: string | undefined, latitude: number, longitude: number): Borough | null {
  const normalized = value?.toUpperCase().trim().replace(/\s+/g, " ");
  if (normalized && boroughMap[normalized]) {
    return boroughMap[normalized] ?? null;
  }

  if (latitude >= 40.72 && latitude <= 40.80 && longitude >= -73.96 && longitude <= -73.70) {
    return Borough.QUEENS;
  }

  if (latitude >= 40.80 && latitude <= 40.92 && longitude >= -73.94 && longitude <= -73.76) {
    return Borough.BRONX;
  }

  let nearest: { borough: Borough; distance: number } | null = null;

  for (const [borough, center] of Object.entries(boroughCenters) as Array<[
    Borough,
    { latitude: number; longitude: number },
  ]>) {
    const distance = haversineMeters(latitude, longitude, center.latitude, center.longitude);
    if (!nearest || distance < nearest.distance) {
      nearest = { borough, distance };
    }
  }

  return nearest?.borough ?? null;
}

export function mapMtaStationRow(row: MtaStationRow): MtaStation | null {
  const rawId =
    toStringValue(row.station_id) ??
    toStringValue(row.stop_id) ??
    toStringValue(row.gtfs_stop_id) ??
    toStringValue(row.complex_id);
  const rawName = row.stop_name?.trim() || row.station_name?.trim() || row.name?.trim();
  const latitude = toNumber(row.gtfs_latitude ?? row.stop_lat ?? row.latitude);
  const longitude = toNumber(row.gtfs_longitude ?? row.stop_lon ?? row.longitude);

  if (!rawId || !rawName || latitude === null || longitude === null) {
    return null;
  }

  const borough = inferBorough(row.borough ?? row.boro ?? row.division, latitude, longitude);
  if (!borough) {
    return null;
  }

  const name = normalizeStationName(rawName);
  const lines = parseRoutes(row);
  const roundedLat = latitude.toFixed(5);
  const roundedLng = longitude.toFixed(5);

  return {
    stationKey: `${borough}:${rawId}:${roundedLat}:${roundedLng}`,
    name,
    lines,
    latitude,
    longitude,
    borough,
  };
}

export function mergeStations(stations: MtaStation[]) {
  const merged = new Map<string, MtaStation>();

  for (const station of stations) {
    const existing = merged.get(station.stationKey);
    if (!existing) {
      merged.set(station.stationKey, station);
      continue;
    }

    existing.lines = [...new Set([...existing.lines, ...station.lines])].sort((a, b) => a.localeCompare(b));
  }

  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function buildPropertyTransitConnections(
  properties: PropertyCoordinate[],
  stations: Array<Pick<MtaStation, "latitude" | "longitude">>,
  maxStationsPerProperty = DEFAULT_MAX_STATIONS_PER_PROPERTY,
  maxDistanceMeters = DEFAULT_MAX_DISTANCE_METERS,
): PropertyStationConnection[] {
  const connections: PropertyStationConnection[] = [];

  properties.forEach((property) => {
    const ranked = stations
      .map((station, stationIndex) => ({
        stationIndex,
        distanceMeters: Math.round(
          haversineMeters(property.latitude, property.longitude, station.latitude, station.longitude),
        ),
      }))
      .filter((item) => item.distanceMeters <= maxDistanceMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, maxStationsPerProperty);

    for (const item of ranked) {
      connections.push({
        propertyId: property.id,
        stationIndex: item.stationIndex,
        distanceMeters: item.distanceMeters,
        walkingMinutes: Math.max(1, Math.round(item.distanceMeters / WALKING_METERS_PER_MINUTE)),
      });
    }
  });

  return connections;
}

async function fetchStations(options: IngestMtaTransitOptions): Promise<MtaStation[]> {
  const endpoint = options.endpoint ?? process.env.MTA_STATIONS_ENDPOINT ?? DEFAULT_ENDPOINT;
  const limit = options.limit ?? Number(process.env.MTA_STATIONS_LIMIT ?? DEFAULT_LIMIT);
  const query = new URLSearchParams({
    $limit: String(limit),
  });

  const response = await fetch(`${endpoint}?${query.toString()}`, {
    headers: {
      ...(options.appToken ? { "X-App-Token": options.appToken } : {}),
      ...(process.env.NYC_OPEN_DATA_APP_TOKEN ? { "X-App-Token": process.env.NYC_OPEN_DATA_APP_TOKEN } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`MTA stations request failed (${response.status})`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    throw new Error("MTA stations response payload is not an array");
  }

  return payload
    .map((row) => mtaStationRowSchema.safeParse(row))
    .filter((result): result is { success: true; data: MtaStationRow } => result.success)
    .map((result) => mapMtaStationRow(result.data))
    .filter((station): station is MtaStation => station !== null);
}

export async function ingestMtaTransit(
  prisma: PrismaClient,
  options: IngestMtaTransitOptions = {},
): Promise<IngestMtaTransitSummary> {
  const fetchedStations = await fetchStations(options);
  const normalizedStations = mergeStations(fetchedStations);

  if (normalizedStations.length === 0) {
    throw new Error("MTA ingestion yielded zero valid stations; existing transit data was left untouched.");
  }

  const properties = await prisma.property.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      latitude: true,
      longitude: true,
    },
  });

  const propertyCoordinates = properties.map((property) => ({
    id: property.id,
    latitude: Number(property.latitude),
    longitude: Number(property.longitude),
  }));

  const rawConnections = buildPropertyTransitConnections(
    propertyCoordinates,
    normalizedStations,
    options.maxStationsPerProperty ?? Number(process.env.MTA_MAX_STATIONS_PER_PROPERTY ?? DEFAULT_MAX_STATIONS_PER_PROPERTY),
    options.maxDistanceMeters ?? Number(process.env.MTA_MAX_DISTANCE_METERS ?? DEFAULT_MAX_DISTANCE_METERS),
  );

  const createdStations = await prisma.$transaction(async (tx) => {
    await tx.propertySubwayConnection.deleteMany();
    await tx.subwayStation.deleteMany();

    return Promise.all(
      normalizedStations.map((station) =>
        tx.subwayStation.create({
          data: {
            name: station.name,
            lines: station.lines,
            latitude: station.latitude,
            longitude: station.longitude,
            borough: station.borough,
            source: DataSource.MTA,
          },
          select: { id: true },
        }),
      ),
    );
  });

  if (rawConnections.length > 0) {
    await prisma.propertySubwayConnection.createMany({
      data: rawConnections.map((connection) => ({
        propertyId: connection.propertyId,
        stationId: createdStations[connection.stationIndex].id,
        distanceMeters: connection.distanceMeters,
        walkingMinutes: connection.walkingMinutes,
      })),
    });
  }

  const { rescored, rescoreFailed } = await rescoreProperties(
    propertyCoordinates.map((property) => property.id),
    (propertyId) => getPropertyScore(propertyId, true),
  );

  return {
    fetched: fetchedStations.length,
    normalized: normalizedStations.length,
    stationsCreated: createdStations.length,
    propertiesProcessed: propertyCoordinates.length,
    connectionsCreated: rawConnections.length,
    rescored,
    rescoreFailed,
  };
}

