import { Borough, ViolationSeverity } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { mapHpdViolationRow, mapViolationSeverity, normalizeViolationStatus } from "@/server/ingestion/hpd/violations";

describe("hpd violation helpers", () => {
  it("maps HPD classes into RentWise severity bands", () => {
    expect(mapViolationSeverity("C", "immediately hazardous condition")).toBe(ViolationSeverity.CRITICAL);
    expect(mapViolationSeverity("B", "hazardous condition")).toBe(ViolationSeverity.HIGH);
    expect(mapViolationSeverity("A", "non hazardous condition")).toBe(ViolationSeverity.MEDIUM);
  });

  it("normalizes violation statuses into open and closed labels", () => {
    expect(normalizeViolationStatus("Violation Closed")).toBe("Closed");
    expect(normalizeViolationStatus("Open")).toBe("Open");
    expect(normalizeViolationStatus("Corrected")).toBe("Closed");
  });

  it("maps a representative HPD row into an ingestible violation record", () => {
    const violation = mapHpdViolationRow({
      violationid: "10001",
      borough: "BROOKLYN",
      housenumber: "123",
      streetname: "Flatbush Ave",
      zipcode: "11217",
      novissueddate: "2026-04-10T12:00:00.000Z",
      currentstatusdate: "2026-04-12T12:00:00.000Z",
      currentstatus: "Violation Closed",
      novtype: "Lack of adequate heat",
      class: "C",
      latitude: "40.6805",
      longitude: "-73.9750",
    });

    expect(violation).not.toBeNull();
    expect(violation).toMatchObject({
      externalId: "10001",
      borough: Borough.BROOKLYN,
      incidentAddress: "123 Flatbush Ave",
      incidentZip: "11217",
      agency: "HPD",
      code: "C",
      description: "Lack of adequate heat",
      severity: ViolationSeverity.CRITICAL,
      status: "Closed",
    });
    expect(violation?.issuedAt.toISOString()).toBe("2026-04-10T12:00:00.000Z");
    expect(violation?.resolvedAt?.toISOString()).toBe("2026-04-12T12:00:00.000Z");
  });
});

