import { Borough } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { buildPropertyTransitConnections, inferBorough, mapMtaStationRow, mergeStations } from "@/server/ingestion/mta/stations";

describe("mta station helpers", () => {
  it("infers borough from explicit feed values or fallback coordinates", () => {
    expect(inferBorough("BK", 40.68, -73.98)).toBe(Borough.BROOKLYN);
    expect(inferBorough(undefined, 40.7478, -73.946)).toBe(Borough.QUEENS);
  });

  it("maps and merges representative MTA station rows", () => {
    const first = mapMtaStationRow({
      stop_id: "635",
      stop_name: "Court Sq",
      daytimet_routes: "E G",
      gtfs_latitude: "40.747846",
      gtfs_longitude: "-73.946000",
      borough: "Queens",
    });
    const second = mapMtaStationRow({
      stop_id: "635",
      stop_name: "Court Sq",
      routes: "7,M",
      gtfs_latitude: "40.747846",
      gtfs_longitude: "-73.946000",
      borough: "QN",
    });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();

    const merged = mergeStations([first!, second!]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      name: "Court Sq",
      borough: Borough.QUEENS,
    });
    expect(merged[0].lines).toEqual(["7", "E", "G", "M"]);
  });

  it("builds nearest station links with walking times", () => {
    const connections = buildPropertyTransitConnections(
      [{ id: "property-1", latitude: 40.74524, longitude: -73.947831 }],
      [
        { latitude: 40.747846, longitude: -73.946 },
        { latitude: 40.793919, longitude: -73.972323 },
      ],
      2,
      3000,
    );

    expect(connections).toHaveLength(1);
    expect(connections[0]).toMatchObject({
      propertyId: "property-1",
      stationIndex: 0,
    });
    expect(connections[0].distanceMeters).toBeGreaterThan(0);
    expect(connections[0].walkingMinutes).toBeGreaterThanOrEqual(1);
  });
});

