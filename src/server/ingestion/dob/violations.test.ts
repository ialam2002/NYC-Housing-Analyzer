import { Borough, ViolationSeverity } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { mapDobSeverity, mapDobViolationRow, normalizeDobStatus } from "@/server/ingestion/dob/violations";

describe("dob violation helpers", () => {
  it("maps DOB severity inputs into RentWise severity bands", () => {
    expect(mapDobSeverity("critical", undefined, "unsafe facade")).toBe(ViolationSeverity.CRITICAL);
    expect(mapDobSeverity(undefined, "high", "hazardous work without permit")).toBe(ViolationSeverity.HIGH);
    expect(mapDobSeverity("low", undefined, "minor paperwork issue")).toBe(ViolationSeverity.LOW);
    expect(mapDobSeverity(undefined, undefined, "general complaint")).toBe(ViolationSeverity.MEDIUM);
  });

  it("normalizes DOB status values into open and closed labels", () => {
    expect(normalizeDobStatus("Open", undefined)).toBe("Open");
    expect(normalizeDobStatus("Resolved", undefined)).toBe("Closed");
    expect(normalizeDobStatus(undefined, "Complaint Dismissed")).toBe("Closed");
  });

  it("maps a representative DOB row into an ingestible building issue", () => {
    const violation = mapDobViolationRow({
      complaint_number: "DOB-9001",
      borough: "MANHATTAN",
      house_number: "200",
      street_name: "Broadway",
      zipcode: "10007",
      category: "Unsafe facade complaint",
      status: "Open",
      priority: "High",
      date_entered: "2026-04-18T12:00:00.000Z",
      latitude: "40.7127",
      longitude: "-74.0060",
    });

    expect(violation).not.toBeNull();
    expect(violation).toMatchObject({
      externalId: "DOB:DOB-9001",
      borough: Borough.MANHATTAN,
      incidentAddress: "200 Broadway",
      incidentZip: "10007",
      agency: "DOB",
      code: "High",
      description: "Unsafe facade complaint",
      severity: ViolationSeverity.CRITICAL,
      status: "Open",
    });
    expect(violation?.issuedAt.toISOString()).toBe("2026-04-18T12:00:00.000Z");
  });
});

