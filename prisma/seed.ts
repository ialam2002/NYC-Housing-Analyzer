import {
  AmenityType,
  Borough,
  ComplaintCategory,
  PrismaClient,
  ViolationSeverity,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.favorite.deleteMany();
  await prisma.rentWiseScore.deleteMany();
  await prisma.propertyAmenity.deleteMany();
  await prisma.propertySubwayConnection.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.buildingViolation.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.subwayStation.deleteMany();
  await prisma.property.deleteMany();
  await prisma.neighborhood.deleteMany();

  const neighborhoods = await prisma.$transaction([
    prisma.neighborhood.create({
      data: {
        name: "Upper West Side",
        slug: "upper-west-side",
        borough: Borough.MANHATTAN,
        centerLat: 40.787011,
        centerLng: -73.975368,
      },
    }),
    prisma.neighborhood.create({
      data: {
        name: "Long Island City",
        slug: "long-island-city",
        borough: Borough.QUEENS,
        centerLat: 40.744679,
        centerLng: -73.948542,
      },
    }),
    prisma.neighborhood.create({
      data: {
        name: "Park Slope",
        slug: "park-slope",
        borough: Borough.BROOKLYN,
        centerLat: 40.672689,
        centerLng: -73.977996,
      },
    }),
  ]);

  const [uws, lic, parkSlope] = neighborhoods;

  const properties = await prisma.$transaction([
    prisma.property.create({
      data: {
        title: "Sunny 1BR near Riverside",
        addressLine1: "245 W 94th St",
        postalCode: "10025",
        borough: Borough.MANHATTAN,
        latitude: 40.791648,
        longitude: -73.972122,
        rent: 3650,
        bedrooms: 1,
        bathrooms: 1,
        squareFeet: 640,
        buildingName: "Riverside Court",
        yearBuilt: 1931,
        neighborhoodId: uws.id,
      },
    }),
    prisma.property.create({
      data: {
        title: "Modern LIC Studio",
        addressLine1: "27-18 Jackson Ave",
        postalCode: "11101",
        borough: Borough.QUEENS,
        latitude: 40.74524,
        longitude: -73.947831,
        rent: 3200,
        bedrooms: 0,
        bathrooms: 1,
        squareFeet: 520,
        buildingName: "Jackson Point",
        yearBuilt: 2019,
        neighborhoodId: lic.id,
      },
    }),
    prisma.property.create({
      data: {
        title: "Park Slope 2BR Walk-Up",
        addressLine1: "350 7th Ave",
        postalCode: "11215",
        borough: Borough.BROOKLYN,
        latitude: 40.666935,
        longitude: -73.981904,
        rent: 4100,
        bedrooms: 2,
        bathrooms: 1,
        squareFeet: 820,
        buildingName: "Prospect Walk-Up",
        yearBuilt: 1910,
        neighborhoodId: parkSlope.id,
      },
    }),
  ]);

  const [p1, p2, p3] = properties;

  const stations = await prisma.$transaction([
    prisma.subwayStation.create({
      data: {
        name: "96 St",
        lines: ["1", "2", "3"],
        latitude: 40.793919,
        longitude: -73.972323,
        borough: Borough.MANHATTAN,
      },
    }),
    prisma.subwayStation.create({
      data: {
        name: "Court Sq",
        lines: ["E", "G", "M", "7"],
        latitude: 40.747846,
        longitude: -73.946,
        borough: Borough.QUEENS,
      },
    }),
    prisma.subwayStation.create({
      data: {
        name: "7 Av",
        lines: ["F", "G"],
        latitude: 40.666153,
        longitude: -73.980487,
        borough: Borough.BROOKLYN,
      },
    }),
  ]);

  await prisma.propertySubwayConnection.createMany({
    data: [
      { propertyId: p1.id, stationId: stations[0].id, distanceMeters: 280, walkingMinutes: 4 },
      { propertyId: p2.id, stationId: stations[1].id, distanceMeters: 190, walkingMinutes: 3 },
      { propertyId: p3.id, stationId: stations[2].id, distanceMeters: 350, walkingMinutes: 5 },
    ],
  });

  const amenities = await prisma.$transaction([
    prisma.amenity.create({
      data: {
        name: "Trader Joe's",
        type: AmenityType.GROCERY,
        latitude: 40.79027,
        longitude: -73.975155,
        neighborhoodId: uws.id,
      },
    }),
    prisma.amenity.create({
      data: {
        name: "CVS Pharmacy",
        type: AmenityType.PHARMACY,
        latitude: 40.744096,
        longitude: -73.949267,
        neighborhoodId: lic.id,
      },
    }),
    prisma.amenity.create({
      data: {
        name: "Prospect Park",
        type: AmenityType.PARK,
        latitude: 40.660204,
        longitude: -73.968956,
        neighborhoodId: parkSlope.id,
      },
    }),
    prisma.amenity.create({
      data: {
        name: "Blink Fitness",
        type: AmenityType.GYM,
        latitude: 40.66756,
        longitude: -73.979891,
        neighborhoodId: parkSlope.id,
      },
    }),
  ]);

  await prisma.propertyAmenity.createMany({
    data: [
      { propertyId: p1.id, amenityId: amenities[0].id, distanceMeters: 460 },
      { propertyId: p2.id, amenityId: amenities[1].id, distanceMeters: 240 },
      { propertyId: p3.id, amenityId: amenities[2].id, distanceMeters: 870 },
      { propertyId: p3.id, amenityId: amenities[3].id, distanceMeters: 390 },
    ],
  });

  await prisma.complaint.createMany({
    data: [
      {
        propertyId: p1.id,
        category: ComplaintCategory.NOISE,
        subcategory: "Loud Music/Party",
        reportedAt: new Date("2026-02-13T14:00:00Z"),
        status: "Open",
      },
      {
        propertyId: p1.id,
        category: ComplaintCategory.HEAT_HOT_WATER,
        subcategory: "No Hot Water",
        reportedAt: new Date("2026-01-08T11:20:00Z"),
        status: "Closed",
      },
      {
        propertyId: p2.id,
        category: ComplaintCategory.RODENTS,
        subcategory: "Mice",
        reportedAt: new Date("2026-03-05T08:50:00Z"),
        status: "Open",
      },
      {
        propertyId: p3.id,
        category: ComplaintCategory.SANITATION,
        subcategory: "Overflowing Litter Basket",
        reportedAt: new Date("2026-02-20T16:45:00Z"),
        status: "In Progress",
      },
    ],
  });

  await prisma.buildingViolation.createMany({
    data: [
      {
        propertyId: p1.id,
        agency: "HPD",
        code: "HMC-27-2005",
        description: "Repair defective plastered surfaces and paint in public hallway.",
        severity: ViolationSeverity.MEDIUM,
        status: "Open",
        issuedAt: new Date("2026-01-12T00:00:00Z"),
      },
      {
        propertyId: p2.id,
        agency: "DOB",
        code: "DOB-1210",
        description: "Failure to maintain elevator maintenance log.",
        severity: ViolationSeverity.LOW,
        status: "Open",
        issuedAt: new Date("2026-03-01T00:00:00Z"),
      },
      {
        propertyId: p3.id,
        agency: "HPD",
        code: "HMC-27-2013",
        description: "Rodent proofing required in basement storage.",
        severity: ViolationSeverity.HIGH,
        status: "Open",
        issuedAt: new Date("2026-02-02T00:00:00Z"),
      },
    ],
  });

  await prisma.rentWiseScore.createMany({
    data: [
      {
        propertyId: p1.id,
        overall: 81,
        transit: 87,
        complaints: 73,
        amenities: 88,
        safety: 78,
        buildingCondition: 79,
      },
      {
        propertyId: p2.id,
        overall: 84,
        transit: 91,
        complaints: 76,
        amenities: 83,
        safety: 81,
        buildingCondition: 85,
      },
      {
        propertyId: p3.id,
        overall: 74,
        transit: 78,
        complaints: 62,
        amenities: 80,
        safety: 75,
        buildingCondition: 68,
      },
    ],
  });

  console.log("Seed complete: neighborhoods, properties, transit, amenities, complaints, violations, scores");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

